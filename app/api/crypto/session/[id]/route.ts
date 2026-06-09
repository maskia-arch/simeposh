/**
 * GET /api/crypto/session/[id]
 * Public status of a crypto checkout session (polled by the checkout UI).
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { runWatcher } from '@/lib/crypto/watcher';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  const { data: s, error } = await db
    .from('crypto_sessions')
    .select('*, crypto_coins(name, uri_scheme)')
    .eq('id', id)
    .single();

  if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coin = (s as any).crypto_coins as { name: string; uri_scheme: string } | null;
  const amount = Number(s.crypto_amount).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
  const paymentUri = coin ? `${coin.uri_scheme}:${s.wallet_address}?amount=${amount}` : '';

  // Resolve the /order ref (checkout_ref shared by the orders).
  let ref: string | null = null;
  if (s.order_ids?.length) {
    const { data: ord } = await db.from('orders').select('checkout_ref').eq('id', s.order_ids[0]).single();
    ref = ord?.checkout_ref ?? null;
  }

  const now = Date.now();
  const expiresMs = new Date(s.expires_at).getTime();
  const remainingMs = Math.max(0, expiresMs - now);

  // Auto-mark expired in the response if past TTL and still pending.
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

    // 1. Trigger blockchain watcher check (updates DB statuses)
    await runWatcher();

    // 2. Fetch and return the updated session details
    const { data: s, error } = await db
      .from('crypto_sessions')
      .select('*, crypto_coins(name, uri_scheme)')
      .eq('id', id)
      .single();

    if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coin = (s as any).crypto_coins as { name: string; uri_scheme: string } | null;
    const amount = Number(s.crypto_amount).toFixed(8).replace(/0+$/, '').replace(/\.$/, '');
    const paymentUri = coin ? `${coin.uri_scheme}:${s.wallet_address}?amount=${amount}` : '';

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
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crypto/session/verify] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
