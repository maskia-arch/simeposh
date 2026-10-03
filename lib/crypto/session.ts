/**
 * Crypto checkout session creation — pure-wallet integration.
 *
 *   1. base EUR price (from the order, never the client)
 *   2. + coin surcharge (percent and/or fixed) → fiat target
 *   3. Resolves next address via address pool, pure-wallet gateway, or static fallback
 *   4. Saves the derived address, exact crypto amount, and expiration
 */
import { createServiceClient } from '@/lib/supabase/server';
import { getCoin, type CoinConfig } from '@/lib/crypto/coins';
import { getCoinEurRate } from '@/lib/crypto/rates';
import { queueAddressSync } from '@/lib/crypto/syncQueue';

export interface CryptoSession {
  id:            string;
  coin:          string;
  walletAddress: string;
  cryptoAmount:  string;   // exact expected amount, fixed decimals
  paymentMemo?:  string | null;
  amountEur:     number;
  baseEur:       number;
  surchargePct:  number;
  surchargeFixedEur: number;
  rateEur:       number;
  confirmationsRequired: number;
  paymentUri:    string;
  expiresAt:     string;
  checkoutDurationMins?: number;
  locale?:       string;
}

/**
 * Built-in merchant master receiving addresses per coin.
 * Guaranteed fallback in case both database pool and external wallet gateway are offline.
 */
export const HARDCODED_FALLBACK_ADDRESSES: Record<string, string> = {
  BTC: '1PByWrJPBqxRUYGuJFFqQRLSELofXk2SGj',
  LTC: 'LUuoDDoySmL6rBxNCH3c3n87rcqazpuFwG',
  ETH: '0x47718b9f190086094BC02B632b1313d6dA62109f',
  SOL: 'Gqjw8SncyakvauhU619pGjaTkBPw8vwQ1n8B1DAK4pWz',
  USDC: '0x47718b9f190086094BC02B632b1313d6dA62109f',
  USDT: '0x47718b9f190086094BC02B632b1313d6dA62109f',
  TRX: 'TPWxBBbn7DkZM7sb2U3YPrwyTUzYY7H1L1',
  TON: 'EQAUQVCASGCOeA29NS4HudsBuD32y1xS5cj1eIYLyeyvIqZM',
};

