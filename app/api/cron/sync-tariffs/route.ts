/**
 * GET /api/cron/sync-tariffs
 *
 * Protected by Authorization: Bearer <CRON_SECRET>
 * Triggers the full tariff sync from an external scheduler.
 * Runs synchronously (the cron caller waits for result).
 */
import { NextResponse } from 'next/server';
import { runSync }      from '@/lib/sync/run-sync';

export const runtime     = 'nodejs';
export const maxDuration = 300;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runSync();
  return NextResponse.json(result, { status: result.success ? 200 : 500 });
}
