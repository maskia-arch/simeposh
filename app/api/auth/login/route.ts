import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { verifyPassword } from '@/lib/auth/password';
import { signJwt } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import {
  getClientIp,
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimitKeys,
  isSpecialAdminAccount,
} from '@/lib/auth/rateLimit';

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const body = await request.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Ungültige Anmeldedaten.' }, { status: 400 });
    }

    const trimmedEmail = String(email).trim().toLowerCase();
    const isAdmin = isSpecialAdminAccount(trimmedEmail);

    const accountKey = `login:acc:${trimmedEmail}:${ip}`;
    const globalIpKey = `login:global_ip:${ip}`;

    // Check rate limits
    const check = await checkRateLimit([accountKey, globalIpKey]);
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

    // Query database for the user row
    const dbRes = await query(
      'SELECT id, email, password_hash, full_name, is_verified FROM public.users WHERE email = $1 AND deleted_at IS NULL',
      [trimmedEmail]
    );
    const userRow = dbRes.rows[0];

    // Dummy password verify if user does not exist to guarantee uniform response time
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
    let isValid = false;
    if (userRow && userRow.password_hash) {
      isValid = verifyPassword(password, userRow.password_hash);
    } else {
      verifyPassword(password, dummyHash);
    }

    // Uniform authentication failure response (no user enumeration, neutral message)
    if (!userRow || !isValid || !userRow.is_verified) {
      const failed = await recordFailedAttempt({
        accountKey,
        globalIpKey,
        isAdmin,
        ip,
        email: trimmedEmail,
      });

      if (failed.retryAfterSeconds > 0) {
        return NextResponse.json(
          { error: 'rate_limited', retryAfter: failed.retryAfterSeconds },
          {
            status: 429,
            headers: {
              'Retry-After': String(failed.retryAfterSeconds),
            },
          }
        );
      }

      // Exact same neutral message for wrong password, unknown email, or unverified account
      return NextResponse.json(
        { error: 'Ungültige E-Mail-Adresse oder Passwort.' },
        { status: 401 }
      );
    }

    // Successful login: reset rate limit keys
    await resetRateLimitKeys([accountKey]);

    // Generate JWT token
    const token = await signJwt({
      id: userRow.id,
      email: userRow.email,
      fullName: userRow.full_name,
    });

    // Set secure HttpOnly session cookie
    const cookieStore = await cookies();
    cookieStore.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    const user = {
      id: userRow.id,
      email: userRow.email,
      user_metadata: {
        full_name: userRow.full_name,
      },
    };

    return NextResponse.json({ user });
  } catch (err: any) {
    console.error('[Login Error]', err);
    return NextResponse.json({ error: 'Ungültige Anmeldedaten.' }, { status: 500 });
  }
}