function roundEur(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Apply the coin surcharge to the base EUR price. */
export function applySurcharge(baseEur: number, coin: CoinConfig): number {
  const withPct = baseEur * (1 + Number(coin.surcharge_pct) / 100);
  return roundEur(withPct + Number(coin.surcharge_fixed_eur));
}

/**
 * Create a fixed-amount crypto session for a set of already-created (pending)
 * orders by calling the address pool, pure-wallet gateway, or static fallback.
 */
export async function createCryptoSession(opts: {
  orderIds: string[];
  email:    string;
  baseEur:  number;
  coinCode: string;
  locale?:   string;
}): Promise<CryptoSession> {
  const coin = await getCoin(opts.coinCode);
  if (!coin) throw new Error(`Coin ${opts.coinCode} is not available`);

  const coinCode = coin.code.toUpperCase();
  const db = createServiceClient();

  // Check if an active session with received funds or partially_paid already exists for these orderIds
  try {
    const { data: activeExisting } = await db
      .from('crypto_sessions')
      .select('*')
      .in('status', ['pending', 'partially_paid', 'detected'])
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });

    if (activeExisting && activeExisting.length > 0) {
      const existing = activeExisting.find((s: any) =>
        Array.isArray(s.order_ids) && opts.orderIds.some(id => s.order_ids.includes(id))
      );

      if (existing && (existing.status === 'partially_paid' || Number(existing.received_amount || 0) > 0)) {
        console.log(`[Session] Reusing existing partially_paid/active session ${existing.id} for order IDs ${opts.orderIds.join(', ')}`);
        
        const decimalLimit = coin.decimals || 8;
        const amount = Number(existing.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
        let paymentUri = `${coin.uri_scheme}:${existing.wallet_address}?amount=${amount}`;
        if (existing.payment_memo) {
          paymentUri += `&text=${encodeURIComponent(existing.payment_memo)}&memo=${encodeURIComponent(existing.payment_memo)}`;
        }

        return {
          id: existing.id,
          coin: existing.coin,
          walletAddress: existing.wallet_address,
          cryptoAmount: amount,
          paymentMemo: existing.payment_memo || null,
          amountEur: Number(existing.amount_eur),
          baseEur: Number(existing.base_eur),
          surchargePct: Number(existing.surcharge_pct),
          surchargeFixedEur: Number(existing.surcharge_fixed_eur),
          rateEur: Number(existing.rate_eur),
          confirmationsRequired: Number(existing.confirmations_required),
          paymentUri,
          expiresAt: existing.expires_at,
          checkoutDurationMins: coin.checkout_duration_mins || 30,
          locale: opts.locale || existing.locale || 'de',
        };
      }
    }
  } catch (findErr) {
    console.warn('[Session] Failed checking existing active session:', (findErr as Error).message);
  }

  // 1. Calculate final EUR price (including surcharge)
  const amountEur = applySurcharge(opts.baseEur, coin);
  const checkoutDurationMins = coin.checkout_duration_mins || 30;
  const expiresAtTemp = new Date(Date.now() + checkoutDurationMins * 60 * 1000).toISOString();

  // 2. Insert pending session in database to acquire session UUID
  const { data: sData, error: insertErr } = await db
    .from('crypto_sessions')
    .insert({
      order_ids:              opts.orderIds,
      customer_email:         opts.email.trim().toLowerCase(),
      coin:                   coin.code,
      wallet_address:         'TBD',
      base_eur:               roundEur(opts.baseEur),
      amount_eur:             amountEur,
      surcharge_pct:          Number(coin.surcharge_pct),
      surcharge_fixed_eur:    Number(coin.surcharge_fixed_eur),
      rate_eur:               0, // resolved below
      slot_id:                0,
      crypto_amount:          0, // resolved below
      confirmations_required: coin.confirmations,
      status:                 'pending',
      expires_at:             expiresAtTemp,
      locale:                 opts.locale || 'de',
    } as any)
    .select('id')
    .single();

  if (insertErr || !sData) {
    throw new Error(`Failed to create crypto session in database: ${insertErr?.message}`);
  }

  const sessionId = sData.id;

  // 3. Resolve wallet address and amount using 3 resilient tiers:
  //    Tier 1: Address Pool in system_settings (Instant, HD-derived, 0 network dependencies)
  //    Tier 2: Pure-Wallet Gateway (local or remote daemon)
  //    Tier 3: Safe Static Fallback Address (Guaranteed 100% checkout success)
  let walletRes: { address: string; amount_ltc: number; expires_at: string; payment_memo?: string | null } | null = null;
  const poolKey = `crypto_address_pool_${coin.code.toLowerCase()}`;

  // TIER 1: Database Address Pool
  try {
    const { data: poolRow } = await db
      .from('system_settings')
      .select('value')
      .eq('key', poolKey)
      .maybeSingle();

    if (poolRow?.value) {
      const pool = JSON.parse(poolRow.value) as { next_index: number; addresses: Array<{ address: string; index: number }> };
      if (pool && Array.isArray(pool.addresses) && pool.addresses.length > 0) {
        // Query active addresses currently in use by active sessions
        const { data: activeSessions } = await db
          .from('crypto_sessions')
          .select('wallet_address')
          .eq('coin', coin.code)
          .in('status', ['pending', 'detected', 'partially_paid'])
          .gt('expires_at', new Date().toISOString());

        const activeAddresses = new Set((activeSessions || []).map((s: any) => s.wallet_address).filter(Boolean));
        const nextIdx = typeof pool.next_index === 'number' ? pool.next_index : 0;
        let entry = pool.addresses[nextIdx % pool.addresses.length];

        // Search for the next available address that is not in active checkout
        for (let attempt = 0; attempt < pool.addresses.length; attempt++) {
          const candidate = pool.addresses[(nextIdx + attempt) % pool.addresses.length];
          if (!activeAddresses.has(candidate.address)) {
            entry = candidate;
            pool.next_index = (nextIdx + attempt + 1) % pool.addresses.length;
            break;
          }
        }

        if (!activeAddresses.has(entry.address)) {
          pool.next_index = (nextIdx + 1) % pool.addresses.length;
        }

        // Asynchronously update pool next_index without blocking checkout on error
        db.from('system_settings')
          .update({ value: JSON.stringify(pool) })
          .eq('key', poolKey)
          .then(({ error: saveError }: any) => {
            if (saveError) console.warn('[Session] Non-critical: Failed to save updated pool index:', saveError.message);
          })
          .catch((saveErr: any) => {
            console.warn('[Session] Non-critical: Pool index update exception:', saveErr.message);
          });

        const rate = await getCoinEurRate(coin.coingecko_id || coinCode);
        const decimals = coin.decimals || 8;
        const amountLtc = Math.round((amountEur / rate) * Math.pow(10, decimals)) / Math.pow(10, decimals);
        const memo = coinCode === 'TON' ? sessionId.slice(-8).toUpperCase() : null;

        walletRes = {
          address: entry.address,
          amount_ltc: amountLtc,
          expires_at: new Date(Date.now() + checkoutDurationMins * 60 * 1000).toISOString(),
          payment_memo: memo,
        };
        console.log(`[Session] Rotated address ${entry.address} (index ${entry.index}) from pool for session ${sessionId} (${coin.code})`);
      }
    }
  } catch (err) {
    console.warn('[Session] Pool address retrieval failed, attempting gateway/fallback:', (err as Error).message);
  }

  // TIER 2: Pure-Wallet Gateway
  if (!walletRes) {
    const gatewayCandidates = Array.from(new Set([
      process.env.PURE_WALLET_URL,
      'http://127.0.0.1:7777',
      'http://localhost:7777',
    ].filter(Boolean) as string[]));

    for (const gw of gatewayCandidates) {
      try {
        const cleanGw = gw.replace(/\/$/, '');
        const res = await fetch(`${cleanGw}/api/v1/payment/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount_eur: amountEur,
            order_id: sessionId,
            coin: coin.code,
            duration_mins: checkoutDurationMins,
          }),
          signal: AbortSignal.timeout(3500),
        });

        if (res.ok) {
          walletRes = await res.json() as { address: string; amount_ltc: number; expires_at: string; payment_memo?: string | null };
          console.log(`[Session] Acquired address from gateway (${cleanGw}) for session ${sessionId}`);
          break;
        }
      } catch {
        // try next candidate
      }
    }
  }

  // TIER 3: Safe Static Fallback Address
  if (!walletRes) {
    const fallbackAddress = process.env[`FALLBACK_${coinCode}_ADDRESS` as any]
      || (coinCode === 'LTC' ? process.env.FALLBACK_LTC_ADDRESS : undefined)
      || HARDCODED_FALLBACK_ADDRESSES[coinCode]
      || HARDCODED_FALLBACK_ADDRESSES.LTC;

    console.warn(`[Session] Pool & Gateway unavailable. Using guaranteed static fallback for ${coinCode}:`, fallbackAddress);

    const rate = await getCoinEurRate(coin.coingecko_id || coinCode);
    const decimals = coin.decimals || 8;
    // Add small random satoshis to make transaction uniquely distinguishable
    const randomSatoshis = Math.floor(Math.random() * 900) + 100;
    const amountLtcBase = amountEur / rate;
    const amountLtc = Math.round((amountLtcBase + (randomSatoshis / Math.pow(10, decimals))) * Math.pow(10, decimals)) / Math.pow(10, decimals);
    const memo = coinCode === 'TON' ? sessionId.slice(-8).toUpperCase() : null;

    walletRes = {
      address: fallbackAddress,
      amount_ltc: amountLtc,
      expires_at: new Date(Date.now() + checkoutDurationMins * 60 * 1000).toISOString(),
      payment_memo: memo,
    };
  }

  // 4. Update the session with derived address, coin rate, payment_memo, real expiration, and initial balance snapshot
  const rateEur = amountEur / walletRes.amount_ltc;

  let initialBalance = 0;
  if (['ETH', 'SOL', 'USDC', 'USDT', 'TRX'].includes(coinCode)) {
    try {
      const { checkAddressOnChain } = await import('@/app/api/crypto/session/[id]/route');
      const chainInfo = await checkAddressOnChain(walletRes.address, coinCode, walletRes.payment_memo);
      initialBalance = chainInfo.received || 0;
    } catch {}
  }

  const { error: updateErr } = await db
    .from('crypto_sessions')
    .update({
      wallet_address: walletRes.address,
      crypto_amount:  walletRes.amount_ltc,
      rate_eur:       rateEur,
      expires_at:     walletRes.expires_at,
      payment_memo:   walletRes.payment_memo || null,
      initial_balance: initialBalance,
    } as any)
    .eq('id', sessionId);

  if (updateErr) {
    throw new Error(`Failed to update session address: ${updateErr.message}`);
  }

  // Queue the address to be synchronized by the wallet gateway asynchronously
  queueAddressSync(walletRes.address).catch(() => {});

  // Proactively notify pure-wallet gateway if it's currently online
  try {
    const gatewayUrls = Array.from(new Set([
      process.env.PURE_WALLET_URL,
      'http://127.0.0.1:7777',
      'http://localhost:7777',
    ].filter(Boolean) as string[]));

    for (const gw of gatewayUrls) {
      fetch(`${gw.replace(/\/$/, '')}/api/v1/wallet/notify-active-address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: sessionId,
          address: walletRes.address,
          coin: coin.code,
          crypto_amount: walletRes.amount_ltc,
          amount_eur: amountEur,
          expires_at: walletRes.expires_at,
          payment_memo: walletRes.payment_memo || null,
        }),
        signal: AbortSignal.timeout(1500),
      }).catch(() => {});
    }
  } catch {}

  // Build URI scheme
  let paymentUri = `${coin.uri_scheme}:${walletRes.address}?amount=${walletRes.amount_ltc}`;
  if (walletRes.payment_memo) {
    paymentUri += `&text=${encodeURIComponent(walletRes.payment_memo)}&memo=${encodeURIComponent(walletRes.payment_memo)}`;
  }

  return {
    id: sessionId,
    coin: coin.code,
    walletAddress: walletRes.address,
    cryptoAmount: String(walletRes.amount_ltc),
    paymentMemo: walletRes.payment_memo || null,
    amountEur,
    baseEur: roundEur(opts.baseEur),
    surchargePct: Number(coin.surcharge_pct),
    surchargeFixedEur: Number(coin.surcharge_fixed_eur),
    rateEur,
    confirmationsRequired: coin.confirmations,
    paymentUri,
    expiresAt: walletRes.expires_at,
    checkoutDurationMins,
    locale: opts.locale || 'de',
  };
}

