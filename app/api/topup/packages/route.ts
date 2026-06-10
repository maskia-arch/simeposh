/**
 * GET /api/topup/packages?iccid=xxxx
 *
 * Fetches top-up packages available for a specific ICCID from esimaccess,
 * applies our pricing formula, and returns the enriched packages.
 */
import { NextResponse }        from 'next/server';
import { fetchTopUpPackages, priceToUsd, bytesToGb, getVolumeBytes }  from '@/lib/esimaccess/client';
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
      const errCode = String(res.errorCode);
      // 310409: eSIM not found / not exist
      // 310006: parameter error / invalid ICCID format
      // 310401: eSIM status is not ACTIVE/GOT_RESOURCE (cannot topup)
      // 310204: no tariff/product package mapping
      const isInvalidIccid = ['310409', '310006', '310401', '310204', '310410', '310411'].includes(errCode) || errCode.includes('iccid');
      console.warn(`[topup/packages] Failed to fetch top-up packages for ICCID ${iccid}: code ${errCode}`);
      return NextResponse.json(
        { error: isInvalidIccid ? 'topup_error_invalid_iccid' : 'topup_error_general' },
        { status: 400 }
      );
    }

    const rawPackages = res.obj?.packageList ?? [];

    // Apply our pricing formula and look up matching tariffs in DB
    const packages = rawPackages.map((pkg) => {
      const ekUsd = priceToUsd(pkg.price);
      const salePriceEur = calculateSalePrice(ekUsd, usdEurRate);
      return {
        id:             pkg.packageCode,   // use as temp ID; real ID from tariffs table if exists
        package_code:   pkg.packageCode,
        name:           pkg.name,
        data_gb:        bytesToGb(getVolumeBytes(pkg as any)),
        validity_days:  pkg.duration,
        sale_price_eur: salePriceEur,
        ek_price_usd:   ekUsd,
        country_name:   pkg.locationCode,
        flag_emoji:     null as string | null,
        description:    pkg.description,
      };
    });

    // Enrich with flag emojis and exact prices from our tariffs table where possible
    const packageCodes = packages.map((p) => p.package_code);
    if (packageCodes.length > 0) {
      const { data: dbTariffs } = await supabase
        .from('tariffs')
        .select('package_code, id, flag_emoji, country_name, sale_price_eur, ek_price_usd')
        .in('package_code', packageCodes);

      if (dbTariffs) {
        const tariffMap = new Map(dbTariffs.map((t) => [t.package_code, t]));
        for (const pkg of packages) {
          const dbT = tariffMap.get(pkg.package_code);
          if (dbT) {
            pkg.id             = dbT.id;
            pkg.flag_emoji     = dbT.flag_emoji ?? null;
            pkg.country_name   = dbT.country_name;
            pkg.sale_price_eur = dbT.sale_price_eur;
            pkg.ek_price_usd   = dbT.ek_price_usd;
          }
        }
      }
    }

    // Sort packages: smaller data limit first. Unlimited data (0) should be at the end.
    // If data limit is the same, sort by price (cheapest first).
    packages.sort((a, b) => {
      const aGb = a.data_gb === 0 ? 999999 : (a.data_gb ?? 0);
      const bGb = b.data_gb === 0 ? 999999 : (b.data_gb ?? 0);
      if (aGb !== bGb) {
        return aGb - bGb;
      }
      return a.sale_price_eur - b.sale_price_eur;
    });

    return NextResponse.json({ packages, usdEurRate });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[topup/packages] Error:', message);
    return NextResponse.json({ error: 'topup_error_general' }, { status: 500 });
  }
}
