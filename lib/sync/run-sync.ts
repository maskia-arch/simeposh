/**
 * Core tariff sync logic – shared between:
 *   - /api/cron/sync-tariffs  (scheduled / external cron)
 *   - /api/admin/sync         (manual trigger from admin UI)
 *
 * Returns a structured result object; never throws (catches internally).
 */
import {
  fetchAllPackages,
  priceToUsd,
  bytesToGb,
  getVolumeBytes,
  detectTariffType,
  parseLocationCodes,
  getCountryName,
  getFlagEmoji,
  getOperatorList,
} from '@/lib/esimaccess/client';
import { calculateSalePrice, fetchUsdEurRate } from '@/lib/pricing';
import { createServiceClient }                 from '@/lib/supabase/server';
import type { EsimAccessPackage }              from '@/lib/esimaccess/types';

export interface SyncResult {
  success:      boolean;
  upserted:     number;
  errors:       number;
  total:        number;
  usdEurRate:   number;
  priceChanges: number;
  syncId:       string;
  duration_ms:  number;
  error?:       string;
}

function slugify(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

export async function runSync(): Promise<SyncResult> {
  const startedAt = Date.now();
  const syncId    = new Date().toISOString();
  const db        = createServiceClient();

  // Create sync log entry
  await db.from('sync_logs').insert({ sync_id: syncId, status: 'running' });

  try {
    // ── 1. Exchange rate ────────────────────────────────────────
    const { data: rateRow } = await db
      .from('system_settings').select('value').eq('key', 'usd_eur_rate').single();
    const fallback   = rateRow ? parseFloat(rateRow.value) : 0.92;
    const usdEurRate = await fetchUsdEurRate(fallback);
    await db.from('system_settings')
      .update({ value: String(usdEurRate) })
      .eq('key', 'usd_eur_rate');

    // ── 2. Fetch all packages (travel + unlimited) ──────────────
    const listRes = await fetchAllPackages();
    if (!listRes.success) {
      throw new Error(`esimaccess API error: ${listRes.errorCode ?? 'unknown'}`);
    }

    const packages: EsimAccessPackage[] =
      listRes.obj?.packageList ?? listRes.obj?.packageInfoList ?? [];

    console.log(`[sync] Fetched ${packages.length} packages total`);

    if (packages.length === 0) {
      const duration = Date.now() - startedAt;
      await db.from('sync_logs').update({
        status: 'completed', total_packages: 0, upserted: 0,
        errors: 0, usd_eur_rate: usdEurRate, price_changes: 0,
        duration_ms: duration, completed_at: new Date().toISOString(),
      }).eq('sync_id', syncId);
      return { success: true, upserted: 0, errors: 0, total: 0, usdEurRate, priceChanges: 0, syncId, duration_ms: duration };
    }

    // ── 3. Load existing prices for change detection ────────────
    const { data: existing } = await db
      .from('tariffs').select('id, package_code, sale_price_eur').limit(20_000);
    const existingMap = new Map(
      (existing ?? []).map((t) => [t.package_code, { id: t.id, price: t.sale_price_eur }])
    );

    // ── 4. Build upsert rows ────────────────────────────────────
    const rows = packages.map((pkg) => {
      const ekUsd         = priceToUsd(pkg.price);
      const salePriceEur  = calculateSalePrice(ekUsd, usdEurRate);
      const volumeBytes   = getVolumeBytes(pkg);
      const dataGb        = volumeBytes > 0 ? bytesToGb(volumeBytes) : null;
      const tariffType    = detectTariffType(pkg);
      const locationCodes = parseLocationCodes(pkg);
      const countryCode   = locationCodes[0] ?? 'XX';
      const countryName   = getCountryName(pkg);
      const flagEmoji     = locationCodes.length === 1
        ? getFlagEmoji(countryCode)
        : locationCodes.length > 1 ? '🌍' : '🌐';
      const baseSlug      = slugify(
        `${countryCode}-${dataGb ?? 'unlimited'}-${pkg.duration}d-${tariffType}`
      );

      // Parse throttle speed (kbps)
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

      return {
        package_code:       pkg.packageCode,
        slug:               `${baseSlug}-${pkg.packageCode}`.substring(0, 100),
        name:               pkg.name || `${countryName} ${dataGb ?? 'Unlimited'}GB ${pkg.duration}d`,
        description:        pkg.description || null,
        country_code:       countryCode,
        country_name:       countryName,
        region:             null as string | null,
        flag_emoji:         flagEmoji,
        data_gb:            dataGb,
        validity_days:      pkg.duration,
        ek_price_usd:       ekUsd,
        sale_price_eur:     salePriceEur,
        usd_eur_rate:       usdEurRate,
        is_active:          true,
        is_top_up_eligible: false,
        tariff_type:        tariffType,
        speed_kbps:         speedKbps,
        location_codes:     locationCodes.length > 0 ? locationCodes : null as string[] | null,
        raw_data:           {
          ...(pkg as unknown as Record<string, unknown>),
          operatorList: getOperatorList(pkg),   // canonical key
        },
        last_synced_at:     new Date().toISOString(),
      };
    });

    // ── 5. Detect price changes ─────────────────────────────────
    const proposals: Array<{
      sync_id:       string;
      tariff_id:     string;
      package_code:  string;
      old_price_eur: number;
      new_price_eur: number;
      change_pct:    number;
      status:        'pending';
    }> = [];

    for (const row of rows) {
      const prev = existingMap.get(row.package_code);
      if (prev && Math.abs(row.sale_price_eur - prev.price) >= 0.01) {
        const changePct = ((row.sale_price_eur - prev.price) / prev.price) * 100;
        proposals.push({
          sync_id:       syncId,
          tariff_id:     prev.id,
          package_code:  row.package_code,
          old_price_eur: prev.price,
          new_price_eur: row.sale_price_eur,
          change_pct:    Math.round(changePct * 100) / 100,
          status:        'pending',
        });
        // Keep old price until admin approves
        row.sale_price_eur = prev.price;
      }
    }

    // ── 6. Upsert in batches of 100 ─────────────────────────────
    const BATCH = 100;
    let upserted = 0, errors = 0;

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await db.from('tariffs').upsert(batch, { onConflict: 'package_code' });
      if (error) {
        console.error('[sync] upsert error:', error.message, error.details);
        errors += batch.length;
      } else {
        upserted += batch.length;
      }
    }

    // ── 7. Save price proposals ─────────────────────────────────
    if (proposals.length > 0) {
      const { data: freshIds } = await db.from('tariffs')
        .select('id, package_code')
        .in('package_code', proposals.map(p => p.package_code));
      const freshMap = new Map((freshIds ?? []).map(t => [t.package_code, t.id]));
      const toInsert = proposals
        .map(p => ({ ...p, tariff_id: p.tariff_id || freshMap.get(p.package_code) || p.tariff_id }))
        .filter(p => p.tariff_id);
      if (toInsert.length > 0) {
        await db.from('tariff_price_proposals').insert(toInsert);
      }
    }

    // ── 8. Deactivate removed packages ─────────────────────────
    const activeCodes = packages.map(p => p.packageCode);
    if (activeCodes.length > 0) {
      await db.from('tariffs')
        .update({ is_active: false })
        .not('package_code', 'in', `(${activeCodes.map(c => `'${c.replace(/'/g, "''")}'`).join(',')})`);
    }

    // ── 9. Finalize sync log ────────────────────────────────────
    const duration = Date.now() - startedAt;
    await db.from('sync_logs').update({
      status:         'completed',
      total_packages: packages.length,
      upserted,
      errors,
      usd_eur_rate:   usdEurRate,
      price_changes:  proposals.length,
      duration_ms:    duration,
      completed_at:   new Date().toISOString(),
    }).eq('sync_id', syncId);

    console.log(`[sync] Done. packages=${packages.length} upserted=${upserted} errors=${errors} priceChanges=${proposals.length} duration=${duration}ms`);

    return { success: true, upserted, errors, total: packages.length, usdEurRate, priceChanges: proposals.length, syncId, duration_ms: duration };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Fatal error:', message);
    await db.from('sync_logs').update({
      status:        'failed',
      error_message: message,
      duration_ms:   Date.now() - startedAt,
      completed_at:  new Date().toISOString(),
    }).eq('sync_id', syncId);
    return { success: false, upserted: 0, errors: 0, total: 0, usdEurRate: 0, priceChanges: 0, syncId, duration_ms: Date.now() - startedAt, error: message };
  }
}
