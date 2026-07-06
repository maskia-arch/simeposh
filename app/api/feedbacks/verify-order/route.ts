import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId')?.trim();

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'Bestellungs-ID fehlt.' }, { status: 400 });
    }

    // 1. Verify that the order exists and has an active eSIM (completed status or has ICCID)
    const { rows: orderRows } = await query(
      `SELECT id, customer_name, status, iccid 
       FROM public.orders 
       WHERE id = $1`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return NextResponse.json({ success: false, error: 'Bestellung wurde nicht gefunden.' }, { status: 404 });
    }

    const order = orderRows[0];
    const isActive = order.status === 'completed' || order.status === 'provisioning' || !!order.iccid;

    if (!isActive) {
      return NextResponse.json({ success: false, error: 'Diese Bestellung besitzt noch keine aktive eSIM.' }, { status: 400 });
    }

    // 2. Check if a feedback was already submitted for this order
    const { rows: feedbackRows } = await query(
      'SELECT id FROM public.feedbacks WHERE order_id = $1',
      [orderId]
    );

    if (feedbackRows.length > 0) {
      return NextResponse.json({ success: false, error: 'Für diese Bestellung wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      customerName: order.customer_name || 'Kunde',
    });
  } catch (err: any) {
    console.error('[GET /api/feedbacks/verify-order] Error:', err.message);
    return NextResponse.json({ success: false, error: 'Datenbankfehler bei der Verifizierung.' }, { status: 500 });
  }
}
