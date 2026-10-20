import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { query } from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { sendVerificationEmailForUser } from '@/lib/email/verification';
import { getClientIp, checkRateLimit, recordFailedAttempt } from '@/lib/auth/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const ipKey = `register:ip:${ip}`;

    // Rate-limiting check per IP (5 free, then 30s, 60s, 300s, 900s)
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

    const { email, password, fullName } = await request.json().catch(() => ({}));

    if (!email || !password) {
      return NextResponse.json({ error: 'E-Mail und Passwort sind erforderlich' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein' }, { status: 400 });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const checkRes = await query('SELECT id, is_verified FROM public.users WHERE email = $1', [trimmedEmail]);
    if (checkRes.rows.length > 0) {
      // Record rate limit attempt
      await recordFailedAttempt({ ipKey, ip });

      // Neutral response to avoid email enumeration
      return NextResponse.json({
        success: true,
        message: 'Wenn die Adresse gültig ist, haben wir dir eine E-Mail geschickt.',
        requiresVerification: true,
      });
    }

    // Record attempt for IP
    await recordFailedAttempt({ ipKey, ip });

    // Generate UUID and hash password
    const userId = crypto.randomUUID();
    const passwordHash = hashPassword(password);

    // Insert user into local DB with is_verified = FALSE
    await query(
      `INSERT INTO public.users (id, email, password_hash, full_name, is_verified, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())`,
      [userId, trimmedEmail, passwordHash, fullName || '']
    );

    // Dispatch activation email immediately
    try {
      await sendVerificationEmailForUser(userId, trimmedEmail, request);
    } catch (mailErr) {
      console.error('[Register Email Dispatch Error]', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Wenn die Adresse gültig ist, haben wir dir eine E-Mail geschickt.',
      requiresVerification: true,
    });
  } catch (err: any) {
    console.error('[Registration Error]', err);
    return NextResponse.json({ error: 'Interner Serverfehler während der Registrierung' }, { status: 500 });
  }
}
