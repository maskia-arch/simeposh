/**
 * GET /api/crypto/session/[id]
 * Public status of a crypto checkout session (polled by the checkout UI).
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkBtcLtcAddress(address: string, coinCode: string): Promise<{ received: number; confirmations: number; txid: string | null }> {
  const isLtc = coinCode === 'LTC';
  const baseUrl = isLtc ? 'https://litecoinspace.org/api' : 'https://mempool.space/api';
  
  const txsRes = await fetch(`${baseUrl}/address/${address}/txs`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!txsRes.ok) throw new Error(`Explorer returned status ${txsRes.status}`);
  const txs = await txsRes.json() as any[];

  let tipHeight = 0;
  try {
    const tipRes = await fetch(`${baseUrl}/blocks/tip/height`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (tipRes.ok) {
      tipHeight = parseInt((await tipRes.text()).trim(), 10);
    }
  } catch {}

  let totalReceivedSat = 0;
  let maxConfirmations = 0;
  let lastTxid: string | null = null;

  for (const tx of txs) {
    let txReceived = 0;
    if (tx.vout) {
      for (const out of tx.vout) {
        if (out.scriptpubkey_address === address) {
          txReceived += out.value;
        }
      }
    }

    if (txReceived > 0) {
      totalReceivedSat += txReceived;
      lastTxid = tx.txid;
      
      let txConf = 0;
      if (tx.status && tx.status.confirmed && tx.status.block_height) {
        txConf = Math.max(1, tipHeight - tx.status.block_height + 1);
      }
      if (txConf > maxConfirmations) {
        maxConfirmations = txConf;
      }
    }
  }

  return {
    received: totalReceivedSat / 1e8,
    confirmations: maxConfirmations,
    txid: lastTxid
  };
}

async function checkEthAddress(address: string): Promise<{ received: number; confirmations: number; txid: string | null }> {
  const body = {
    jsonrpc: "2.0",
    method: "eth_getBalance",
    params: [address, "latest"],
    id: 1
  };
  const res = await fetch("https://cloudflare-eth.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`ETH RPC failed with status ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const balanceWei = BigInt(data.result || "0x0");
  const balanceEth = Number(balanceWei) / 1e18;

  return {
    received: balanceEth,
    confirmations: balanceEth > 0 ? 1 : 0,
    txid: balanceEth > 0 ? "eth_direct_rpc_check" : null
  };
}

async function checkSolAddress(address: string): Promise<{ received: number; confirmations: number; txid: string | null }> {
  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address]
  };
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`SOL RPC failed with status ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const balanceLamports = data.result?.value ?? 0;
  const balanceSol = balanceLamports / 1e9;
  
  return {
    received: balanceSol,
    confirmations: balanceSol > 0 ? 1 : 0,
    txid: balanceSol > 0 ? "sol_direct_rpc_check" : null
  };
}

/**
 * Helper to sync the session state with pure-wallet gateway or direct blockchain explorers.
 */
