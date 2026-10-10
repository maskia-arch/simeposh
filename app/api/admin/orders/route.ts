import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const db = createServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    let ordersQuery = db
      .from('orders')
      .select('id, status, order_type, amount_eur, customer_email, customer_name, payment_confirmed_at, created_at, checkout_ref, tariffs(name, country_name)')
      .order('created_at', { ascending: false })
      .limit(100);

    if (status) {
      ordersQuery = ordersQuery.eq('status', status);
    }

    const { data: orders, error: ordersErr } = await ordersQuery;
    if (ordersErr) {
      return NextResponse.json({ error: ordersErr.message }, { status: 500 });
    }

    // Also fetch crypto sessions in 'review' for backend visibility
    const { data: reviewSessions } = await db
      .from('crypto_sessions')
      .select('id, coin, wallet_address, crypto_amount, received_amount, status, tx_hash, created_at, expires_at, paid_at, customer_email, order_ids')
      .eq('status', 'review')
      .order('created_at', { ascending: false });

    return NextResponse.json({
      orders: orders || [],
      reviewSessions: reviewSessions || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
