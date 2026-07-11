/**
 * GET /api/crypto/coins
 * Public list of coins that are enabled AND have a configured wallet env.
 * Never exposes the wallet address itself — only what the UI needs.
 */
import { NextResponse } from 'next/server';
import { getOfferableCoins } from '@/lib/crypto/coins';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coins = await getOfferableCoins();
    return NextResponse.json({
      coins: coins.map((c) => ({
        code:              c.code,
        name:              c.name,
        surchargePct:      Number(c.surcharge_pct),
        surchargeFixedEur: Number(c.surcharge_fixed_eur),
        confirmations:     c.confirmations,
        minOrderEur:       Number(c.min_order_eur || 0),
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ coins: [], error: message }, { status: 500 });
  }
}
