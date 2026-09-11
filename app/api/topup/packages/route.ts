/**
 * GET /api/topup/packages?iccid=xxxx
 *
 * Fetches top-up packages available for a specific ICCID from esimaccess,
 * applies our pricing formula, and returns the enriched packages.
 */
import { NextResponse }        from 'next/server';
import { fetchTopUpPackages, priceToUsd, bytesToGb, getVolumeBytes, detectTariffType } from '@/lib/esimaccess/client';
import { calculateSalePrice }  from '@/lib/pricing';
import { createServiceClient } from '@/lib/supabase/server';

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const iccid = searchParams.get('iccid')?.trim();

  if (!iccid) {
    return NextResponse.json({ error: 'iccid parameter is required' }, { status: 400 });
  }

  try {
    const supabase = createServiceClient();

    // 1. Get current exchange rate from DB
    const { data: rateRow } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', 'usd_eur_rate')
      .single();

    const usdEurRate = rateRow ? parseFloat(rateRow.value) : 0.92;

    // 2. Check if this ICCID belongs to an existing order in our database
    const { data: existingOrder } = await supabase
      .from('orders')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .select('id, period_num, tariffs(id, name, country_name, country_code, flag_emoji, data_gb, validity_days, tariff_type, speed_kbps, package_code, raw_data)')
      .eq('iccid', iccid)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle() as any;

    const existingTariff = existingOrder?.tariffs ?? null;

    // 3. Fetch top-up packages from esimaccess
    const res = await fetchTopUpPackages(iccid);

    if (!res.success) {
      const errCode = String(res.errorCode);
      const isInvalidIccid = ['310409', '310006', '310401', '310204', '310410', '310411'].includes(errCode) || errCode.includes('iccid');
      console.warn(`[topup/packages] Failed to fetch top-up packages for ICCID ${iccid}: code ${errCode}`);
      return NextResponse.json(
        { error: isInvalidIccid ? 'topup_error_invalid_iccid' : 'topup_error_general' },
        { status: 400 }
      );
    }

    const rawPackages = res.obj?.packageList ?? [];

    // 4. Map and detect unlimited attributes
    const packages = rawPackages.map((pkg) => {
      const ekUsd = priceToUsd(pkg.price);
      const salePriceEur = calculateSalePrice(ekUsd, usdEurRate);
      const volumeBytes = getVolumeBytes(pkg as any);
      const detectedType = detectTariffType(pkg as any);
      
      let isUnlimited =
        detectedType !== 'travel' ||
        pkg.dataType === 2 ||
        (existingTariff?.tariff_type && existingTariff.tariff_type.startsWith('unlimited')) ||
        (pkg.name ?? '').toLowerCase().includes('unlimited') ||
        (pkg.name ?? '').toLowerCase().includes('daily') ||
        (pkg.name ?? '').toLowerCase().includes('day pass');

      // Daily Highspeed Volume in GB (e.g. 1GB, 2GB or 0 for unlimited)
      let dataGb = volumeBytes > 0 ? bytesToGb(volumeBytes) : 0;
      if (isUnlimited && dataGb === 0 && existingTariff?.data_gb) {
        dataGb = Number(existingTariff.data_gb);
      }

      // Throttle speed (FUP)
      let speedKbps: number | null = null;
      if (typeof pkg.speed === 'number') {
        speedKbps = pkg.speed;
      } else if (typeof pkg.speed === 'string') {
        const m = pkg.speed.match(/(\d+(?:\.\d+)?)\s*(k|m)?bps?/i);
        if (m) {
          const val  = parseFloat(m[1]);
          const unit = (m[2] ?? '').toLowerCase();
          speedKbps  = unit === 'm' ? Math.round(val * 1000) : Math.round(val);
        }
      }
      if (!speedKbps && existingTariff?.speed_kbps) {
        speedKbps = existingTariff.speed_kbps;
      }

      return {
        id:             pkg.packageCode,
        package_code:   pkg.packageCode,
        name:           pkg.name,
        data_gb:        dataGb,
        validity_days:  pkg.duration,
        sale_price_eur: salePriceEur,
        ek_price_usd:   ekUsd,
        country_name:   existingTariff?.country_name || pkg.locationCode,
        country_code:   existingTariff?.country_code || pkg.locationCode,
        flag_emoji:     existingTariff?.flag_emoji || null,
        description:    pkg.description,
        tariff_type:    (existingTariff?.tariff_type || detectedType) as 'travel' | 'unlimited_eco' | 'unlimited_pro',
        speed_kbps:     speedKbps,
        is_unlimited:   Boolean(isUnlimited),
        raw_data:       pkg as unknown as Record<string, unknown>,
      };
    });

    // 5. Enrich with existing DB tariff rows (match both TOPUP_ prefix and base package_code)
    const packageCodes = packages.map((p) => p.package_code);
    const baseCodes = packages.map((p) => p.package_code.replace(/^TOPUP_/, ''));
    const allLookupCodes = Array.from(new Set([...packageCodes, ...baseCodes]));

    if (allLookupCodes.length > 0) {
      const { data: dbTariffs } = await supabase
        .from('tariffs')
        .select('package_code, id, flag_emoji, country_name, country_code, sale_price_eur, ek_price_usd, tariff_type, speed_kbps, raw_data, data_gb, validity_days')
        .in('package_code', allLookupCodes);

      const tariffMap = new Map<string, any>();
      if (dbTariffs) {
        for (const t of dbTariffs) {
          tariffMap.set(t.package_code, t);
          tariffMap.set(`TOPUP_${t.package_code.replace(/^TOPUP_/, '')}`, t);
          tariffMap.set(t.package_code.replace(/^TOPUP_/, ''), t);
        }
      }

      for (const pkg of packages) {
        let dbT = tariffMap.get(pkg.package_code) || tariffMap.get(pkg.package_code.replace(/^TOPUP_/, ''));
        if (dbT) {
          pkg.id             = dbT.id;
          pkg.flag_emoji     = dbT.flag_emoji ?? pkg.flag_emoji;
          pkg.country_name   = dbT.country_name || pkg.country_name;
          pkg.country_code   = dbT.country_code || pkg.country_code;
          pkg.sale_price_eur = dbT.sale_price_eur;
          pkg.ek_price_usd   = dbT.ek_price_usd;
          pkg.tariff_type    = dbT.tariff_type;
          if (dbT.speed_kbps) pkg.speed_kbps = dbT.speed_kbps;
          if (dbT.data_gb !== null && dbT.data_gb !== undefined) pkg.data_gb = dbT.data_gb;
          pkg.is_unlimited   = dbT.tariff_type?.startsWith('unlimited') || dbT.data_gb === 0 || pkg.is_unlimited;
        } else {
          // Auto-create missing top-up tariff in DB so orders.tariff_id has a valid FK UUID
          try {
            const tariffSlug = slugify(pkg.name) || slugify(pkg.package_code) || 'topup-tariff';
            const { data: created, error: createErr } = await supabase
              .from('tariffs')
              .upsert({
                package_code: pkg.package_code,
                slug: tariffSlug,
                name: pkg.name,
                country_code: pkg.country_code || 'XX',
                country_name: pkg.country_name || 'Global',
                flag_emoji: pkg.flag_emoji || '🌐',
                data_gb: pkg.data_gb,
                validity_days: pkg.validity_days || 1,
                ek_price_usd: pkg.ek_price_usd ?? 0,
                sale_price_eur: pkg.sale_price_eur,
                usd_eur_rate: usdEurRate,
                is_active: true,
                is_top_up_eligible: true,
                tariff_type: pkg.tariff_type || 'travel',
                speed_kbps: pkg.speed_kbps ?? null,
                raw_data: pkg.raw_data ?? {},
              } as any, { onConflict: 'package_code' })
              .select('id, package_code, flag_emoji, country_name, country_code, sale_price_eur, ek_price_usd, tariff_type, speed_kbps, raw_data, data_gb, validity_days')
              .single();

            if (createErr) {
              console.warn('[topup/packages] Notice creating tariff entry:', createErr.message);
            }
            if (created) {
              pkg.id = created.id;
              tariffMap.set(pkg.package_code, created);
              tariffMap.set(pkg.package_code.replace(/^TOPUP_/, ''), created);
              tariffMap.set(`TOPUP_${pkg.package_code.replace(/^TOPUP_/, '')}`, created);
            } else {
              const { data: existing } = await supabase
                .from('tariffs')
                .select('id, package_code, flag_emoji, country_name, country_code, sale_price_eur, ek_price_usd, tariff_type, speed_kbps, raw_data, data_gb, validity_days')
                .eq('package_code', pkg.package_code)
                .maybeSingle();
              if (existing) {
                pkg.id = existing.id;
                tariffMap.set(pkg.package_code, existing);
                tariffMap.set(pkg.package_code.replace(/^TOPUP_/, ''), existing);
                tariffMap.set(`TOPUP_${pkg.package_code.replace(/^TOPUP_/, '')}`, existing);
              }
            }
          } catch (createErr) {
            console.warn('[topup/packages] Notice creating tariff entry:', (createErr as Error).message);
          }
        }
      }
    }

    // 6. Sort packages: Travel fixed volume sorted by GB, Unlimited packages grouped cleanly
    packages.sort((a, b) => {
      if (a.is_unlimited && !b.is_unlimited) return -1;
      if (!a.is_unlimited && b.is_unlimited) return 1;
      const aGb = a.data_gb === 0 ? 999999 : (a.data_gb ?? 0);
      const bGb = b.data_gb === 0 ? 999999 : (b.data_gb ?? 0);
      if (aGb !== bGb) return aGb - bGb;
      return a.sale_price_eur - b.sale_price_eur;
    });

    return NextResponse.json({
      packages,
      usdEurRate,
      orderInfo: existingOrder ? { id: existingOrder.id, tariff: existingTariff } : null
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[topup/packages] Error:', message);
    return NextResponse.json({ error: 'topup_error_general' }, { status: 500 });
  }
}
