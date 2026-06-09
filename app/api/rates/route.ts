/**
 * GET /api/rates
 * Public display-currency rates (units per 1 EUR). Lazily refreshes the cached
 * rates if they are older than 5 minutes.
 */
import { NextResponse } from 'next/server';
import { getRates }     from '@/lib/rates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await getRates();
    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[api/rates] error:', message);
    return NextResponse.json({ base: 'EUR', rates: { EUR: 1 }, updatedAt: new Date().toISOString() });
  }
}
