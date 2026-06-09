/**
 * GET /api/cron/rates
 *
 * Scheduled background refresh of display-currency rates (every 5 minutes).
 * Protect with Authorization: Bearer <CRON_SECRET>.
 *
 * Example (Render / cron-job.org / GitHub Actions), every 5 min:
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<domain>/api/cron/rates
 */
import { NextResponse } from 'next/server';
import { getRates }     from '@/lib/rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const data = await getRates(true); // force refresh
    return NextResponse.json({ ok: true, ...data });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[cron/rates] error:', message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
