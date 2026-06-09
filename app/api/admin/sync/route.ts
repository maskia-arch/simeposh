/**
 * POST /api/admin/sync
 *
 * Starts the tariff sync in the background and returns 202 immediately.
 * The frontend polls /api/admin/sync/status?syncId=… for progress.
 */
import { NextResponse }   from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { runSync }        from '@/lib/sync/run-sync';

export const runtime     = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  // Generate a stable ID the client can use to poll status
  const syncId = new Date().toISOString();

  // Fire-and-forget: runSync writes its own sync_log row keyed by syncId
  // Node.js keeps the promise alive after we return the 202 response.
  runSync(syncId).catch((err) =>
    console.error('[sync] Unhandled background error:', err)
  );

  return NextResponse.json({ syncId, status: 'started' }, { status: 202 });
}
