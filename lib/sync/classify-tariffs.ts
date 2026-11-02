import { query as runRawQuery } from '@/lib/db';

function isNonHkIp(name: string, code: string): boolean {
  const s = `${name} ${code}`.toLowerCase();
  return s.includes('nonhk') || s.includes('non-hk');
}

function isLocalIp(cc: string, name: string, code: string): boolean {
  const n = `${name} ${code}`.toUpperCase();
  return n.includes('AUIP') || n.includes('USIP') || n.includes('MYIP') || n.includes('IIJ');
}

/**
 * Classifies all active tariffs according to the Fix 2 Rule:
 * 1. Unlimited tariffs are ALWAYS unlimited_eco or unlimited_pro and NEVER premium (is_premium = false).
 * 2. Travel tariffs (data_gb > 0, tariff_type NOT LIKE 'unlimited%'):
 *    Grouped by true region: COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days
 *    - Lowest front price in group -> travel_standard (is_premium = false)
 *    - Higher price in group -> travel_premium (is_premium = true)
 *    - Single tariff in group -> travel_standard (is_premium = false)
 *    - Equal price in group -> travel_standard (is_premium = false)
 *    - is_premium_override takes absolute precedence
 * 3. Difference Chip:
 *    Calculated as genuine demonstrable difference compared to the standard tariff of the same group.
 *    - Multi-network: only if premium has strictly MORE networks than standard and > 1
 *    - Local IP: if premium has local IP and standard does not
 *    - Non-HK IP: if premium routes without HK detour and standard does not
 *    - If no demonstrable difference: chip is NULL and needs_difference_review = TRUE (e.g. Laos pairs)
 */
