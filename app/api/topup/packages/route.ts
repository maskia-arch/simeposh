/**
 * GET /api/topup/packages?iccid=xxxx
 *
 * Fetches top-up packages available for a specific ICCID from esimaccess,
 * applies our pricing formula, and returns the enriched packages.
 */
import { NextResponse }        from 'next/server';
import { fetchTopUpPackages }  from '@/lib/esimaccess/client';
import { calculateSalePrice }  from '@/lib/pricing';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iccid = searchParams.get('iccid')?.trim();

  if (!iccid) {
    return NextResponse.json({ error: 'iccid parameter is required' }, { status: 400 });
  }

  try {
    // Get current exchange rate from DB
    const supabase = createServiceClient();
    const { data: rateRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'usd_eur_rate')
      .single();

    const usdEurRate = rateRow ? parseFloat(rateRow.value) : 0.92;

    // Fetch top-up packages from esimaccess
    const res = await fetchTopUpPackages(iccid);

    if (!res.success) {
      return NextResponse.json(
        { error: `esimaccess error: ${res.errorCode}` },
        { status: 502 }
      );
    }

    const rawPackages = res.obj?.packageList ?? [];

    // Apply our pricing formula and look up matching tariffs in DB
    const packages = rawPackages.map((pkg) => {
      const salePriceEur = calculateSalePrice(pkg.price, usdEurRate);
      return {
        id:             pkg.packageCode,   // use as temp ID; real ID from tariffs table if exists
        package_code:   pkg.packageCode,
        name:           pkg.name,
        data_gb:        Math.round(((pkg.dataAmount ?? 0) / 1024) * 1000) / 1000,
        validity_days:  pkg.duration,
        sale_price_eur: salePriceEur,
        ek_price_usd:   pkg.price,
        country_name:   pkg.locationCode,
        flag_emoji:     null as string | null,
        description:    pkg.description,
      };
    });

    // Enrich with flag emojis from our tariffs table where possible
    const packageCodes = packages.map((p) => p.package_code);
    if (packageCodes.length > 0) {
      const { data: dbTariffs } = await supabase
        .from('tariffs')
        .select('package_code, id, flag_emoji, country_name')
        .in('package_code', packageCodes);

      if (dbTariffs) {
        const tariffMap = new Map(dbTariffs.map((t) => [t.package_code, t]));
        for (const pkg of packages) {
          const dbT = tariffMap.get(pkg.package_code);
          if (dbT) {
            pkg.id           = dbT.id;
            pkg.flag_emoji   = dbT.flag_emoji ?? null;
            pkg.country_name = dbT.country_name;
          }
        }
      }
    }

    return NextResponse.json({ packages, usdEurRate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[topup/packages] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
