import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendVerificationEmailForUser } from '@/lib/email/verification';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      const url = new URL(req.url);
      const keyParam = url.searchParams.get('key');
      if (keyParam !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Fetch all unverified accounts registered in the last 30 days
    const unverifiedRes = await query(
      `SELECT id, email, locale, created_at 
       FROM public.users 
       WHERE (is_verified IS FALSE OR is_verified IS NULL) 
         AND deleted_at IS NULL 
         AND created_at > NOW() - INTERVAL '30 days'
       ORDER BY created_at DESC`
    );

    const unverifiedUsers = unverifiedRes.rows;
    let sentCount = 0;
    const errors: string[] = [];

    for (const user of unverifiedUsers) {
      try {
        // Skip if a token was already created/sent in the last 15 minutes to prevent spamming
        const recentRes = await query(
          `SELECT 1 FROM public.verification_tokens 
           WHERE user_id = $1 AND created_at > NOW() - INTERVAL '15 minutes'`,
          [user.id]
        );

        if (recentRes.rows.length > 0) {
          continue;
        }

        // Send activation email
        await sendVerificationEmailForUser(user.id, user.email, undefined, user.locale || 'de');
        sentCount++;
        console.log(`[cron/resend-verifications] Sent activation email to ${user.email} (id: ${user.id})`);
      } catch (err: any) {
        console.error(`[cron/resend-verifications] Failed to send email to ${user.email}:`, err);
        errors.push(`${user.email}: ${err.message}`);
      }
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      unverifiedTotal: unverifiedUsers.length,
      emailsSent: sentCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    console.error('[cron/resend-verifications Error]', err);
    return NextResponse.json({ error: err.message || 'Cron execution failed' }, { status: 500 });
  }
}
