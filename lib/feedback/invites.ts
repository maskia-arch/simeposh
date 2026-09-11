import { query } from '@/lib/db';
import { sendFeedbackInviteEmail } from '@/lib/email/mailer';
import { generateFeedbackToken } from './token';

/**
 * Core function to process pending feedback invitations for orders paid >= 48 hours ago.
 * Deduplicates by customer email to ensure 1 invitation per customer (latest order).
 * Marks all orders of the customer as review_invited = true upon dispatch.
 */
export async function processFeedbackInvites(limit: number = 20): Promise<{
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
    // Double-defense: Checks both review_invited = false, feedbacks table, AND sent_emails table to guarantee 0 duplicates.
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
         AND NOT EXISTS (
           SELECT 1 FROM public.sent_emails s 
           WHERE s.status = 'sent'
             AND (s.email_type = 'feedback_einladung' OR s.subject LIKE '%Erfahrung%' OR s.subject LIKE '%experience%')
             AND (s.metadata->>'order_id' = o.id::text OR LOWER(s.recipient_email) = LOWER(o.customer_email))
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
        // Guarantees:
        // 1. Matches order.id directly so microsecond JS serialization cannot prevent the update.
        // 2. Older orders are matched using native DB timestamp comparison.
        await query(
          `UPDATE public.orders 
           SET review_invited = true 
           WHERE id = $1 
              OR (LOWER(customer_email) = LOWER($2) AND created_at <= (SELECT created_at FROM public.orders WHERE id = $1))`,
          [order.id, order.customer_email.trim().toLowerCase()]
        );

        sentCount++;
      } catch (emailErr: any) {
        const msg = emailErr?.message || String(emailErr);
        console.error(`[Feedback Invites] Failed to send email to ${order.customer_email}:`, msg);
        failedCount++;

        // If daily limit / rate limit reached from Resend, abort batch immediately to save quota
        if (msg.includes('429') || msg.includes('limit') || msg.includes('quota') || msg.includes('Too Many Requests')) {
          console.warn('[Feedback Invites] Daily email quota or rate limit reached. Stopping batch early.');
          break;
        }
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
