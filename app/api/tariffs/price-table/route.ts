import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getUnlimitedPriceTable, type UnlimitedPriceTable } from '@/lib/pricing';

export const dynamic = 'force-dynamic';
export const revalidate = 600;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim();

    if (!code) {
      return NextResponse.json({ error: 'Package code or tariff id is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(code);

    let query = supabase
      .from('tariffs')
      .select('id, package_code, sale_price_eur, validity_days, discount_rule_code')
      .limit(1);

    if (isUuid) {
      query = query.eq('id', code);
    } else {
      query = query.eq('package_code', code);
    }

    const { data: tariff, error } = await query.maybeSingle();

    if (error || !tariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    const priceTable: UnlimitedPriceTable = await getUnlimitedPriceTable(
      {
        sale_price_eur: tariff.sale_price_eur,
        validity_days: tariff.validity_days || 1,
        discount_rule_code: tariff.discount_rule_code,
      },
      1,
      365
    );

    return NextResponse.json(
      { priceTable },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=3600',
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[tariffs/price-table] Error:', message);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
