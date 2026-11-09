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
 * Classifies all active tariffs according to Fix 5 Rules:
 * 1. Unlimited tariffs are ALWAYS unlimited_eco or unlimited_pro and NEVER premium (is_premium = false).
 * 2. Travel tariffs (data_gb > 0, tariff_type NOT LIKE 'unlimited%'):
 *    Grouped by true region AND location coverage count:
 *    COALESCE(NULLIF(region, ''), country_code), COALESCE(array_length(location_codes, 1), 1), data_gb, validity_days
 *    - Lowest front price in group -> travel_standard (is_premium = false)
 *    - Higher price in group -> candidate for travel_premium
 *    - Single tariff in group -> travel_standard (is_premium = false)
 *    - Equal price in group -> travel_standard (is_premium = false)
 *    - is_premium_override takes absolute precedence
 * 3. Difference Chip:
 *    Strict supplier field evidence:
 *    - Multi-network: only if premium has strictly MORE unique networks than ALL standard twins in group AND > 1
 *    - Local IP: if premium has local IP and standard does not
 *    - Breakout IP difference: if standard is HK and premium routes via local/regional IP
 *    - If NO demonstrable difference: tariff becomes travel_standard (is_premium = false, chip = null),
 *      placed on needs_difference_review = TRUE, and hidden_reason = 'duplicate_higher_price' to prevent
 *      duplicate cards at different prices on the storefront.
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
        needs_difference_review = FALSE,
        hidden_reason = NULL,
        duplicate_of = NULL
    WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0;
  `);

  // Step 2: Classify travel tariffs based on front price rank within group
  // Partition includes location count (so LATAM 6 and LATAM 20 are independent groups)
  const result = await runRawQuery(`
    WITH ranked_travel AS (
      SELECT id,
             sale_price_eur,
             MIN(sale_price_eur) OVER (
               PARTITION BY COALESCE(NULLIF(region, ''), country_code),
                            COALESCE(array_length(location_codes, 1), 1),
                            data_gb,
                            validity_days
             ) AS min_price,
             COUNT(*) OVER (
               PARTITION BY COALESCE(NULLIF(region, ''), country_code),
                            COALESCE(array_length(location_codes, 1), 1),
                            data_gb,
                            validity_days
             ) AS group_count
      FROM public.tariffs
      WHERE is_active = true AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
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

  // Step 4: Calculate difference chips and review list with strict supplier field evidence
  const tariffsRes = await runRawQuery(`
    SELECT id,
           package_code,
           name,
           country_code,
           location_codes,
           COALESCE(NULLIF(region, ''), country_code) AS true_region,
           data_gb,
           validity_days,
           sale_price_eur,
           is_premium,
           is_premium_override,
           breakout_ip,
           COALESCE(raw_data->'operatorList', '[]'::jsonb) AS operator_list,
           COALESCE(raw_data->>'ipType', '') AS ip_type
    FROM public.tariffs
    WHERE is_active = true AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
    ORDER BY true_region, COALESCE(array_length(location_codes, 1), 1), data_gb, validity_days, sale_price_eur;
  `);

  const groups: Record<string, any[]> = {};
  for (const row of tariffsRes.rows) {
    const locCount = Array.isArray(row.location_codes) && row.location_codes.length > 0 ? row.location_codes.length : 1;
    const key = `${row.true_region}__${locCount}__${row.data_gb}__${row.validity_days}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  let totalStandard = 0;
  let totalPremium = 0;
  let chipsMultiNet = 0;
  let chipsNonHk = 0;
  let chipsLocalIp = 0;
  let needsReviewCount = 0;

  const updates: {
    id: string;
    chip: string | null;
    needsReview: boolean;
    isPremium: boolean;
    tariffType: string;
    hiddenReason: string | null;
    duplicateOf: string | null;
  }[] = [];

  for (const items of Object.values(groups)) {
    const standards = items.filter((x) => !x.is_premium);
    const premiums = items.filter((x) => x.is_premium);

    const baseStd = standards[0] || null;

    // Calculate maximum operator count and collected IP routings among all standard twins
    let maxStdOpsCount = 0;
    const allStdOps = new Set<string>();
    for (const s of standards) {
      const rawOps = s.operator_list
        ? (Array.isArray(s.operator_list) ? s.operator_list : JSON.parse(s.operator_list))
            .map((o: any) => o.operatorName)
            .filter(Boolean)
        : [];
      const uniqOps = new Set<string>(rawOps);
      if (uniqOps.size > maxStdOpsCount) maxStdOpsCount = uniqOps.size;
      uniqOps.forEach((op) => allStdOps.add(op));
    }

    const stdHasLocalIp = standards.some(
      (s) => isLocalIp(s.country_code, s.name, s.package_code) || s.breakout_ip === s.country_code
    );
    const stdIps = standards.map((s) => (s.breakout_ip || '').toUpperCase().trim()).filter(Boolean);
    const stdIsExclusivelyHk = stdIps.length > 0 && stdIps.every((ip) => ip === 'HK');

    // Reset standard tariffs: if multiple standards have same volume and validity at different prices,
    // keep the lowest-priced visible and mark redundant higher-priced ones as hidden duplicates
    const minStdPrice = standards.length > 0 ? Math.min(...standards.map((s) => Number(s.sale_price_eur))) : 0;

    for (const s of standards) {
      totalStandard++;
      const isRedundantStd = Number(s.sale_price_eur) > minStdPrice && s.is_premium_override !== true;
      updates.push({
        id: s.id,
        chip: null,
        needsReview: false,
        isPremium: false,
        tariffType: 'travel_standard',
        hiddenReason: isRedundantStd ? 'duplicate_higher_price' : null,
        duplicateOf: isRedundantStd ? (baseStd?.package_code || null) : null,
      });
    }

    // Evaluate each candidate premium tariff against standard twins
    for (const p of premiums) {
      const rawPremOps = p.operator_list
        ? (Array.isArray(p.operator_list) ? p.operator_list : JSON.parse(p.operator_list))
            .map((o: any) => o.operatorName)
            .filter(Boolean)
        : [];
      const premOps: string[] = Array.from(new Set(rawPremOps));
      const premIsLocal = isLocalIp(p.country_code, p.name, p.package_code) || (p.breakout_ip === p.country_code);
      const premIp = (p.breakout_ip || '').toUpperCase().trim();

      let chip: string | null = null;
      let needsReview = false;
      let finalIsPremium = true;
      let finalTariffType = 'travel_premium';
      let hiddenReason: string | null = null;
      let duplicateOf: string | null = null;

      // 1. Multi-network redundancy (only if strictly MORE unique networks than ALL standards in group AND > 1)
      if (premOps.length > maxStdOpsCount && premOps.length > 1) {
        chipsMultiNet++;
        chip = `${premOps.length} Netze: ${premOps.join(' + ')}`;
      } else if (premIsLocal && !stdHasLocalIp) {
        chipsLocalIp++;
        chip = 'Lokale IP';
      } else if (premIp && premIp !== 'HK' && stdIsExclusivelyHk) {
        chipsNonHk++;
        chip = `${premIp} IP`;
      } else {
        // No demonstrable technical difference between packages
        needsReviewCount++;
        needsReview = true;
        chip = null;

        // If not explicitly forced by admin override, degrade to travel_standard
        // and hide as duplicate higher price so customer doesn't see identical duplicate cards
        if (p.is_premium_override !== true) {
          finalIsPremium = false;
          finalTariffType = 'travel_standard';
          hiddenReason = 'duplicate_higher_price';
          duplicateOf = baseStd?.package_code || null;
        }
      }

      if (finalIsPremium) {
        totalPremium++;
      } else {
        totalStandard++;
      }

      updates.push({
        id: p.id,
        chip,
        needsReview,
        isPremium: finalIsPremium,
        tariffType: finalTariffType,
        hiddenReason,
        duplicateOf,
      });
    }
  }

  // Batch update difference chips, review flags, and normalized premium types
  if (updates.length > 0) {
    const BATCH_SIZE = 300;
    for (let i = 0; i < updates.length; i += BATCH_SIZE) {
      const chunk = updates.slice(i, i + BATCH_SIZE);
      const chunkClauses: string[] = [];
      const chunkParams: any[] = [];
      let cIdx = 1;

      for (const u of chunk) {
        chunkClauses.push(
          `($${cIdx}::uuid, $${cIdx + 1}::text, $${cIdx + 2}::boolean, $${cIdx + 3}::boolean, $${cIdx + 4}::text, $${cIdx + 5}::text, $${cIdx + 6}::text)`
        );
        chunkParams.push(u.id, u.chip, u.needsReview, u.isPremium, u.tariffType, u.hiddenReason, u.duplicateOf);
        cIdx += 7;
      }

      const sql = `
        UPDATE public.tariffs t
        SET premium_diff_chip = v.chip,
            needs_difference_review = v.needs_review,
            is_premium = v.is_premium,
            tariff_type = v.tariff_type,
            hidden_reason = v.hidden_reason,
            duplicate_of = v.duplicate_of
        FROM (VALUES ${chunkClauses.join(', ')}) AS v(id, chip, needs_review, is_premium, tariff_type, hidden_reason, duplicate_of)
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
