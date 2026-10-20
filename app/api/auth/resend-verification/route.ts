import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { query } from '@/lib/db';
import { sendVerificationEmailForUser } from '@/lib/email/verification';
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/auth/rateLimit';

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `resend_verification:ip:${ip}`;

    // Rate-limiting check per IP (5 free, then stages)
    const check = await checkRateLimit([ipKey]);
    if (!check.allowed) {
      const retryAfter = check.retryAfterSeconds || 30;
      return NextResponse.json(
        { error: 'rate_limited', retryAfter },
        {
          status: 429,
          headers: {
            'Retry-After': String(retryAfter),
          },
        }
      );
    }

    let email: string | undefined;

    const body = await req.json().catch(() => ({}));
    if (body?.email && typeof body.email === 'string') {
      email = body.email.trim().toLowerCase();
    }

    // If no email in body, try to get from logged-in session
    if (!email) {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user && user.email) {
        email = user.email.toLowerCase();
      }
    }

    if (!email) {
      return NextResponse.json({ error: 'E-Mail-Adresse ist erforderlich.' }, { status: 400 });
    }

    // Record rate limit attempt for IP
    await recordFailedAttempt({ ipKey, ip });

    // Look up user in database
    const userRes = await query(
      'SELECT id, email, is_verified, locale FROM public.users WHERE email = $1 AND deleted_at IS NULL',
      [email]
    );
    const userRow = userRes.rows[0];

    if (!userRow) {
      // Neutral response to prevent email enumeration attacks
      return NextResponse.json({
        success: true,
        message: 'Wenn die Adresse gültig ist, haben wir dir eine E-Mail geschickt.',
      });
    }

    if (userRow.is_verified) {
      return NextResponse.json({
        success: true,
        message: 'Wenn die Adresse gültig ist, haben wir dir eine E-Mail geschickt.',
      });
    }

    const userId: string = userRow.id;
    const locale: string = userRow.locale || 'de';

    // Send verification email using unified helper
    await sendVerificationEmailForUser(userId, userRow.email, req, locale);

    return NextResponse.json({
      success: true,
      message: 'Wenn die Adresse gültig ist, haben wir dir eine E-Mail geschickt.',
    });
  } catch (err: any) {
    console.error('[Resend Verification Error]', err);
    return NextResponse.json({ error: 'Serverfehler beim Senden' }, { status: 500 });
  }
}