async function syncSessionWithGateway(id: string, db: any): Promise<any> {
  const gatewayUrl = process.env.PURE_WALLET_URL || 'http://127.0.0.1:7777';
  
  let gatewayData: any = null;
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/payment/status/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      gatewayData = await res.json();
    }
  } catch (err) {
    console.warn(`[Session Sync] Gateway offline/error for session ${id}, using direct blockchain check:`, (err as Error).message);
  }

  // 1. Fetch current session status
  const { data: currentSession } = await db
    .from('crypto_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!currentSession) return null;

  let status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected' = currentSession.status;
  let receivedAmount = currentSession.received_amount || 0;
  let txHash = currentSession.tx_hash;
  let confirmations = currentSession.confirmations || 0;
  let paidAt = currentSession.paid_at;

  if (gatewayData) {
    status = gatewayData.status;
    receivedAmount = gatewayData.received_amount;
    txHash = gatewayData.tx_hash;
    confirmations = gatewayData.confirmations;
    paidAt = gatewayData.paid_at || (gatewayData.status === 'paid' ? new Date().toISOString() : null);
  } else {
    // Direct Blockchain Explorer check!
    if (currentSession.status === 'pending' || currentSession.status === 'partially_paid' || currentSession.status === 'detected') {
      try {
        const coinCode = currentSession.coin.toUpperCase();
        const address = currentSession.wallet_address;
        let chainInfo = { received: 0, confirmations: 0, txid: null as string | null };

        if (coinCode === 'LTC' || coinCode === 'BTC') {
          chainInfo = await checkBtcLtcAddress(address, coinCode);
        } else if (coinCode === 'ETH') {
          chainInfo = await checkEthAddress(address);
        } else if (coinCode === 'SOL') {
          chainInfo = await checkSolAddress(address);
        }

        const expectedAmount = Number(currentSession.crypto_amount);
        const confirmationsRequired = Number(currentSession.confirmations_required || 1);

        if (chainInfo.received >= expectedAmount) {
          status = chainInfo.confirmations >= confirmationsRequired ? 'paid' : 'detected';
        } else if (chainInfo.received > 0) {
          status = 'partially_paid';
        } else {
          status = 'pending';
        }

        receivedAmount = chainInfo.received;
        txHash = chainInfo.txid || txHash;
        confirmations = chainInfo.confirmations;
        paidAt = status === 'paid' ? new Date().toISOString() : null;

        console.log(`[Direct Chain Check] Session ${id} (${coinCode}): status=${status}, received=${receivedAmount}/${expectedAmount}`);
      } catch (chainErr) {
        console.error(`[Direct Chain Check] Failed to check blockchain for session ${id}:`, (chainErr as Error).message);
      }
    }
  }

  // Check if there is an update
  if (
    currentSession.status !== status ||
    currentSession.received_amount !== receivedAmount ||
    currentSession.tx_hash !== txHash ||
    currentSession.confirmations !== confirmations
  ) {
    const updatePayload: Record<string, unknown> = {
      status,
      received_amount: receivedAmount,
      tx_hash: txHash,
      confirmations,
      paid_at: paidAt || (status === 'paid' ? new Date().toISOString() : null),
    };

    await db
      .from('crypto_sessions')
      .update(updatePayload as any)
      .eq('id', id);

    // Transition to paid: trigger order fulfillment
    if (status === 'paid' && currentSession.status !== 'paid') {
      console.log(`[Session Sync] Fulfilling orders for paid session: ${currentSession.order_ids.join(', ')}`);
      
      await db
        .from('orders')
        .update({
          status: 'paid',
          payment_confirmed_at: new Date().toISOString(),
        })
        .in('id', currentSession.order_ids)
        .neq('status', 'completed');

      await fulfillOrders(db, currentSession.order_ids);
    }
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  // 1. Sync local session state with the gateway first
  await syncSessionWithGateway(id, db);

  const { data: s, error } = await db
    .from('crypto_sessions')
    .select('*, crypto_coins(name, uri_scheme, decimals)')
    .eq('id', id)
    .single();

  if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coin = (s as any).crypto_coins as { name: string; uri_scheme: string; decimals: number } | null;
  const decimalLimit = coin?.decimals ?? 8;
  const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  const paymentUri = `${coin?.uri_scheme || 'litecoin'}:${s.wallet_address}?amount=${amount}`;

  // Resolve checkout_ref
  let ref: string | null = null;
  if (s.order_ids?.length) {
    const { data: ord } = await db.from('orders').select('checkout_ref').eq('id', s.order_ids[0]).single();
    ref = ord?.checkout_ref ?? null;
  }

  const now = Date.now();
  const expiresMs = new Date(s.expires_at).getTime();
  const remainingMs = Math.max(0, expiresMs - now);
  const status = (s.status === 'pending' && remainingMs <= 0) ? 'expired' : s.status;

  return NextResponse.json({
    id:                 s.id,
    coin:               s.coin,
    coinName:           coin?.name ?? s.coin,
    status,
    walletAddress:      s.wallet_address,
    cryptoAmount:       amount,
    paymentUri,
    amountEur:          Number(s.amount_eur),
    baseEur:            Number(s.base_eur),
    surchargePct:       Number(s.surcharge_pct),
    surchargeFixedEur:  Number(s.surcharge_fixed_eur),
    confirmations:      s.confirmations,
    confirmationsRequired: s.confirmations_required,
    txHash:             s.tx_hash,
    remainingMs,
    expiresAt:          s.expires_at,
    ref,
    paymentMemo:        null, // LTC doesn't require memo
    receivedAmount:     Number(s.received_amount || 0),
  });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // 1. Fetch the session to get order_ids
    const { data: s, error: fetchErr } = await db
      .from('crypto_sessions')
      .select('order_ids')
      .eq('id', id)
      .single();

    if (fetchErr || !s) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Delete the associated pending orders
    if (s.order_ids && s.order_ids.length > 0) {
      const { error: deleteOrdersErr } = await db
        .from('orders')
        .delete()
        .in('id', s.order_ids);
      if (deleteOrdersErr) {
        console.error('[crypto/session/cancel] Failed to delete orders:', deleteOrdersErr.message);
      }
    }

    // 3. Delete the session
    const { error: deleteSessionErr } = await db
      .from('crypto_sessions')
      .delete()
      .eq('id', id);

    if (deleteSessionErr) {
      console.error('[crypto/session/cancel] Failed to delete session:', deleteSessionErr.message);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crypto/session/cancel] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // 1. Sync session state with the gateway (checks for final transitions)
    await syncSessionWithGateway(id, db);

    // 2. Fetch and return the updated session details
    const { data: s, error } = await db
      .from('crypto_sessions')
      .select('*, crypto_coins(name, uri_scheme, decimals)')
      .eq('id', id)
      .single();

    if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coin = (s as any).crypto_coins as { name: string; uri_scheme: string; decimals: number } | null;
    const decimalLimit = coin?.decimals ?? 8;
    const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
    const paymentUri = `${coin?.uri_scheme || 'litecoin'}:${s.wallet_address}?amount=${amount}`;

    let ref: string | null = null;
    if (s.order_ids?.length) {
      const { data: ord } = await db.from('orders').select('checkout_ref').eq('id', s.order_ids[0]).single();
      ref = ord?.checkout_ref ?? null;
    }

    const now = Date.now();
    const expiresMs = new Date(s.expires_at).getTime();
    const remainingMs = Math.max(0, expiresMs - now);
    const status = (s.status === 'pending' && remainingMs <= 0) ? 'expired' : s.status;

    return NextResponse.json({
      id:                 s.id,
      coin:               s.coin,
      coinName:           coin?.name ?? s.coin,
      status,
      walletAddress:      s.wallet_address,
      cryptoAmount:       amount,
      paymentUri,
      amountEur:          Number(s.amount_eur),
      baseEur:            Number(s.base_eur),
      surchargePct:       Number(s.surcharge_pct),
      surchargeFixedEur:  Number(s.surcharge_fixed_eur),
      confirmations:      s.confirmations,
      confirmationsRequired: s.confirmations_required,
      txHash:             s.tx_hash,
      remainingMs,
      expiresAt:          s.expires_at,
      ref,
      paymentMemo:        null,
      receivedAmount:     Number(s.received_amount || 0),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crypto/session/verify] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
