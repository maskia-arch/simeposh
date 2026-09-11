import { query } from '@/lib/db';

export interface EnqueueEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType: string;
  metadata?: Record<string, any>;
  priority?: number; // 1 = Critical / Transactional (eSIM, TopUp), 2 = Normal (Feedback, Marketing)
  reason?: string;
  nextAttemptAt?: Date;
}

export interface QueuedEmailRow {
  id: string;
  recipient_email: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  email_type: string;
  metadata: Record<string, any>;
  priority: number;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempts: number;
  last_error?: string | null;
  next_attempt_at: string;
  created_at: string;
}

/**
 * Persists an email into the database queue.
 * Performs deduplication for pending order emails to avoid duplicate enqueueing.
 */
export async function enqueueEmail(options: EnqueueEmailOptions): Promise<{ id: string; queued: boolean }> {
  const cleanTo = options.to.trim().toLowerCase();
  const priority = options.priority ?? (options.emailType.includes('lieferung') || options.emailType.includes('topup') ? 1 : 2);
  const metadata: Record<string, any> = {
    ...(options.metadata || {}),
    enqueued_reason: options.reason || 'quota_or_rate_limit',
  };

  const orderId = metadata.order_id;

  // Deduplication check: If an identical pending email already exists in the queue for this order & type, return existing
  if (orderId) {
    const { rows: existing } = await query(
      `SELECT id FROM public.email_queue
       WHERE recipient_email = $1
         AND email_type = $2
         AND metadata->>'order_id' = $3
         AND status = 'pending'
       LIMIT 1`,
      [cleanTo, options.emailType, String(orderId)]
    );

    if (existing.length > 0) {
      console.log(`[email_queue] Email for order ${orderId} (${options.emailType}) is already queued (id: ${existing[0].id}).`);
      return { id: existing[0].id, queued: true };
    }
  }

  const nextAttemptAt = options.nextAttemptAt || new Date();

  const { rows } = await query(
    `INSERT INTO public.email_queue (
       recipient_email,
       subject,
       body_html,
       body_text,
       email_type,
       metadata,
       priority,
       status,
       next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
     RETURNING id`,
    [
      cleanTo,
      options.subject,
      options.html,
      options.text || null,
      options.emailType,
      JSON.stringify(metadata),
      priority,
      nextAttemptAt.toISOString(),
    ]
  );

  const id = rows[0]?.id;
  console.log(`[email_queue] Enqueued email to ${cleanTo} (type: ${options.emailType}, priority: ${priority}, id: ${id})`);
  return { id, queued: true };
}

/**
 * Returns summary counts of items in the email queue.
 */
export async function getQueueStats(): Promise<{
  totalPending: number;
  transactionalPending: number;
  marketingPending: number;
  failedCount: number;
}> {
  const { rows } = await query(
    `SELECT 
       count(*) FILTER (WHERE status = 'pending') as total_pending,
       count(*) FILTER (WHERE status = 'pending' AND priority = 1) as transactional_pending,
       count(*) FILTER (WHERE status = 'pending' AND priority > 1) as marketing_pending,
       count(*) FILTER (WHERE status = 'failed') as failed_count
     FROM public.email_queue`
  );

  return {
    totalPending: parseInt(rows[0]?.total_pending || '0', 10),
    transactionalPending: parseInt(rows[0]?.transactional_pending || '0', 10),
    marketingPending: parseInt(rows[0]?.marketing_pending || '0', 10),
    failedCount: parseInt(rows[0]?.failed_count || '0', 10),
  };
}
