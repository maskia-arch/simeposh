import { query } from '@/lib/db';
import { sendFeedbackInviteEmail } from '@/lib/email/mailer';
import { generateFeedbackToken } from './token';

/**
 * Core function to process pending feedback invitations for orders paid >= 48 hours ago.
 * Deduplicates by customer email to ensure 1 invitation per customer (latest order).
 * Marks all orders of the customer as review_invited = true upon dispatch.
 */
export async function processFeedbackInvites(limit: number = 100): Promise<{
  success: boolean;
  message: string;
  sentCount: number;
  failedCount: number;
  totalEligible: number;
}> {
  try {
    // Query eligible unreviewed purchases completed/paid >= 24 hours ago.
    // Deduplicates by customer email to ensure in any single batch run (e.g. 12:00 daily),
    // a customer receives at most 1 invitation (for their oldest unreviewed purchase).
    // Every verified purchase is invited once across subsequent days.
    // Double-defense: Checks review_invited = false, feedbacks table, AND sent_emails table to guarantee 0 duplicates.
    const { rows: eligibleOrders } = await query(
      `WITH candidate_purchases AS (
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
             AND s.metadata->>'order_id' = o.id::text
         )
         ORDER BY LOWER(o.customer_email), o.created_at ASC
       )
       SELECT 
         lo.id,
         lo.customer_email,
         lo.customer_name,
         lo.created_at,
         lo.locale,
         t.name AS tariff_name,
         t.country_name
       FROM candidate_purchases lo
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

        // Mark ONLY this specific order as review_invited = true by primary key.
        // This guarantees no other orders of the customer are prematurely marked.
        await query(
          `UPDATE public.orders 
           SET review_invited = true 
           WHERE id = $1`,
          [order.id]
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
