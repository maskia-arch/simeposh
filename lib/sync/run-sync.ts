/**
 * Core tariff sync logic – shared between:
 *   - /api/cron/sync-tariffs  (scheduled / external cron)
 *   - /api/admin/sync         (manual trigger from admin UI, fire-and-forget)
 *
 * KEY FIXES vs previous version:
 *  1. No slug-based uniqueness – slug column is no longer UNIQUE in DB.
 *     Two packageCodes that slugify identically (e.g. "ESIM-DE" & "ESIM_DE")
 *     no longer cause entire 200-row batches to fail.
 *
 *  2. Timestamp-based deactivation instead of a 140k IN-clause.
 *     "WHERE last_synced_at < syncStart" is a simple indexed comparison
 *     that never hits URL/query-size limits.
 *
 *  3. Error logging per batch – if a batch fails, we log the real error
 *     detail so it's visible in the sync log.
 */
import {
  fetchAllPackages,
  priceToUsd,
  bytesToGb,
  getVolumeBytes,
  detectTariffType,
  parseLocationCodes,
  getCountryName,
  getRegionCode,
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

/** slug is for URL readability only – NOT globally unique (package_code is the PK). */
function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Write a partial progress update to sync_logs (best-effort, never throws). */
async function writeProgress(
  db:      ReturnType<typeof createServiceClient>,
  syncId:  string,
  fields:  Record<string, unknown>,
) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db.from('sync_logs').update(fields as any).eq('sync_id', syncId));
  } catch { /* ignore – progress writes are best-effort */ }
}

