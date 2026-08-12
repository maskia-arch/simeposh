/**
 * GET / POST /api/cron/crypto-watch
 *
 * Scheduled or on-demand background worker that monitors all active crypto sessions
 * (pending, detected, partially_paid).
 * Performs direct blockchain verification and automatically fulfills paid orders
 * without requiring the local pure-wallet gateway or admin dashboard to be online.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { syncAllActiveCryptoSessions } from '@/app/api/crypto/session/[id]/route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const webhookSecret = process.env.SHOP_WEBHOOK_SECRET;

  const authHeader = request.headers.get('authorization');
  const isAuthorized =
    !cronSecret ||
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === `Bearer ${webhookSecret}`;

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = createServiceClient();
    const syncedCount = await syncAllActiveCryptoSessions(db);
    return NextResponse.json({ ok: true, synced_count: syncedCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/crypto-watch] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
