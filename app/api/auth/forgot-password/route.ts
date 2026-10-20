import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/auth/rateLimit';
import { sendGenericEmail } from '@/lib/email/mailer';
import { getPublicBaseUrl } from '@/lib/url';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const body = await req.json().catch(() => ({}));
    const email = (body?.email || '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich.' }, { status: 400 });
    }

    const ipKey = `forgot_pw:ip:${ip}`;
    const emailKey = `forgot_pw:email:${email}`;

    // 1. Check IP rate limit (stages after 5 free)
    const ipCheck = await checkRateLimit([ipKey]);
    if (!ipCheck.allowed) {
      const retryAfter = ipCheck.retryAfterSeconds || 30;
      return NextResponse.json(
        { error: 'rate_limited', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    // 2. Check per-email rate limit: max 3 requests per hour
    const emailCheckRes = await query(
      `SELECT attempts_count, last_attempt_at FROM public.auth_attempts WHERE key = $1`,
      [emailKey]
    );
    const emailRow = emailCheckRes.rows[0];
    if (emailRow) {
      const lastAt = new Date(emailRow.last_attempt_at);
      const isWithinHour = lastAt > new Date(Date.now() - 3600 * 1000);
      if (isWithinHour && emailRow.attempts_count >= 3) {
        const resetSeconds = Math.max(1, Math.ceil((lastAt.getTime() + 3600 * 1000 - Date.now()) / 1000));
        return NextResponse.json(
          { error: 'rate_limited', retryAfter: resetSeconds },
          { status: 429, headers: { 'Retry-After': String(resetSeconds) } }
        );
      }
    }

    // Record attempts
    await recordFailedAttempt({ ipKey, ip });
    await query(
      `INSERT INTO public.auth_attempts (key, attempt_type, attempts_count, last_attempt_at, created_at)
       VALUES ($1, 'forgot_pw_email', 1, NOW(), NOW())
       ON CONFLICT (key) DO UPDATE
       SET attempts_count = CASE
         WHEN public.auth_attempts.last_attempt_at < NOW() - INTERVAL '1 hour' THEN 1
         ELSE public.auth_attempts.attempts_count + 1
       END,
       last_attempt_at = NOW()`,
      [emailKey]
    );

    // Look up user
    const userRes = await query(
      'SELECT id, email, full_name, locale FROM public.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    const user = userRes.rows[0];

    if (user) {
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

      // Store in verification_tokens with new_email = 'RESET_PASSWORD'
      await query(
        `INSERT INTO public.verification_tokens (id, user_id, token, new_email, expires_at, created_at)
         VALUES (gen_random_uuid(), $1, $2, 'RESET_PASSWORD', $3, NOW())`,
        [user.id, resetToken, expiresAt]
      );

      const baseUrl = getPublicBaseUrl(req);
      const userLocale = user.locale || 'de';
      const resetUrl = `${baseUrl}/auth/callback?type=recovery&token=${resetToken}&locale=${userLocale}`;

      // Dispatch reset email
      try {
        await sendGenericEmail({
          to: user.email,
          subject: userLocale === 'de' ? 'Passwort zurücksetzen – PureSim' : 'Reset your password – PureSim',
          text: `Hallo,\n\nklicke auf diesen Link, um ein neues Passwort festzulegen:\n${resetUrl}\n\nDieser Link ist 1 Stunde gültig. Falls du dies nicht angefordert hast, ignoriere diese E-Mail.`,
          html: `<p>Hallo,</p><p>klicke auf den folgenden Button, um ein neues Passwort für dein PureSim-Konto festzulegen:</p><p><a href="${resetUrl}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:10px;text-decoration:none;font-weight:bold;display:inline-block;">Neues Passwort festlegen</a></p><p style="color:#64748b;font-size:12px;">Link gültig für 1 Stunde. Falls du dies nicht angefordert hast, ignoriere bitte diese Nachricht.</p>`,
        });
      } catch (mailErr) {
        console.error('[Forgot Password Email Error]', mailErr);
      }
    }

    // Always identical neutral response
    return NextResponse.json({
      success: true,
      message: 'Wenn die Adresse gültig ist, haben wir dir einen Link zum Zurücksetzen deines Passworts geschickt.',
    });
  } catch (err: any) {
    console.error('[Forgot Password Error]', err);
    return NextResponse.json({ error: 'Serverfehler' }, { status: 500 });
  }
}
