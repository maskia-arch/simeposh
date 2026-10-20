import { query } from '@/lib/db';
import { sendTicketAdminAlertEmail } from '@/lib/email/mailer';

export function getClientIp(req: Request): string {
  const cfConnectingIp = req.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const xForwardedFor = req.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    const first = xForwardedFor.split(',')[0].trim();
    if (first) return first;
  }

  const xRealIp = req.headers.get('x-real-ip');
  if (xRealIp) return xRealIp.trim();

  return '127.0.0.1';
}

export function getCustomerDelaySeconds(attemptNumber: number): number {
  if (attemptNumber <= 5) return 0;
  if (attemptNumber === 6) return 30;
  if (attemptNumber === 7) return 60;
  if (attemptNumber === 8) return 300; // 5 mins
  return 900; // max 15 mins
}

export function getAdminDelaySeconds(attemptNumber: number): number {
  if (attemptNumber < 3) return 0;
  return 900; // 15 mins
}

export function isSpecialAdminAccount(email: string): boolean {
  const norm = (email || '').trim().toLowerCase();
  const configured = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kaozpicks@gmail.com').toLowerCase();
  return norm === configured;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  retryAfterSeconds?: number;
  reason?: string;
}

/**
 * Checks whether an attempt is currently blocked.
 */
export async function checkRateLimit(keys: string[]): Promise<RateLimitCheckResult> {
  const now = new Date();
  for (const k of keys) {
    const res = await query(
      `SELECT attempts_count, last_attempt_at, blocked_until 
       FROM public.auth_attempts 
       WHERE key = $1`,
      [k]
    );
    const row = res.rows[0];
    if (row && row.blocked_until) {
      const blockedUntil = new Date(row.blocked_until);
      if (blockedUntil > now) {
        const retryAfterSeconds = Math.max(1, Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000));
        return { allowed: false, retryAfterSeconds, reason: k };
      }
    }
  }
  return { allowed: true };
}

/**
 * Records a failed attempt for a set of keys.
 */
export async function recordFailedAttempt(
  opts: {
    accountKey?: string;
    ipKey?: string;
    globalIpKey?: string;
    isAdmin?: boolean;
    ip: string;
    email?: string;
  }
): Promise<{ retryAfterSeconds: number }> {
  const now = new Date();
  let maxWait = 0;

  // 1. Account + IP key or Account key
  if (opts.accountKey) {
    const res = await query(
      `INSERT INTO public.auth_attempts (key, attempt_type, attempts_count, last_attempt_at, created_at)
       VALUES ($1, 'account', 1, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
       SET attempts_count = CASE 
         WHEN public.auth_attempts.last_attempt_at < NOW() - INTERVAL '1 hour' THEN 1
         ELSE public.auth_attempts.attempts_count + 1
       END,
       last_attempt_at = NOW()
       RETURNING attempts_count`,
      [opts.accountKey]
    );
    const count = res.rows[0]?.attempts_count || 1;
    const delay = opts.isAdmin ? getAdminDelaySeconds(count) : getCustomerDelaySeconds(count);
    if (delay > 0) {
      const blockedUntil = new Date(now.getTime() + delay * 1000);
      await query(
        `UPDATE public.auth_attempts SET blocked_until = $1 WHERE key = $2`,
        [blockedUntil, opts.accountKey]
      );
      if (delay > maxWait) maxWait = delay;
    }

    // Admin alert threshold: > 10 attempts per hour
    if (opts.isAdmin && count > 10) {
      try {
        await sendTicketAdminAlertEmail({
          ticketNumber: 'SECURITY-ALERT',
          customerEmail: opts.email || 'kaozpicks@gmail.com',
          customerName: 'Marcel / Admin Security System',
          subject: `⚠️ Sicherheitswarnung: Mehr als 10 fehlgeschlagene Admin-Loginversuche`,
          description: `Es wurden innerhalb einer Stunde ${count} fehlerhafte Login-Versuche auf das Admin-Konto (${opts.email}) von IP ${opts.ip} festgestellt. Die IP ist vorübergehend gesperrt.`,
          category: 'Security',
        });
      } catch (err) {
        console.error('[Admin Security Alert Email Failed]', err);
      }
    }
  }

  // 2. IP key (for registration / resend / password reset: 5 free, then tiers)
  if (opts.ipKey) {
    const res = await query(
      `INSERT INTO public.auth_attempts (key, attempt_type, attempts_count, last_attempt_at, created_at)
       VALUES ($1, 'ip_scoped', 1, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
       SET attempts_count = CASE 
         WHEN public.auth_attempts.last_attempt_at < NOW() - INTERVAL '1 hour' THEN 1
         ELSE public.auth_attempts.attempts_count + 1
       END,
       last_attempt_at = NOW()
       RETURNING attempts_count`,
      [opts.ipKey]
    );
    const count = res.rows[0]?.attempts_count || 1;
    const delay = getCustomerDelaySeconds(count);
    if (delay > 0) {
      const blockedUntil = new Date(now.getTime() + delay * 1000);
      await query(
        `UPDATE public.auth_attempts SET blocked_until = $1 WHERE key = $2`,
        [blockedUntil, opts.ipKey]
      );
      if (delay > maxWait) maxWait = delay;
    }
  }

  // 3. Global IP Key across all accounts (defense against credential stuffing across many emails)
  // Threshold: 20 failed attempts per hour across all accounts, then same wait stages
  if (opts.globalIpKey) {
    const res = await query(
      `INSERT INTO public.auth_attempts (key, attempt_type, attempts_count, last_attempt_at, created_at)
       VALUES ($1, 'global_ip', 1, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
       SET attempts_count = CASE 
         WHEN public.auth_attempts.last_attempt_at < NOW() - INTERVAL '1 hour' THEN 1
         ELSE public.auth_attempts.attempts_count + 1
       END,
       last_attempt_at = NOW()
       RETURNING attempts_count`,
      [opts.globalIpKey]
    );
    const count = res.rows[0]?.attempts_count || 1;
    if (count > 20) {
      const stageAttempt = 5 + (count - 20); // 21 -> 6 (30s), 22 -> 7 (60s), 23 -> 8 (300s), etc.
      const delay = getCustomerDelaySeconds(stageAttempt);
      if (delay > 0) {
        const blockedUntil = new Date(now.getTime() + delay * 1000);
        await query(
          `UPDATE public.auth_attempts SET blocked_until = $1 WHERE key = $2`,
          [blockedUntil, opts.globalIpKey]
        );
        if (delay > maxWait) maxWait = delay;
      }
    }
  }

  return { retryAfterSeconds: maxWait };
}

/**
 * Resets the attempt counter upon successful login.
 */
export async function resetRateLimitKeys(keys: string[]): Promise<void> {
  if (!keys || keys.length === 0) return;
  for (const k of keys) {
    await query(`DELETE FROM public.auth_attempts WHERE key = $1`, [k]);
  }
}
