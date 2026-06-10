/**
 * Crypto checkout session creation — pure-wallet integration.
 *
 *   1. base EUR price (from the order, never the client)
 *   2. + coin surcharge (percent and/or fixed) → fiat target
 *   3. Calls pure-wallet API to derive next address and convert to LTC
 *   4. Saves the derived address, exact LTC amount, and expiration
 */
import { createServiceClient } from '@/lib/supabase/server';
import { getCoin, type CoinConfig } from '@/lib/crypto/coins';

export interface CryptoSession {
  id:            string;
  coin:          string;
  walletAddress: string;
  cryptoAmount:  string;   // exact expected amount, fixed decimals
  amountEur:     number;
  baseEur:       number;
  surchargePct:  number;
  surchargeFixedEur: number;
  rateEur:       number;
  confirmationsRequired: number;
  paymentUri:    string;
  expiresAt:     string;
}

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
 * orders by calling the local pure-wallet gateway.
 */
export async function createCryptoSession(opts: {
  orderIds: string[];
  email:    string;
  baseEur:  number;
  coinCode: string;
}): Promise<CryptoSession> {
  const coin = await getCoin(opts.coinCode);
  if (!coin) throw new Error(`Coin ${opts.coinCode} is not available`);

  if (opts.coinCode.toUpperCase() !== 'LTC') {
    throw new Error('Only Litecoin (LTC) is supported by the payment gateway at this time.');
  }

  const db = createServiceClient();

  // 1. Calculate final EUR price (including surcharge)
  const amountEur = applySurcharge(opts.baseEur, coin);
  const expiresAtTemp = new Date(Date.now() + 25 * 60 * 1000).toISOString();

  // 2. Insert pending session in database to acquire session UUID
  const { data: sData, error: insertErr } = await db
    .from('crypto_sessions')
    .insert({
      order_ids:              opts.orderIds,
      customer_email:         opts.email,
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
    })
    .select('id')
    .single();

  if (insertErr || !sData) {
    throw new Error(`Failed to create crypto session in database: ${insertErr?.message}`);
  }

  const sessionId = sData.id;

  // 3. Call local pure-wallet gateway to derive address and convert price to LTC
  let walletRes: { address: string; amount_ltc: number; expires_at: string };
  try {
    const gatewayUrl = process.env.PURE_WALLET_URL || 'http://localhost:7777';
    const res = await fetch(`${gatewayUrl}/api/v1/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount_eur: amountEur,
        order_id: sessionId,
      }),
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.error || `Gateway returned status ${res.status}`);
    }

    walletRes = await res.json();
  } catch (err) {
    // Clean up created pending orders and session on failure
    await db.from('orders').delete().in('id', opts.orderIds);
    await db.from('crypto_sessions').delete().eq('id', sessionId);
    throw new Error(`Krypto-Gateway-Fehler: ${(err as Error).message}`);
  }

  // 4. Update the session with derived address, ltc rate, and real expiration
  const rateEur = amountEur / walletRes.amount_ltc;

  const { error: updateErr } = await db
    .from('crypto_sessions')
    .update({
      wallet_address: walletRes.address,
      crypto_amount:  walletRes.amount_ltc,
      rate_eur:       rateEur,
      expires_at:     walletRes.expires_at,
    } as any)
    .eq('id', sessionId);

  if (updateErr) {
    throw new Error(`Failed to update session address: ${updateErr.message}`);
  }

  // P2PKH payment URI
  const paymentUri = `litecoin:${walletRes.address}?amount=${walletRes.amount_ltc}`;

  return {
    id: sessionId,
    coin: coin.code,
    walletAddress: walletRes.address,
    cryptoAmount: String(walletRes.amount_ltc),
    amountEur,
    baseEur: roundEur(opts.baseEur),
    surchargePct: Number(coin.surcharge_pct),
    surchargeFixedEur: Number(coin.surcharge_fixed_eur),
    rateEur,
    confirmationsRequired: coin.confirmations,
    paymentUri,
    expiresAt: walletRes.expires_at,
  };
}
