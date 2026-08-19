import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendFeedbackInviteEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleInvite(request: Request) {
  // 1. Secure authorization check (Bearer SHOP_WEBHOOK_SECRET or CRON_SECRET)
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.SHOP_WEBHOOK_SECRET || process.env.CRON_SECRET;

  if (expectedSecret && authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    // 2. Query eligible customers with orders paid >= 3 days ago, deduplicated by customer email.
    // Picks the single LATEST purchase for any customer who made multiple purchases.
    const { rows: eligibleOrders } = await query(
      `WITH latest_orders AS (
         SELECT DISTINCT ON (LOWER(customer_email))
           o.id,
           o.customer_email,
           o.customer_name,
           o.created_at,
           o.locale,
           o.tariff_id
         FROM public.orders o
         WHERE (
           o.status IN ('completed', 'paid', 'provisioning') 
           OR o.payment_confirmed_at IS NOT NULL 
           OR o.iccid IS NOT NULL
         )
         AND (
           o.payment_confirmed_at <= NOW() - INTERVAL '3 days'
           OR o.created_at <= NOW() - INTERVAL '3 days'
         )
         AND o.review_invited = false
         AND o.customer_email IS NOT NULL
         AND TRIM(o.customer_email) != ''
         ORDER BY LOWER(o.customer_email), o.created_at DESC
       )
       SELECT 
         lo.id,
         lo.customer_email,
         lo.customer_name,
         lo.locale,
         t.name AS tariff_name,
         t.country_name
       FROM latest_orders lo
       LEFT JOIN public.tariffs t ON t.id = lo.tariff_id
       WHERE NOT EXISTS (
         SELECT 1 FROM public.feedbacks f WHERE f.order_id = lo.id
       )
       LIMIT 50`
    );

    if (eligibleOrders.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: 'Keine ausstehenden Feedback-Einladungen für Bestellungen älter als 3 Tage gefunden.',
        invitedCount: 0,
      });
    }

    console.log(`[CRON Invite Feedbacks] Processing ${eligibleOrders.length} eligible customer invitations...`);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net').replace(/\/$/, '');

    let sentCount = 0;
    let failedCount = 0;

    // 3. Send email to each customer for their latest order
    for (const order of eligibleOrders) {
      const inviteUrl = `${appUrl}/reviews/new?orderId=${encodeURIComponent(order.id)}`;

      try {
        await sendFeedbackInviteEmail({
          to:           order.customer_email.trim().toLowerCase(),
          customerName: order.customer_name || undefined,
          orderId:      order.id,
          tariffName:   order.tariff_name || undefined,
          countryName:  order.country_name || undefined,
          inviteUrl,
          locale:       order.locale || 'de',
        });

        // 4. Mark all orders of this customer email as review_invited = true
        // to ensure existing customers with multiple past purchases receive exactly 1 email
        await query(
          `UPDATE public.orders 
           SET review_invited = true 
           WHERE LOWER(customer_email) = LOWER($1)`,
          [order.customer_email.trim()]
        );

        sentCount++;
      } catch (emailErr: any) {
        console.error(`[CRON Invite Feedbacks] Failed to send email to ${order.customer_email}:`, emailErr.message);
        failedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `${sentCount} Feedback-Einladungen erfolgreich versendet (${failedCount} fehlgeschlagen).`,
      sentCount,
      failedCount,
      totalEligible: eligibleOrders.length,
    });
  } catch (err: any) {
    console.error('[CRON Invite Feedbacks] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error', details: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleInvite(request);
}

export async function POST(request: Request) {
  return handleInvite(request);
}
