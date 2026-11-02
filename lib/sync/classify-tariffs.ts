import { query as runRawQuery } from '@/lib/db';

/**
 * Classifies all active tariffs according to the Fix 1 Rule:
 * 1. Unlimited tariffs are ALWAYS unlimited_eco or unlimited_pro and NEVER premium (is_premium = false).
 * 2. Travel tariffs (data_gb > 0, tariff_type NOT LIKE 'unlimited%'):
 *    Grouped by (country_code, data_gb, validity_days) among active, unhidden tariffs:
 *    - Lowest front price in group -> travel_standard (is_premium = false)
 *    - Higher price in group -> travel_premium (is_premium = true)
 *    - Single tariff in group -> travel_standard (is_premium = false)
 *    - Equal price in group -> travel_standard (is_premium = false)
 *    - is_premium_override takes absolute precedence
 */
export async function classifyAllTariffs(): Promise<{ updated: number }> {
  // Step 1: Ensure unlimited tariffs are never premium
  await runRawQuery(`
    UPDATE public.tariffs
    SET is_premium = FALSE
    WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0;
  `);

  // Step 2: Classify travel tariffs based on front price rank within (country_code, data_gb, validity_days)
  const result = await runRawQuery(`
    WITH ranked_travel AS (
      SELECT id,
             sale_price_eur,
             MIN(sale_price_eur) OVER (PARTITION BY country_code, data_gb, validity_days) AS min_price,
             COUNT(*) OVER (PARTITION BY country_code, data_gb, validity_days) AS group_count
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

  return { updated: result.rowCount || 0 };
}
