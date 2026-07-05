/**
 * GET /api/crypto/active-payments
 *
 * Returns all active (pending/detected/partially_paid) crypto checkout sessions
 * so that the wallet gateway can sync and monitor them.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.SHOP_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: 'SHOP_WEBHOOK_SECRET not configured' }, { status: 500 });
  }

  // Authorization check (M2M GET)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceClient();
    
    // Fetch active sessions from Supabase
    const { data: sessions, error } = await db
      .from('crypto_sessions')
      .select('id, coin, amount_eur, crypto_amount, wallet_address, status, created_at, expires_at, paid_at, confirmations_required, confirmations, tx_hash, received_amount')
      .in('status', ['pending', 'detected', 'partially_paid']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const payments = (sessions || []).map(s => ({
      order_id: s.id,
      coin: s.coin || 'LTC',
      amount_eur: Number(s.amount_eur),
      amount_ltc: Number(s.crypto_amount),
      address: s.wallet_address,
      status: s.status,
      received_amount: Number((s as any).received_amount || 0.0),
      tx_hash: s.tx_hash || null,
      confirmations_required: s.confirmations_required || 1,
      confirmations: s.confirmations || 0,
      created_at: s.created_at,
      expires_at: s.expires_at,
      paid_at: s.paid_at || null,
    }));

    return NextResponse.json({ payments });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[active-payments GET] error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
