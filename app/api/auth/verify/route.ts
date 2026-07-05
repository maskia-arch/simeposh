import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/dashboard?verified=false&error=missing_token', req.url));
    }

    // Query for verification token in database
    const tokenRes = await query(
      'SELECT * FROM public.verification_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    const tokenRow = tokenRes.rows[0];

    if (!tokenRow) {
      return NextResponse.redirect(new URL('/dashboard?verified=false&error=expired_or_invalid', req.url));
    }

    const userId = tokenRow.user_id;
    const newEmail = tokenRow.new_email;

    if (newEmail) {
      // ── Email change verification flow ──
      // 1. Update the email and set verified status to true
      await query(
        'UPDATE public.users SET email = $1, is_verified = TRUE, updated_at = NOW() WHERE id = $2',
        [newEmail, userId]
      );

      // 2. Delete the used verification token
      await query('DELETE FROM public.verification_tokens WHERE id = $1', [tokenRow.id]);

      // 3. Clear session cookie so they have to log in again with new email
      const cookieStore = await cookies();
      cookieStore.delete('session_token');

      return NextResponse.redirect(new URL('/login?verified=true&emailChanged=true', req.url));
    } else {
      // ── Standard signup verification flow ──
      // 1. Update verification state to true
      await query('UPDATE public.users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1', [userId]);

      // 2. Delete the used verification token
      await query('DELETE FROM public.verification_tokens WHERE id = $1', [tokenRow.id]);

      return NextResponse.redirect(new URL('/dashboard?verified=true', req.url));
    }
  } catch (err: any) {
    console.error('[Verify Email Token Error]', err);
    return NextResponse.redirect(new URL('/dashboard?verified=false&error=server_error', req.url));
  }
}
