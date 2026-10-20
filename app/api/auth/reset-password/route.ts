import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/auth/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `reset_pw_submit:ip:${ip}`;

    const check = await checkRateLimit([ipKey]);
    if (!check.allowed) {
      const retryAfter = check.retryAfterSeconds || 30;
      return NextResponse.json(
        { error: 'rate_limited', retryAfter },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, password } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Ungültiger oder fehlender Token.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' }, { status: 400 });
    }

    // Look up token
    const tokenRes = await query(
      `SELECT * FROM public.verification_tokens 
       WHERE token = $1 AND new_email = 'RESET_PASSWORD' AND expires_at > NOW()`,
      [token.trim()]
    );
    const tokenRow = tokenRes.rows[0];

    if (!tokenRow) {
      await recordFailedAttempt({ ipKey, ip });
      return NextResponse.json({ error: 'Dieser Link ist ungültig oder bereits abgelaufen.' }, { status: 400 });
    }

    // Hash new password and update user
    const passwordHash = hashPassword(password);
    await query(
      `UPDATE public.users 
       SET password_hash = $1, is_verified = TRUE, updated_at = NOW() 
       WHERE id = $2`,
      [passwordHash, tokenRow.user_id]
    );

    // Delete used token
    await query(`DELETE FROM public.verification_tokens WHERE id = $1`, [tokenRow.id]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[Reset Password Error]', err);
    return NextResponse.json({ error: 'Serverfehler beim Zurücksetzen des Passworts.' }, { status: 500 });
  }
}
