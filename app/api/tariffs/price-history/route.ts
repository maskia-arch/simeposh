import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getActivePromotion } from '@/lib/pricing-service';
import { calculatePromoPriceCents } from '@/lib/promo-calculator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tariffIdParam = searchParams.get('tariffId')?.trim();
    const packageCodeParam = searchParams.get('packageCode')?.trim();

    if (!tariffIdParam && !packageCodeParam) {
      return NextResponse.json({ history: [] }, { status: 200 });
    }

    const db = createServiceClient();
    let query = db.from('tariff_price_history').select('price_eur, recorded_at, is_promotional, regular_price_eur, promotion_name');

    if (tariffIdParam) {
      if (UUID_REGEX.test(tariffIdParam)) {
        query = query.eq('tariff_id', tariffIdParam);
      } else {
        // If passed a non-UUID (e.g. package code passed as tariffId), query by package_code
        query = query.eq('package_code', tariffIdParam);
      }
    } else if (packageCodeParam) {
      query = query.eq('package_code', packageCodeParam);
    }

    // Sort by recorded_at ascending so chart is drawn from oldest to newest
    const { data, error } = await query.order('recorded_at', { ascending: true });

    let history: any[] = data ? [...data] : [];

    // If active promotion is currently running, append or mark the latest point with promotional data
    try {
      const activePromo = await getActivePromotion();
      if (activePromo && activePromo.discount_basis_points > 0) {
        let tariffRow: any = null;
        if (tariffIdParam && UUID_REGEX.test(tariffIdParam)) {
          const { data: t } = await db.from('tariffs').select('sale_price_eur, tariff_type, data_gb').eq('id', tariffIdParam).maybeSingle();
          tariffRow = t;
        } else {
          const code = packageCodeParam || tariffIdParam;
          const { data: t } = await db.from('tariffs').select('sale_price_eur, tariff_type, data_gb').eq('package_code', code).maybeSingle();
          tariffRow = t;
        }

        const isUnlimited = tariffRow?.tariff_type?.startsWith('unlimited') || tariffRow?.data_gb === 0;
        if (tariffRow && !isUnlimited && typeof tariffRow.sale_price_eur === 'number') {
          const regCents = Math.round(tariffRow.sale_price_eur * 100);
          const promoCalc = calculatePromoPriceCents(regCents, activePromo.discount_basis_points, activePromo.rounding_strategy);
          if (promoCalc.applied) {
            history.push({
              price_eur: promoCalc.promoCents / 100,
              recorded_at: new Date().toISOString(),
              is_promotional: true,
              regular_price_eur: tariffRow.sale_price_eur,
              promotion_name: activePromo.internal_name,
              discount_pct: Math.round(activePromo.discount_basis_points / 100),
            });
          }
        }
      }
    } catch (promoErr) {
      console.warn('[Price History API] Promo lookup non-blocking warning:', promoErr);
    }

    if (error && history.length === 0) {
      console.warn('[Price History API] DB Warning:', error.message);
      return NextResponse.json({ history: [] }, { status: 200 });
    }

    return NextResponse.json({ history }, { status: 200 });
  } catch (err: any) {
    console.warn('[Price History API] Fallback handled:', err.message);
    return NextResponse.json({ history: [] }, { status: 200 });
  }
}