/**
 * Automatically sweeps expired crypto sessions and pending orders,
 * updating their status to 'expired' in the database.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function sweepExpiredSessions(db: any) {
  try {
    const nowIso = new Date().toISOString();

    const { data: candidateSessions } = await db
      .from('crypto_sessions')
      .select('id, order_ids, status, received_amount')
      .in('status', ['pending'])
      .lte('expires_at', nowIso);

    if (candidateSessions && candidateSessions.length > 0) {
      const { syncSessionWithGateway } = await import('@/app/api/crypto/session/[id]/route');
      const trulyExpiredIds: string[] = [];
      const trulyExpiredOrderIds: string[] = [];

      for (const s of candidateSessions) {
        try {
          // Perform instant blockchain check before declaring expired
          await syncSessionWithGateway(s.id, db);
          
          const { data: updatedS } = await db
            .from('crypto_sessions')
            .select('status')
            .eq('id', s.id)
            .maybeSingle();

          if (updatedS && (updatedS.status === 'pending' || updatedS.status === 'expired')) {
            trulyExpiredIds.push(s.id);
            if (Array.isArray(s.order_ids)) {
              trulyExpiredOrderIds.push(...s.order_ids);
            }
          } else {
            console.log(`[sweepExpiredSessions] Saved session ${s.id} from expiration! Status updated to ${updatedS?.status}`);
          }
        } catch (err) {
          console.warn(`[sweepExpiredSessions] Sync failed for ${s.id}, marking expired:`, (err as Error).message);
          trulyExpiredIds.push(s.id);
          if (Array.isArray(s.order_ids)) {
            trulyExpiredOrderIds.push(...s.order_ids);
          }
        }
      }

      if (trulyExpiredIds.length > 0) {
        // Mark sessions as expired
        await db
          .from('crypto_sessions')
          .update({ status: 'expired' })
          .in('id', trulyExpiredIds)
          .eq('status', 'pending');

        // Mark corresponding pending orders as expired
        if (trulyExpiredOrderIds.length > 0) {
          await db
            .from('orders')
            .update({ status: 'expired' })
            .in('id', trulyExpiredOrderIds)
            .in('status', ['pending', 'pending_payment']);
        }
      }
    }
  } catch (err) {
    console.error('[sweepExpiredSessions] Error:', err);
  }
}
