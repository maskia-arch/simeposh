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
import { revalidatePath }                      from 'next/cache';
import { query as runRawQuery }                from '@/lib/db';

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

function isTariffChanged(existing: any, generated: any): boolean {
  if (!existing) return true; // new package
  
  if (existing.name !== generated.name) return true;
  if (existing.description !== generated.description) return true;
  if (existing.country_code !== generated.country_code) return true;
  if (existing.country_name !== generated.country_name) return true;
  if (existing.region !== generated.region) return true;
  if (existing.flag_emoji !== generated.flag_emoji) return true;
  
  if (Number(existing.data_gb) !== Number(generated.data_gb)) return true;
  if (existing.validity_days !== generated.validity_days) return true;
  
  if (Math.abs(Number(existing.ek_price_usd) - Number(generated.ek_price_usd)) >= 0.0001) return true;
  if (Math.abs(Number(existing.sale_price_eur) - Number(generated.sale_price_eur)) >= 0.01) return true;
  if (Math.abs(Number(existing.usd_eur_rate) - Number(generated.usd_eur_rate)) >= 0.0001) return true;
  
  if (existing.is_active !== generated.is_active) return true;
  if (existing.tariff_type !== generated.tariff_type) return true;
  if (existing.speed_kbps !== generated.speed_kbps) return true;

  // location_codes
  const a = existing.location_codes || [];
  const b = generated.location_codes || [];
  if (a.length !== b.length) return true;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return true;
  }

  // raw_data (operatorList)
  const aOps = existing.raw_data?.operatorList || [];
  const bOps = generated.raw_data?.operatorList || [];
  if (aOps.length !== bOps.length) return true;
  if (JSON.stringify(aOps) !== JSON.stringify(bOps)) return true;

  return false;
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

    // ── 3. Load existing tariffs for change detection ────────────
    const { data: existing } = await db
      .from('tariffs').select('*').limit(200_000);
    const existingMap = new Map(
      (existing ?? []).map((t) => [t.package_code, t])
    );

    // ── 4. Build upsert rows ────────────────────────────────────
    // Use syncStartIso so deactivation via last_synced_at < syncStartIso works correctly.
    const syncedAt = new Date().toISOString();

    // Load existing multi-country names from Supabase for caching & AI context
    const existingNamingMap = new Map<string, string>();
    try {
      const { data: existingMulti } = await db
        .from('tariffs')
        .select('location_codes, country_name')
        .eq('is_active', true);
      
      if (existingMulti) {
        for (const t of existingMulti) {
          if (Array.isArray(t.location_codes) && t.location_codes.length > 1) {
            const sortedKey = [...t.location_codes].sort().join(',');
            if (t.country_name) {
              existingNamingMap.set(sortedKey, t.country_name);
            }
          }
        }
      }
    } catch (err) {
      console.warn('[sync] Failed to load existing multi-country names:', (err as Error).message);
    }

    // Fetch AI display names if DeepSeek is configured (will only query for new combinations)
    const aiDisplayNames = await getAiDisplayNames(packages, existingNamingMap);

    const rows = packages.map((pkg) => {
      const ekUsd         = priceToUsd(pkg.price);
      const salePriceEur  = calculateSalePrice(ekUsd, usdEurRate);
      const volumeBytes   = getVolumeBytes(pkg);
      const dataGb        = volumeBytes > 0 ? bytesToGb(volumeBytes) : null;
      const tariffType    = detectTariffType(pkg);
      const locationCodes = parseLocationCodes(pkg);
      const isMulti       = locationCodes.length > 1;

      const countryCode = isMulti ? getRegionCode(locationCodes) : (locationCodes[0] ?? 'XX');
      let countryName   = getCountryName(pkg);
      if (isMulti) {
        const sortedKey = [...locationCodes].sort().join(',');
        const aiName = aiDisplayNames.get(sortedKey);
        if (aiName) {
          countryName = aiName;
        }
      }
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
      if (prev && Math.abs(row.sale_price_eur - prev.sale_price_eur) >= 0.01) {
        const changePct = ((row.sale_price_eur - prev.sale_price_eur) / prev.sale_price_eur) * 100;
        proposals.push({
          sync_id:       syncId,
          tariff_id:     prev.id,
          package_code:  row.package_code,
          old_price_eur: prev.sale_price_eur,
          new_price_eur: row.sale_price_eur,
          change_pct:    Math.round(changePct * 100) / 100,
          status:        'pending',
        });
        row.sale_price_eur = prev.sale_price_eur; // keep old price until admin approves
      }
    }

    // ── 5.5. Filter out unchanged packages (Delta Sync) ─────────
    const rowsToUpsert: typeof rows = [];
    const unchangedCodes: string[] = [];

    for (const row of rows) {
      const ext = existingMap.get(row.package_code);
      if (isTariffChanged(ext, row)) {
        rowsToUpsert.push(row);
      } else {
        unchangedCodes.push(row.package_code);
      }
    }

    console.log(`[sync] Delta Sync: ${rowsToUpsert.length} packages to upsert, ${unchangedCodes.length} unchanged packages.`);

    // ── 6. Upsert changed packages in batches of 200 ─────────────
    const BATCH = 200;
    let upserted = 0, errors = 0;
    const errorDetails: string[] = [];

    if (rowsToUpsert.length > 0) {
      for (let i = 0; i < rowsToUpsert.length; i += BATCH) {
        const batch = rowsToUpsert.slice(i, i + BATCH);
        const { error } = await db.from('tariffs').upsert(batch, { onConflict: 'package_code' });
        if (error) {
          const detail = `Batch ${Math.floor(i / BATCH) + 1}: ${error.message}`;
          console.error('[sync] upsert error:', detail, error.details ?? '');
          errors += batch.length;
          errorDetails.push(detail);
        } else {
          upserted += batch.length;
        }

        // Write progress every 10 batches
        if ((i / BATCH) % 10 === 0) {
          const etaMs = lastDurationMs > 0
            ? Math.round(lastDurationMs * (1 - i / rowsToUpsert.length))
            : 120_000;
          await writeProgress(db, syncId, {
            upserted,
            errors,
            error_message: `fetched:${packages.length}|upserted:${upserted}|errors:${errors}|eta_ms:${etaMs}`,
          });
        }
      }
    }

    // ── 6.5. Bulk update last_synced_at for unchanged packages ──
    if (unchangedCodes.length > 0) {
      try {
        await runRawQuery(
          'UPDATE public.tariffs SET last_synced_at = $1 WHERE package_code = ANY($2)',
          [syncedAt, unchangedCodes]
        );
        console.log(`[sync] Bulk updated last_synced_at for ${unchangedCodes.length} unchanged packages.`);
      } catch (err: any) {
        console.error('[sync] Bulk update last_synced_at failed:', err.message);
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
        // Delete existing pending proposals for these package codes to avoid duplicates
        const codes = toInsert.map(p => p.package_code);
        await db.from('tariff_price_proposals')
          .delete()
          .eq('status', 'pending')
          .in('package_code', codes);

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

    try {
      console.log('[sync] Triggering local cache revalidation...');
      revalidatePath('/');
      revalidatePath('/tariffs');
      revalidatePath('/api/destinations');
      console.log('[sync] Local cache revalidation triggered.');
    } catch (revalErr) {
      console.error('[sync] Local cache revalidation failed:', revalErr);
    }

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

/**
 * Call DeepSeek API to name new multi-country packages based on their covered countries.
 * Leverages existing mappings from the database to avoid duplicate queries and maintain consistency.
 * Returns a combined Map of sorted location keys -> customer friendly display name.
 */
async function getAiDisplayNames(
  packages: any[],
  existingNamingMap: Map<string, string>
): Promise<Map<string, string>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.log('[AI Naming] DEEPSEEK_API_KEY not set. Using existing or default naming.');
    return existingNamingMap;
  }

  const model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  
  // 1. Identify all unique multi-country combinations and group packages under them
  const newCombinationsToName = new Map<string, string[]>(); // sortedKey -> locationCodes
  const examplePackageNames = new Map<string, string>(); // sortedKey -> example name (for AI context)

  for (const p of packages) {
    const location = p.location || '';
    const codes = location ? location.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean) : [];
    if (codes.length > 1) {
      const sortedKey = [...codes].sort().join(',');
      // If we don't have a name for this combination in existing database, and haven't queued it yet, queue it
      if (!existingNamingMap.has(sortedKey) && !newCombinationsToName.has(sortedKey)) {
        newCombinationsToName.set(sortedKey, codes);
        examplePackageNames.set(sortedKey, p.name || '');
      }
    }
  }

  // If there are no new combinations, return the existingNamingMap as is
  if (newCombinationsToName.size === 0) {
    console.log('[AI Naming] No new multi-country combinations found. Using cached names.');
    return existingNamingMap;
  }

  console.log(`[AI Naming] Found ${newCombinationsToName.size} new multi-country combinations. Querying DeepSeek (${model}) for names...`);

  // 2. Prepare the payload for DeepSeek
  const payload = Array.from(newCombinationsToName.entries()).map(([key, countries]) => {
    return {
      combinationId: key,
      countries,
      exampleName: examplePackageNames.get(key) || '',
    };
  });

  // 3. Prepare the existing context dictionary for consistency
  const existingContext: Record<string, string> = {};
  existingNamingMap.forEach((name, key) => {
    existingContext[key] = name;
  });

  try {
    const response = await fetch('https://api.deepseek.com/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: 'You are an expert copywriter for a premium eSIM shop. Your task is to generate beautiful, concise, customer-friendly display names for new multi-country eSIM packages based on the countries they cover. Output must be a raw JSON object mapping combinationId directly to the proposed display name (string). Do not add markdown wrapping or chat preamble, just return the JSON object.'
          },
          {
            role: 'user',
            content: `Here are the existing named multi-country combinations we already use in the shop (use these as context for naming consistency):
${JSON.stringify(existingContext, null, 2)}

Please name the following new multi-country combinations. Maintain naming consistency with the existing combinations where logical.
Rules:
- If it covers almost all of Europe, use 'Europe'.
- If it covers almost all of Asia, use 'Asia'.
- If it covers a small group of countries, combine them (e.g. 'USA & Canada', 'DACH Region', 'Scandinavia').
- If it is global or covers many countries across continents, use 'Global'.
- Keep names under 30 characters.

Combinations to name:
${JSON.stringify(payload, null, 2)}`
          }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI Naming] DeepSeek API returned status ${response.status}: ${errorText}`);
      return existingNamingMap;
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.error('[AI Naming] Empty response from DeepSeek API');
      return existingNamingMap;
    }

    const nameMap = JSON.parse(content) as Record<string, string>;
    const resultMap = new Map(existingNamingMap);
    
    for (const [key, name] of Object.entries(nameMap)) {
      if (typeof name === 'string' && name.trim()) {
        resultMap.set(key, name.trim());
      }
    }

    console.log(`[AI Naming] Successfully named ${nameMap ? Object.keys(nameMap).length : 0} new combinations. Total cached combinations: ${resultMap.size}`);
    return resultMap;
  } catch (err) {
    console.error('[AI Naming] Failed to resolve names via DeepSeek:', err);
    return existingNamingMap;
  }
}
