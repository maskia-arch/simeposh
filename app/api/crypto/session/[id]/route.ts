/**
 * GET /api/crypto/session/[id]
 * Public status of a crypto checkout session (polled by the checkout UI).
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Helper to sync the session state with pure-wallet gateway.
 */
async function syncSessionWithGateway(id: string, db: any): Promise<any> {
  const gatewayUrl = process.env.PURE_WALLET_URL || 'http://localhost:7777';
  
  try {
    const res = await fetch(`${gatewayUrl}/api/v1/payment/status/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;

    const data = await res.json() as {
      status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected';
      received_amount: number;
      tx_hash: string | null;
      confirmations: number;
      paid_at: string | null;
    };

    const { data: currentSession } = await db
      .from('crypto_sessions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (!currentSession) return null;

    // Check if there is an update
    if (
      currentSession.status !== data.status ||
      currentSession.received_amount !== data.received_amount ||
      currentSession.tx_hash !== data.tx_hash ||
      currentSession.confirmations !== data.confirmations
    ) {
      const updatePayload: Record<string, unknown> = {
        status: data.status,
        received_amount: data.received_amount,
        tx_hash: data.tx_hash,
        confirmations: data.confirmations,
        paid_at: data.paid_at || (data.status === 'paid' ? new Date().toISOString() : null),
      };

      await db
        .from('crypto_sessions')
        .update(updatePayload as any)
        .eq('id', id);

      // Transition to paid: trigger order fulfillment
      if (data.status === 'paid' && currentSession.status !== 'paid') {
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
  } catch (err) {
    console.warn(`[Session Sync] Failed to sync status for session ${id}:`, (err as Error).message);
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  // 1. Sync local session state with the gateway first
  await syncSessionWithGateway(id, db);

  const { data: s, error } = await db
    .from('crypto_sessions')
    .select('*, crypto_coins(name, uri_scheme)')
    .eq('id', id)
    .single();

  if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coin = (s as any).crypto_coins as { name: string; uri_scheme: string } | null;
  const decimalLimit = 8; // LTC is 8 decimals
  const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  const paymentUri = `litecoin:${s.wallet_address}?amount=${amount}`;

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
      .select('*, crypto_coins(name, uri_scheme)')
      .eq('id', id)
      .single();

    if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coin = (s as any).crypto_coins as { name: string; uri_scheme: string } | null;
    const decimalLimit = 8;
    const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
    const paymentUri = `litecoin:${s.wallet_address}?amount=${amount}`;

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
