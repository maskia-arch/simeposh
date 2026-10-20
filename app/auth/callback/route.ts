import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { signJwt } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { getPublicBaseUrl } from '@/lib/url';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const baseUrl = getPublicBaseUrl(request);
  const { searchParams } = new URL(request.url);

  const token = searchParams.get('token') || searchParams.get('code');
  const type = searchParams.get('type');
  const locale = searchParams.get('locale') || 'de';
  const prefix = locale === 'de' ? '' : `/${locale}`;

  if (!token) {
    // Missing token
    return NextResponse.redirect(new URL(`${prefix}/login?error=invalid_or_expired_link`, baseUrl));
  }

  // 1. Password Recovery Flow
  if (type === 'recovery') {
    const tokenRes = await query(
      `SELECT * FROM public.verification_tokens 
       WHERE token = $1 AND new_email = 'RESET_PASSWORD' AND expires_at > NOW()`,
      [token]
    );
    const row = tokenRes.rows[0];
    if (!row) {
      return NextResponse.redirect(new URL(`${prefix}/login?error=invalid_or_expired_link`, baseUrl));
    }
    // Redirect to reset password page with the token
    return NextResponse.redirect(new URL(`${prefix}/reset-password?token=${encodeURIComponent(token)}`, baseUrl));
  }

  // 2. Email verification / Signup / Email change confirmation
  const tokenRes = await query(
    `SELECT * FROM public.verification_tokens 
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );
  const row = tokenRes.rows[0];

  if (!row) {
    return NextResponse.redirect(new URL(`${prefix}/login?error=invalid_or_expired_link`, baseUrl));
  }

  const userId = row.user_id;
  const newEmail = row.new_email;

  if (newEmail && newEmail !== 'RESET_PASSWORD') {
    // Email change verification
    await query(
      'UPDATE public.users SET email = $1, is_verified = TRUE, updated_at = NOW() WHERE id = $2',
      [newEmail, userId]
    );
    await query('DELETE FROM public.verification_tokens WHERE id = $1', [row.id]);

    const cookieStore = await cookies();
    cookieStore.delete('session_token');

    return NextResponse.redirect(new URL(`${prefix}/login?verified=true&emailChanged=true`, baseUrl));
  } else if (!newEmail) {
    // Standard registration verification
    await query(
      'UPDATE public.users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1',
      [userId]
    );
    await query('DELETE FROM public.verification_tokens WHERE id = $1', [row.id]);

    const userRes = await query(
      'SELECT id, email, full_name FROM public.users WHERE id = $1',
      [userId]
    );
    const user = userRes.rows[0];

    if (user) {
      const sessionJwt = await signJwt({
        id: user.id,
        email: user.email,
        fullName: user.full_name,
      });

      const cookieStore = await cookies();
      cookieStore.set('session_token', sessionJwt, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60,
      });
    }

    return NextResponse.redirect(new URL(`${prefix}/dashboard?verified=true`, baseUrl));
  }

  return NextResponse.redirect(new URL(`${prefix}/login`, baseUrl));
}
