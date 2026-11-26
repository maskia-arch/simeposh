import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';
import { getPublicBaseUrl } from '@/lib/url';
import { createServiceClient } from '@/lib/supabase/server';
import { claimGuestOrders } from '@/lib/customers';
import { getReconciledUserCashAccount } from '@/lib/esim-cash';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const baseUrl = getPublicBaseUrl(req);

  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/dashboard?verified=false&error=missing_token', baseUrl));
    }

    // Query for verification token in database
    const tokenRes = await query(
      'SELECT * FROM public.verification_tokens WHERE token = $1 AND expires_at > NOW()',
      [token]
    );
    const tokenRow = tokenRes.rows[0];

    if (!tokenRow) {
      return NextResponse.redirect(new URL('/dashboard?verified=false&error=expired_or_invalid', baseUrl));
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

      // 2. Sync eSIM Cash account & transactions to the verified new email
      try {
        const cleanNewEmail = String(newEmail).trim().toLowerCase();
        await getReconciledUserCashAccount(userId, cleanNewEmail, { createIfMissing: false });
        await query(
          'UPDATE public.esim_cash_transactions SET email = $1 WHERE user_id = $2',
          [cleanNewEmail, userId]
        );
      } catch (cashSyncErr) {
        console.error('[Verify Email Token] eSIM Cash sync error:', cashSyncErr);
      }

      // 3. Delete the used verification token
      await query('DELETE FROM public.verification_tokens WHERE id = $1', [tokenRow.id]);

      // 4. Clear session cookie so they have to log in again with new email
      const cookieStore = await cookies();
      cookieStore.delete('session_token');

      return NextResponse.redirect(new URL('/login?verified=true&emailChanged=true', baseUrl));
    } else {
      // ── Standard signup verification flow ──
      // 1. Update verification state to true
      const verifiedRes = await query(
        'UPDATE public.users SET is_verified = TRUE, updated_at = NOW() WHERE id = $1 RETURNING email',
        [userId]
      );
      const verifiedEmail = verifiedRes.rows[0]?.email;
      if (verifiedEmail) {
        try {
          const service = createServiceClient();
          await claimGuestOrders(service, userId, verifiedEmail);
          await getReconciledUserCashAccount(userId, verifiedEmail, { createIfMissing: false });
        } catch (claimErr) {
          console.error('[Verify Email Token] Guest claim error:', claimErr);
        }
      }

      // 2. Delete the used verification token
      await query('DELETE FROM public.verification_tokens WHERE id = $1', [tokenRow.id]);

      return NextResponse.redirect(new URL('/login?verified=true', baseUrl));
    }
  } catch (err: any) {
    console.error('[Verify Email Token Error]', err);
    return NextResponse.redirect(new URL('/dashboard?verified=false&error=server_error', baseUrl));
  }
}

