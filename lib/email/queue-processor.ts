import { query } from '@/lib/db';
import { getEmailQuotaStatus } from './quota';
import { sendMailDirect } from './mailer';
import type { QueuedEmailRow } from './queue';

export interface QueueProcessResult {
  success: boolean;
  message: string;
  processedCount: number;
  sentCount: number;
  failedCount: number;
  deferredCount: number;
  remainingPending: number;
}

/**
 * Dispatches queued emails up to the available daily (200) and monthly (3000) quota.
 * Prioritizes transactional emails (priority = 1) over marketing/invitation emails.
 * Introduces rate-limiting delays between dispatches to stay well within Resend thresholds.
 */
export async function processEmailQueue(batchLimit: number = 100): Promise<QueueProcessResult> {
  try {
    const quota = await getEmailQuotaStatus();

    if (quota.isDailyLimitReached || quota.isMonthlyLimitReached) {
      console.warn(
        `[email_queue] Quota reached (dailySent: ${quota.dailySent}/200, monthlySent: ${quota.monthlySent}/3000). Deferring queue processing until reset at ${quota.nextResetAt.toISOString()}`
      );
      const { rows: pendingRows } = await query(
        `SELECT count(*) as count FROM public.email_queue WHERE status = 'pending'`
      );
      return {
        success: true,
        message: `Quota voll (${quota.dailySent}/200 Tag, ${quota.monthlySent}/3000 Monat). Warteschlange pausiert bis 03:00 Uhr.`,
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        deferredCount: parseInt(pendingRows[0]?.count || '0', 10),
        remainingPending: parseInt(pendingRows[0]?.count || '0', 10),
      };
    }

    // Determine how many emails we can safely send in this run
    const maxCanSend = Math.min(batchLimit, quota.dailyRemaining, quota.monthlyRemaining);
    if (maxCanSend <= 0) {
      return {
        success: true,
        message: 'Kein Kontingent für diese Ausführung verfügbar.',
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        deferredCount: 0,
        remainingPending: 0,
      };
    }

    // Fetch batch ordered by priority ASC (1 = eSIM/TopUp first), then oldest created_at first
    const { rows: batch } = await query(
      `SELECT 
         id,
         recipient_email,
         subject,
         body_html,
         body_text,
         email_type,
         metadata,
         priority,
         status,
         attempts,
         last_error,
         next_attempt_at,
         created_at
       FROM public.email_queue
       WHERE status = 'pending'
         AND next_attempt_at <= NOW()
       ORDER BY priority ASC, created_at ASC
       LIMIT $1`,
      [maxCanSend]
    );

    if (batch.length === 0) {
      return {
        success: true,
        message: 'Keine ausstehenden E-Mails in der Warteschlange.',
        processedCount: 0,
        sentCount: 0,
        failedCount: 0,
        deferredCount: 0,
        remainingPending: 0,
      };
    }

    console.log(`[email_queue] Processing ${batch.length} queued emails (Priority 1 first)...`);

    let sentCount = 0;
    let failedCount = 0;
    let deferredCount = 0;

    for (const item of batch as QueuedEmailRow[]) {
      // Mark as processing
      await query(
        `UPDATE public.email_queue SET status = 'processing', updated_at = NOW() WHERE id = $1`,
        [item.id]
      );

      try {
        await sendMailDirect({
          to: item.recipient_email,
          subject: item.subject,
          html: item.body_html,
          text: item.body_text || undefined,
          emailType: item.email_type,
          metadata: {
            ...(item.metadata || {}),
            dispatched_from_queue: true,
            queue_item_id: item.id,
          },
        });

        // Mark as sent
        await query(
          `UPDATE public.email_queue 
           SET status = 'sent', updated_at = NOW() 
           WHERE id = $1`,
          [item.id]
        );
        sentCount++;

        // Delay 250ms between sends to avoid Resend 2 requests/sec burst limit
        await new Promise((resolve) => setTimeout(resolve, 250));
      } catch (sendErr: any) {
        const errorMsg = sendErr?.message || String(sendErr);
        console.error(`[email_queue] Failed to send queued email ${item.id} to ${item.recipient_email}:`, errorMsg);

        const isQuotaOrRateLimit =
          errorMsg.includes('429') ||
          errorMsg.includes('quota') ||
          errorMsg.includes('limit') ||
          errorMsg.includes('Too Many Requests');

        if (isQuotaOrRateLimit) {
          // Put back to pending and schedule for next 03:00 reset
          await query(
            `UPDATE public.email_queue 
             SET status = 'pending',
                 attempts = attempts + 1,
                 last_error = $2,
                 next_attempt_at = $3,
                 updated_at = NOW()
             WHERE id = $1`,
            [item.id, errorMsg, quota.nextResetAt.toISOString()]
          );
          deferredCount++;
          console.warn('[email_queue] Resend rate limit hit during queue run. Stopping batch early until 03:00 reset.');
          break; // Stop loop immediately
        } else {
          const nextAttempts = item.attempts + 1;
          const isPermanent = nextAttempts >= 5;
          await query(
            `UPDATE public.email_queue 
             SET status = $2,
                 attempts = $3,
                 last_error = $4,
                 next_attempt_at = NOW() + INTERVAL '10 minutes',
                 updated_at = NOW()
             WHERE id = $1`,
            [item.id, isPermanent ? 'failed' : 'pending', nextAttempts, errorMsg]
          );
          failedCount++;
        }
      }
    }

    const { rows: remainingRows } = await query(
      `SELECT count(*) as count FROM public.email_queue WHERE status = 'pending'`
    );
    const remainingPending = parseInt(remainingRows[0]?.count || '0', 10);

    return {
      success: true,
      message: `${sentCount} Warteschlangen-E-Mails erfolgreich versendet (${failedCount} fehlgeschlagen, ${deferredCount} vertagt, ${remainingPending} verbleibend).`,
      processedCount: sentCount + failedCount + deferredCount,
      sentCount,
      failedCount,
      deferredCount,
      remainingPending,
    };
  } catch (err: any) {
    console.error('[email_queue] Error processing queue:', err.message);
    throw err;
  }
}
