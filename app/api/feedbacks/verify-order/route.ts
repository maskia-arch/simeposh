import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/utils';
import { checkRateLimit, getClientIp, verifyOrderAuthorization } from '@/lib/feedback/security';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // 0. Anti-scraping / Anti-enumeration Rate Limiting (60 queries per minute per IP)
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`verify-order:${ip}`, 60, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { success: false, error: 'Zu viele Anfragen. Bitte warte einen Moment.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetInSeconds) } }
      );
    }

    const { searchParams } = new URL(request.url);
    const rawOrderId = searchParams.get('orderId')?.trim() || '';
    const rawRef = searchParams.get('ref')?.trim() || '';
    const rawInvoiceId = searchParams.get('invoiceId')?.trim() || '';
    const rawIccid = searchParams.get('iccid')?.trim() || '';
    const token = searchParams.get('token')?.trim() || '';

    const orderIdentifier = rawOrderId || rawRef || rawInvoiceId || rawIccid;

    if (!orderIdentifier) {
      return NextResponse.json({ success: false, error: 'Bestellungs- oder Transaktions-ID fehlt.' }, { status: 400 });
    }

    // 1. Look up order: by UUID (orders.id), checkout_ref, crypto_sessions (invoiceId), or ICCID
    let orderRow: any = null;
    let hasCheckoutSessionProof = false;

    // 1a. By direct order UUID
    if (isUuid(orderIdentifier)) {
      const { rows } = await query(
        `SELECT o.id, o.customer_name, o.customer_email, o.user_id, o.status, o.payment_confirmed_at, o.iccid, o.amount_eur, t.name as tariff_name, t.country_name
         FROM public.orders o
         LEFT JOIN public.tariffs t ON t.id = o.tariff_id
         WHERE o.id = $1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
    }

    // 1b. By checkout_ref (session proof)
    if (!orderRow && rawRef) {
      const { rows } = await query(
        `SELECT o.id, o.customer_name, o.customer_email, o.user_id, o.status, o.payment_confirmed_at, o.iccid, o.amount_eur, t.name as tariff_name, t.country_name
         FROM public.orders o
         LEFT JOIN public.tariffs t ON t.id = o.tariff_id
         WHERE o.checkout_ref = $1
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [rawRef]
      );
      if (rows.length > 0) {
        orderRow = rows[0];
        hasCheckoutSessionProof = true;
      }
    }

    // 1c. By crypto session UUID (invoiceId in overview links - session proof)
    if (!orderRow && rawInvoiceId && isUuid(rawInvoiceId)) {
      const { rows: sessionRows } = await query(
        'SELECT order_ids FROM public.crypto_sessions WHERE id = $1',
        [rawInvoiceId]
      );
      if (sessionRows.length > 0 && sessionRows[0].order_ids) {
        let orderIds: string[] = [];
        const rawIds = sessionRows[0].order_ids;
        if (Array.isArray(rawIds)) orderIds = rawIds;
        else if (typeof rawIds === 'string') {
          try {
            const parsed = JSON.parse(rawIds);
            orderIds = Array.isArray(parsed) ? parsed : [rawIds];
          } catch {
            orderIds = rawIds.replace(/[{}]/g, '').split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
          }
        }
        const cleanIds = orderIds.filter(isUuid);
        if (cleanIds.length > 0) {
          const { rows } = await query(
            `SELECT o.id, o.customer_name, o.customer_email, o.user_id, o.status, o.payment_confirmed_at, o.iccid, o.amount_eur, t.name as tariff_name, t.country_name
             FROM public.orders o
             LEFT JOIN public.tariffs t ON t.id = o.tariff_id
             WHERE o.id = ANY($1::uuid[])
             ORDER BY o.created_at DESC
             LIMIT 1`,
            [cleanIds]
          );
          if (rows.length > 0) {
            orderRow = rows[0];
            hasCheckoutSessionProof = true;
          }
        }
      }
    }

    // 1d. By ICCID (device installation proof)
    if (!orderRow && rawIccid) {
      const { rows } = await query(
        `SELECT o.id, o.customer_name, o.customer_email, o.user_id, o.status, o.payment_confirmed_at, o.iccid, o.amount_eur, t.name as tariff_name, t.country_name
         FROM public.orders o
         LEFT JOIN public.tariffs t ON t.id = o.tariff_id
         WHERE o.iccid = $1
         ORDER BY o.created_at DESC
         LIMIT 1`,
        [rawIccid]
      );
      if (rows.length > 0) {
        orderRow = rows[0];
        hasCheckoutSessionProof = true;
      }
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

    // 3. Cryptographic Tamper-Proofing & Multi-Factor Authorization Check
    const authCheck = await verifyOrderAuthorization(orderRow, {
      token,
      hasCheckoutSessionProof,
    });

    if (!authCheck.authorized) {
      return NextResponse.json({
        success: false,
        error: authCheck.reason || 'Zugriff verweigert: Bitte nutze den Bewertungslink aus deiner E-Mail.',
      }, { status: 403 });
    }

    const realOrderId = orderRow.id;
    const orderAmount = Number(orderRow.amount_eur) || 0;
    const cashbackRewardEur = Math.round(orderAmount * 0.01 * 100) / 100;

    // 4. Check if feedback was already submitted
    const { rows: feedbackRows } = await query(
      'SELECT id, rating, display_name, created_at, cashback_reward_eur FROM public.feedbacks WHERE order_id = $1',
      [realOrderId]
    );

    if (feedbackRows.length > 0) {
      return NextResponse.json({ 
        success: true, 
        alreadySubmitted: true,
        orderId: realOrderId,
        customerName: orderRow.customer_name || 'Kunde',
        existingFeedback: feedbackRows[0],
        verifiedToken: authCheck.verifiedToken,
        orderAmount,
        cashbackRewardEur,
      });
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      orderId: realOrderId,
      customerName: orderRow.customer_name || 'Kunde',
      tariffName: orderRow.tariff_name || null,
      countryName: orderRow.country_name || null,
      verifiedToken: authCheck.verifiedToken,
      orderAmount,
      cashbackRewardEur,
    });
  } catch (err: any) {
    console.error('[GET /api/feedbacks/verify-order] Error:', err.message);
    return NextResponse.json({ success: false, error: 'Datenbankfehler bei der Verifizierung.' }, { status: 500 });
  }
}
