import { NextResponse } from 'next/server';
import { getActivePromotion, getActivePromotions } from '@/lib/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promo = await getActivePromotion();
    const topupPromo = await getActivePromotion('topup');
    const all = await getActivePromotions();
    return NextResponse.json(
      {
        promotion: promo,
        topupPromotion: topupPromo,
        allPromotions: all,
      },
      {
        headers: {
          // In testenv or during active promotions, keep cache short so state transitions are crisp
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ promotion: null, topupPromotion: null, error: err.message }, { status: 500 });
  }
}
