import { query } from '@/lib/db';
import { sendFeedbackInviteEmail } from '@/lib/email/mailer';
import { generateFeedbackToken } from './token';

/**
 * Core function to process pending feedback invitations for orders paid >= 48 hours ago.
 * Deduplicates by customer email to ensure 1 invitation per customer (latest order).
 * Marks all orders of the customer as review_invited = true upon dispatch.
 */
export async function processFeedbackInvites(limit: number = 50): Promise<{
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  totalEligible: number;
}> {
  try {
    // Query eligible unreviewed orders paid >= 24 hours ago.
    // Deduplicates by customer email to ensure in any single batch run, a customer receives at most 1 email (for their latest unreviewed order).
    // Every purchase can be reviewed, even if a customer has reviewed an earlier purchase in the past.
    const { rows: eligibleOrders } = await query(
      `WITH latest_unreviewed_orders AS (
         SELECT DISTINCT ON (LOWER(o.customer_email))
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
         AND COALESCE(o.payment_confirmed_at, o.created_at) <= NOW() - INTERVAL '24 hours'
         AND o.review_invited = false
         AND o.customer_email IS NOT NULL
         AND TRIM(o.customer_email) != ''
         AND NOT EXISTS (
           SELECT 1 FROM public.feedbacks f WHERE f.order_id = o.id
         )
         ORDER BY LOWER(o.customer_email), o.created_at DESC
       )
       SELECT 
         lo.id,
         lo.customer_email,
         lo.customer_name,
         lo.created_at,
         lo.locale,
         t.name AS tariff_name,
         t.country_name
       FROM latest_unreviewed_orders lo
       LEFT JOIN public.tariffs t ON t.id = lo.tariff_id
       LIMIT $1`,
      [limit]
    );

    if (eligibleOrders.length === 0) {
      return { 
        success: true, 
        message: 'Keine ausstehenden Feedback-Einladungen für Bestellungen älter als 24 Stunden gefunden.',
        sentCount: 0,
        failedCount: 0,
        totalEligible: 0,
      };
    }

    console.log(`[Feedback Invites] Processing ${eligibleOrders.length} eligible customer invitations (>= 24h)...`);
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net').replace(/\/$/, '');

    let sentCount = 0;
    let failedCount = 0;
    for (const order of eligibleOrders) {
      const token = generateFeedbackToken(order.id, order.customer_email);
      const inviteUrl = `${appUrl}/reviews/new?orderId=${encodeURIComponent(order.id)}&token=${encodeURIComponent(token)}`;

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

        // Mark this order and any uninvited older backlog orders of this customer as review_invited = true.
        // This guarantees:
        // 1. Exactly 1 reminder email is sent for this purchase / backlog (no duplicate spam).
        // 2. Any FUTURE new purchase (created_at > order.created_at) will have review_invited = false
        //    and will get its own reminder email 24h after purchase if not yet reviewed!
        await query(
          `UPDATE public.orders 
           SET review_invited = true 
           WHERE LOWER(customer_email) = LOWER($1) AND created_at <= $2`,
          [order.customer_email.trim(), order.created_at]
        );

        sentCount++;
      } catch (emailErr: any) {
        console.error(`[Feedback Invites] Failed to send email to ${order.customer_email}:`, emailErr.message);
        failedCount++;
      }
    }

    return {
      success: true,
      message: `${sentCount} Feedback-Einladungen erfolgreich versendet (${failedCount} fehlgeschlagen).`,
      sentCount,
      failedCount,
      totalEligible: eligibleOrders.length,
    };
  } catch (err: any) {
    console.error('[Feedback Invites] Error:', err.message);
    throw err;
  }
}