export async function runSync(syncId = new Date().toISOString()): Promise<SyncResult> {
  const startedAt    = Date.now();
  const syncStartIso = new Date(startedAt).toISOString();
  const db           = createServiceClient();

  // Create sync log entry (upsert so caller can pre-create if needed)
  await db.from('sync_logs').upsert(
    { sync_id: syncId, status: 'running' },
    { onConflict: 'sync_id' }
  );

  try {
    // ── 1. Exchange rate ────────────────────────────────────────
    const { data: rateRow } = await db
      .from('system_settings').select('value').eq('key', 'usd_eur_rate').single();
    const fallback   = rateRow ? parseFloat(rateRow.value) : 0.92;
    const usdEurRate = await fetchUsdEurRate(fallback);
    await db.from('system_settings')
      .update({ value: String(usdEurRate) })
      .eq('key', 'usd_eur_rate');

    const { data: avgRow } = await db
      .from('system_settings').select('value').eq('key', 'last_sync_duration_ms').single();
    const lastDurationMs = avgRow ? parseInt(avgRow.value, 10) : 0;

    await writeProgress(db, syncId, {
      usd_eur_rate:  usdEurRate,
      error_message: `eta_ms:${lastDurationMs > 0 ? lastDurationMs : 120_000}`,
    });

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
        error_message: null,
      }).eq('sync_id', syncId);
      return { success: true, upserted: 0, errors: 0, total: 0, usdEurRate, priceChanges: 0, syncId, duration_ms: duration };
    }

    await writeProgress(db, syncId, {
      total_packages: packages.length,
      error_message:  `fetched:${packages.length}|eta_ms:${lastDurationMs > 0 ? lastDurationMs : 120_000}`,
    });

    // ── 3. Load existing prices for change detection ────────────
    const { data: existing } = await db
      .from('tariffs').select('id, package_code, sale_price_eur').limit(200_000);
    const existingMap = new Map(
      (existing ?? []).map((t) => [t.package_code, { id: t.id, price: t.sale_price_eur }])
    );

    // ── 4. Build upsert rows ────────────────────────────────────
    // Use syncStartIso so deactivation via last_synced_at < syncStartIso works correctly.
    const syncedAt = new Date().toISOString();

    const rows = packages.map((pkg) => {
      const ekUsd         = priceToUsd(pkg.price);
      const salePriceEur  = calculateSalePrice(ekUsd, usdEurRate);
      const volumeBytes   = getVolumeBytes(pkg);
      const dataGb        = volumeBytes > 0 ? bytesToGb(volumeBytes) : null;
      const tariffType    = detectTariffType(pkg);
      const locationCodes = parseLocationCodes(pkg);
      const isMulti       = locationCodes.length > 1;

      const countryCode = isMulti ? getRegionCode(locationCodes) : (locationCodes[0] ?? 'XX');
      const countryName = getCountryName(pkg);
      const region      = isMulti ? countryName : null;

      const flagEmoji = !isMulti && locationCodes.length === 1
        ? getFlagEmoji(locationCodes[0])
        : isMulti ? '🌍' : '🌐';

      // slug = slugify(packageCode) – for URL readability only.
      // NOT globally unique (the unique constraint was dropped in migration 003).
      const slug = slugify(pkg.packageCode);

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
        slug,
        name:               pkg.name || `${countryName} ${dataGb ?? 'Unlimited'}GB ${pkg.duration}d`,
        description:        pkg.description || null,
        country_code:       countryCode,
        country_name:       countryName,
        region,
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
          operatorList: getOperatorList(pkg),
        },
        last_synced_at: syncedAt,
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
        row.sale_price_eur = prev.price; // keep old price until admin approves
      }
    }

    // ── 6. Upsert in batches of 200 ─────────────────────────────
    // onConflict: 'package_code' – slug is no longer unique, package_code is the PK.
    const BATCH = 200;
    let upserted = 0, errors = 0;
    const errorDetails: string[] = [];

    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH);
      const { error } = await db.from('tariffs').upsert(batch, { onConflict: 'package_code' });
      if (error) {
        const detail = `Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`;
        console.error('[sync] upsert error:', detail, error.details ?? '');
        errors += batch.length;
        errorDetails.push(detail);
      } else {
        upserted += batch.length;
      }

      // Write progress every 10 batches (~2000 rows)
      if ((i / BATCH) % 10 === 0) {
        const etaMs = lastDurationMs > 0
          ? Math.round(lastDurationMs * (1 - i / rows.length))
          : 120_000;
        await writeProgress(db, syncId, {
          upserted,
          errors,
          error_message: `fetched:${packages.length}|upserted:${upserted}|errors:${errors}|eta_ms:${etaMs}`,
        });
      }
    }

    // ── 7. Save price proposals ─────────────────────────────────
    if (proposals.length > 0) {
      const { data: freshIds } = await db.from('tariffs')
        .select('id, package_code')
        .in('package_code', proposals.map(p => p.package_code));
      const freshMap = new Map((freshIds ?? []).map(t => [t.package_code, t.id]));
      const toInsert = proposals
        .map(p => ({ ...p, tariff_id: freshMap.get(p.package_code) ?? p.tariff_id }))
        .filter(p => p.tariff_id);
      if (toInsert.length > 0) {
        await db.from('tariff_price_proposals').insert(toInsert);
      }
    }

    // ── 8. Deactivate removed packages (timestamp-based) ────────
    // Instead of a giant "NOT IN (140k items)" URL that exceeds PostgREST limits,
    // we use the last_synced_at timestamp set during upsert.
    // Any row with last_synced_at < syncStartIso was NOT touched by this sync
    // → it was removed from the esimaccess catalogue → deactivate it.
    const { error: deactivateError } = await db
      .from('tariffs')
      .update({ is_active: false })
      .lt('last_synced_at', syncStartIso)
      .eq('is_active', true);

    if (deactivateError) {
      console.error('[sync] deactivation error (non-fatal):', deactivateError.message);
    } else {
      console.log('[sync] Deactivated stale packages (last_synced_at < syncStart)');
    }

    // ── 9. Finalize ─────────────────────────────────────────────
    const duration = Date.now() - startedAt;

    await db.from('system_settings').upsert(
      { key: 'last_sync_duration_ms', value: String(duration), description: 'Duration of last successful sync in ms' },
      { onConflict: 'key' }
    );

    // Build final error message: include first batch error if any
    const finalErrorMsg = errorDetails.length > 0
      ? `${errors} rows failed. First error: ${errorDetails[0]}`
      : null;

    await db.from('sync_logs').update({
      status:         errors > 0 && upserted === 0 ? 'failed' : 'completed',
      total_packages: packages.length,
      upserted,
      errors,
      usd_eur_rate:   usdEurRate,
      price_changes:  proposals.length,
      duration_ms:    duration,
      completed_at:   new Date().toISOString(),
      error_message:  finalErrorMsg,
    }).eq('sync_id', syncId);

    console.log(`[sync] Done. packages=${packages.length} upserted=${upserted} errors=${errors} priceChanges=${proposals.length} duration=${duration}ms`);

    return {
      success:      upserted > 0,
      upserted,
      errors,
      total:        packages.length,
      usdEurRate,
      priceChanges: proposals.length,
      syncId,
      duration_ms:  duration,
      error:        finalErrorMsg ?? undefined,
    };

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[sync] Fatal error:', message);
    await db.from('sync_logs').update({
      status:        'failed',
      error_message: message,
      duration_ms:   Date.now() - startedAt,
      completed_at:  new Date().toISOString(),
    }).eq('sync_id', syncId);
    return {
      success: false, upserted: 0, errors: 0, total: 0, usdEurRate: 0,
      priceChanges: 0, syncId, duration_ms: Date.now() - startedAt, error: message,
    };
  }
}
