/**
 * GET /api/cron/crypto-watch
 *
 * The blockchain watcher pass. Run this on a short interval (e.g. every 30–60s)
 * from an external scheduler with the CRON_SECRET bearer token:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/crypto-watch
 */
import { NextResponse } from 'next/server';
import { runWatcher }   from '@/lib/crypto/watcher';

export const runtime     = 'nodejs';
export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  try {
    const result = await runWatcher();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/crypto-watch] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
