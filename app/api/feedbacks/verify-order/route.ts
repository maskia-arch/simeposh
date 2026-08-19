import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderIdentifier = (searchParams.get('orderId') || searchParams.get('ref') || '').trim();

    if (!orderIdentifier) {
      return NextResponse.json({ success: false, error: 'Bestellungs- oder Transaktions-ID fehlt.' }, { status: 400 });
    }

    // 1. Look up order either by UUID or by checkout_ref
    let orderRow: any = null;
    if (isUuid(orderIdentifier)) {
      const { rows } = await query(
        `SELECT o.id, o.customer_name, o.status, o.payment_confirmed_at, o.iccid, t.name as tariff_name, t.country_name
         FROM public.orders o
         LEFT JOIN public.tariffs t ON t.id = o.tariff_id
         WHERE o.id = $1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
    }

    if (!orderRow) {
      const { rows } = await query(
        `SELECT o.id, o.customer_name, o.status, o.payment_confirmed_at, o.iccid, t.name as tariff_name, t.country_name
         FROM public.orders o
         LEFT JOIN public.tariffs t ON t.id = o.tariff_id
         WHERE o.checkout_ref = $1
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
    }

    if (!orderRow) {
      return NextResponse.json({ success: false, error: 'Bestellung oder Transaktion wurde nicht gefunden.' }, { status: 404 });
    }

    // 2. Validate that the order is paid
    const isPaid = ['completed', 'paid', 'provisioning'].includes(orderRow.status) || 
                   !!orderRow.payment_confirmed_at || 
                   !!orderRow.iccid;

    if (!isPaid) {
      return NextResponse.json({ success: false, error: 'Diese Bestellung ist noch nicht bezahlt.' }, { status: 400 });
    }

    const realOrderId = orderRow.id;

    // 3. Check if feedback was already submitted
    const { rows: feedbackRows } = await query(
      'SELECT id, rating, display_name, created_at FROM public.feedbacks WHERE order_id = $1',
      [realOrderId]
    );

    if (feedbackRows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        alreadySubmitted: true,
        orderId: realOrderId,
        customerName: orderRow.customer_name || 'Kunde',
        existingFeedback: feedbackRows[0],
      });
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      orderId: realOrderId,
      customerName: orderRow.customer_name || 'Kunde',
      tariffName: orderRow.tariff_name || null,
      countryName: orderRow.country_name || null,
    });
  } catch (err: any) {
    console.error('[GET /api/feedbacks/verify-order] Error:', err.message);
    return NextResponse.json({ success: false, error: 'Datenbankfehler bei der Verifizierung.' }, { status: 500 });
  }
}
