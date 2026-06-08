/**
 * POST /api/admin/sync
 *
 * Triggers the tariff sync from the Admin UI.
 * Verifies admin session, then runs the sync directly (no internal HTTP call).
 */
import { NextResponse }    from 'next/server';
import { verifyAdminApi }  from '@/lib/admin/auth';
import { runSync }         from '@/lib/sync/run-sync';

export const runtime     = 'nodejs';
export const maxDuration = 300;

export async function POST() {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const result = await runSync();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
