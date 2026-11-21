import { NextResponse } from 'next/server';
import { getActivePromotion } from '@/lib/pricing-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promo = await getActivePromotion();
    return NextResponse.json(
      { promotion: promo },
      {
        headers: {
          // In testenv or during active promotions, keep cache short so state transitions are crisp
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=20',
        },
      }
    );
  } catch (err: any) {
    return NextResponse.json({ promotion: null, error: err.message }, { status: 500 });
  }
}