export async function classifyAllTariffs(): Promise<{
  updated: number;
  totalStandard: number;
  totalPremium: number;
  chipsMultiNet: number;
  chipsNonHk: number;
  chipsLocalIp: number;
  needsReviewCount: number;
}> {
  // Step 1: Ensure unlimited tariffs are never premium and have no diff chips
  await runRawQuery(`
    UPDATE public.tariffs
    SET is_premium = FALSE,
        premium_diff_chip = NULL,
        needs_difference_review = FALSE
    WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0;
  `);

  // Step 2: Classify travel tariffs based on front price rank within true region (COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days)
  const result = await runRawQuery(`
    WITH ranked_travel AS (
      SELECT id,
             sale_price_eur,
             MIN(sale_price_eur) OVER (PARTITION BY COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days) AS min_price,
             COUNT(*) OVER (PARTITION BY COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days) AS group_count
      FROM public.tariffs
      WHERE is_active = true AND hidden_reason IS NULL AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
    )
    UPDATE public.tariffs t
    SET is_premium = CASE
          WHEN t.is_premium_override IS NOT NULL THEN t.is_premium_override
          WHEN r.group_count > 1 AND r.sale_price_eur > r.min_price THEN TRUE
          ELSE FALSE
        END,
        tariff_type = CASE
          WHEN t.is_premium_override IS TRUE OR (t.is_premium_override IS NULL AND r.group_count > 1 AND r.sale_price_eur > r.min_price) THEN 'travel_premium'
          ELSE 'travel_standard'
        END
    FROM ranked_travel r
    WHERE t.id = r.id;
  `);

  // Step 3: Ensure any legacy 'travel' type defaults to travel_standard/travel_premium
  await runRawQuery(`
    UPDATE public.tariffs
    SET tariff_type = CASE WHEN is_premium IS TRUE THEN 'travel_premium' ELSE 'travel_standard' END
    WHERE tariff_type = 'travel';
  `);

  // Step 4: Calculate difference chips and review list
  const tariffsRes = await runRawQuery(`
    SELECT id,
           package_code,
           name,
           country_code,
           COALESCE(NULLIF(region, ''), country_code) AS true_region,
           data_gb,
           validity_days,
           sale_price_eur,
           is_premium,
           COALESCE(raw_data->'operatorList', '[]'::jsonb) AS operator_list,
           COALESCE(raw_data->>'ipType', '') AS ip_type
    FROM public.tariffs
    WHERE is_active = true AND hidden_reason IS NULL AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
    ORDER BY true_region, data_gb, validity_days, sale_price_eur;
  `);

  const groups: Record<string, any[]> = {};
  for (const row of tariffsRes.rows) {
    const key = `${row.true_region}__${row.data_gb}__${row.validity_days}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  let totalStandard = 0;
  let totalPremium = 0;
  let chipsMultiNet = 0;
  let chipsNonHk = 0;
  let chipsLocalIp = 0;
  let needsReviewCount = 0;

  const updates: { id: string; chip: string | null; needsReview: boolean }[] = [];

  for (const items of Object.values(groups)) {
    const standards = items.filter((x) => !x.is_premium);
    const premiums = items.filter((x) => x.is_premium);

    totalStandard += standards.length;
    totalPremium += premiums.length;

    const baseStd = standards[0] || null;
    const stdOps: string[] = baseStd?.operator_list
      ? (Array.isArray(baseStd.operator_list) ? baseStd.operator_list : JSON.parse(baseStd.operator_list))
          .map((o: any) => o.operatorName)
          .filter(Boolean)
      : [];
    const stdIsNonHk = baseStd ? isNonHkIp(baseStd.name, baseStd.package_code) : false;
    const stdIsLocal = baseStd ? isLocalIp(baseStd.country_code, baseStd.name, baseStd.package_code) : false;

    // Reset standard tariffs
    for (const s of standards) {
      updates.push({ id: s.id, chip: null, needsReview: false });
    }

    // Evaluate each premium tariff against base standard
    for (const p of premiums) {
      const premOps: string[] = p.operator_list
        ? (Array.isArray(p.operator_list) ? p.operator_list : JSON.parse(p.operator_list))
            .map((o: any) => o.operatorName)
            .filter(Boolean)
        : [];
      const premIsNonHk = isNonHkIp(p.name, p.package_code);
      const premIsLocal = isLocalIp(p.country_code, p.name, p.package_code);

      let chip: string | null = null;
      let needsReview = false;

      // 1. Multi-network redundancy (only if strictly more operators than standard and > 1)
      if (premOps.length > stdOps.length && premOps.length > 1) {
        chipsMultiNet++;
        chip = `${premOps.length} Netze: ${premOps.join(' + ')}`;
      } else if (premIsLocal && !stdIsLocal) {
        chipsLocalIp++;
        chip = 'Lokale IP';
      } else if (premIsNonHk && !stdIsNonHk) {
        chipsNonHk++;
        chip = 'Ohne Hongkong-Umweg';
      } else {
        needsReviewCount++;
        needsReview = true;
        chip = null;
      }

      updates.push({ id: p.id, chip, needsReview });
    }
  }

  // Batch update difference chips and review flags
  if (updates.length > 0) {
    const valueClauses: string[] = [];
    const params: any[] = [];
    let idx = 1;

    for (const u of updates) {
      valueClauses.push(`($${idx}::uuid, $${idx + 1}::text, $${idx + 2}::boolean)`);
      params.push(u.id, u.chip, u.needsReview);
      idx += 3;
    }

    // Process in batches of 500 to stay well below Postgres parameter limits
    const BATCH_SIZE = 500;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      const chunkClauses: string[] = [];
      const chunkParams: any[] = [];
      let cIdx = 1;

      for (const u of chunk) {
        chunkClauses.push(`($${cIdx}::uuid, $${cIdx + 1}::text, $${cIdx + 2}::boolean)`);
        chunkParams.push(u.id, u.chip, u.needsReview);
        cIdx += 3;
      }

      const sql = `
        UPDATE public.tariffs t
        SET premium_diff_chip = v.chip,
            needs_difference_review = v.needs_review
        FROM (VALUES ${chunkClauses.join(', ')}) AS v(id, chip, needs_review)
        WHERE t.id = v.id;
      `;
      await runRawQuery(sql, chunkParams);
    }
  }

  return {
    updated: result.rowCount || 0,
    totalStandard,
    totalPremium,
    chipsMultiNet,
    chipsNonHk,
    chipsLocalIp,
    needsReviewCount,
  };
}
