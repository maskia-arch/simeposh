import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { query } from '@/lib/db';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import {
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimitKeys,
} from '@/lib/auth/rateLimit';
import { sendPasswordChangedEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.id || !sessionUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const { currentPassword, newPassword, locale } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Bitte alle Felder ausfüllen.' }, { status: 400 });
    }

    const trimmedEmail = sessionUser.email.trim().toLowerCase();
    const accountKey = `pwd_change:acc:${trimmedEmail}:${ip}`;
    const globalIpKey = `pwd_change:ip:${ip}`;

    // Rate-limit checking
    const limitCheck = await checkRateLimit([accountKey, globalIpKey]);
    if (!limitCheck.allowed) {
      const retryAfter = limitCheck.retryAfterSeconds || 30;
      return NextResponse.json(
        { error: 'rate_limited', retryAfter },
        {
          status: 429,
          headers: { 'Retry-After': String(retryAfter) },
        }
      );
    }

    // Minimum 8 characters rule
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return NextResponse.json(
        { error: 'settings_pwd_too_short', message: 'Das neue Passwort muss mindestens 8 Zeichen lang sein.' },
        { status: 400 }
      );
    }

    // Fetch user hash
    const userRes = await query(
      'SELECT id, email, password_hash, full_name FROM public.users WHERE id = $1 AND deleted_at IS NULL',
      [sessionUser.id]
    );
    const userRow = userRes.rows[0];

    if (!userRow || !userRow.password_hash) {
      return NextResponse.json({ error: 'Benutzerkonto nicht gefunden.' }, { status: 404 });
    }

    const isCurrentValid = verifyPassword(currentPassword, userRow.password_hash);
    if (!isCurrentValid) {
      const failed = await recordFailedAttempt({
        accountKey,
        globalIpKey,
        isAdmin: false,
        ip,
        email: trimmedEmail,
      });

      if (failed.retryAfterSeconds > 0) {
        return NextResponse.json(
          { error: 'rate_limited', retryAfter: failed.retryAfterSeconds },
          {
            status: 429,
            headers: { 'Retry-After': String(failed.retryAfterSeconds) },
          }
        );
      }

      return NextResponse.json(
        { error: 'settings_pwd_wrong_current', message: 'Das aktuelle Passwort ist nicht korrekt.' },
        { status: 400 }
      );
    }

    // Success: update password hash
    const newHash = hashPassword(newPassword);
    await query(
      'UPDATE public.users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newHash, sessionUser.id]
    );

    // Reset rate limit key on success
    await resetRateLimitKeys([accountKey]);

    // Revoke all other active sessions for this user
    if (sessionUser.sessionId) {
      await query(
        `UPDATE public.user_sessions 
         SET revoked_at = NOW() 
         WHERE user_id = $1 AND id != $2 AND revoked_at IS NULL`,
        [sessionUser.id, sessionUser.sessionId]
      );
    } else {
      await query(
        `UPDATE public.user_sessions 
         SET revoked_at = NOW() 
         WHERE user_id = $1 AND revoked_at IS NULL`,
        [sessionUser.id]
      );
    }

    // Send confirmation email in user language
    try {
      await sendPasswordChangedEmail({
        to: userRow.email,
        locale: locale || 'de',
        userName: userRow.full_name || undefined,
      });
    } catch (mailErr) {
      console.error('[ChangePassword] Failed to send notification email:', mailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[ChangePassword Exception]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler beim Ändern des Passworts' }, { status: 500 });
  }
}
