import { query } from '@/lib/db';
import { isRegionCode, regionLabel, isoName } from '@/lib/tariff-display';
import { COUNTRY_ALIASES, REGION_ALIASES } from '@/lib/i18n/countryAliases';
import { toPublicTariff, type PublicTariff } from '@/lib/tariffs';
import { getTariffMinCustomerPrice } from '@/lib/pricing';
import {
  type Destination,
  slugify,
  countryCodeToSlug,
  CUSTOM_ALIASES,
} from '@/lib/destinations-shared';

export * from '@/lib/destinations-shared';

// In-memory cache for destination list
let cachedDestinations: Destination[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Loads all active destinations from the database grouped by country_code.
 */
export async function getAllDestinations(): Promise<Destination[]> {
  const now = Date.now();
  if (cachedDestinations && now - cacheTime < CACHE_TTL) {
    return cachedDestinations;
  }

  const { rows } = await query(
    `SELECT country_code, country_name, flag_emoji, count(*) as count, min(sale_price_eur) as min_price,
            COUNT(*) FILTER (WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0) as unlimited_count
     FROM tariffs
     WHERE is_active = true AND country_code IS NOT NULL
     GROUP BY country_code, country_name, flag_emoji
     ORDER BY country_name ASC`
  );

  const destMap = new Map<string, Destination>();

  for (const r of rows) {
    const code = String(r.country_code).toUpperCase().trim();
    if (!code) continue;

    const isRegion = isRegionCode(code);
    const slug = countryCodeToSlug(code, r.country_name);
    const count = parseInt(String(r.count), 10) || 0;
    const minPrice = parseFloat(String(r.min_price)) || 0;
    const hasUnlimited = (parseInt(String(r.unlimited_count), 10) || 0) > 0;

    // Region name or canonical English name
    const name = isRegion ? regionLabel(code, 'en') : (isoName(code, 'en') || r.country_name || code);

    const existing = destMap.get(code);
    if (existing) {
      existing.count += count;
      if (hasUnlimited) existing.hasUnlimited = true;
      if (minPrice > 0 && (existing.minPrice === 0 || minPrice < existing.minPrice)) {
        existing.minPrice = minPrice;
      }
    } else {
      destMap.set(code, {
        code,
        name,
        slug,
        flag: r.flag_emoji || (isRegion ? '🌍' : null),
        isRegion,
        count,
        minPrice,
        hasUnlimited,
      });
    }
  }

  const result = Array.from(destMap.values());
  cachedDestinations = result;
  cacheTime = now;
  return result;
}

/**
 * Resolves a URL slug or search query to a destination.
 */
export async function getDestinationBySlug(rawSlug: string): Promise<Destination | null> {
  if (!rawSlug) return null;
  const slug = slugify(rawSlug);
  const destinations = await getAllDestinations();

  // 1. Direct slug match
  const directMatch = destinations.find((d) => d.slug === slug);
  if (directMatch) return directMatch;

  // 2. Direct code match (e.g. "de", "us", "eu")
  const upperCode = slug.toUpperCase();
  const codeMatch = destinations.find((d) => d.code === upperCode);
  if (codeMatch) return codeMatch;

  // 3. Known custom aliases
  if (CUSTOM_ALIASES[slug]) {
    const aliasCode = CUSTOM_ALIASES[slug];
    const match = destinations.find((d) => d.code === aliasCode);
    if (match) return match;
  }

  // 4. i18n aliases exact lookup ONLY (no prefix or substring matching)
  const withSpaces = slug.replace(/-/g, ' ');
  const exactCode = COUNTRY_ALIASES[slug] || COUNTRY_ALIASES[withSpaces] || REGION_ALIASES[slug] || REGION_ALIASES[withSpaces];
  if (exactCode) {
    const match = destinations.find((d) => d.code === exactCode.toUpperCase());
    if (match) return match;
  }

  // 5. Fallback: exact match of slugified destination name
  const nameMatch = destinations.find(
    (d) => slugify(d.name) === slug
  );
  if (nameMatch) return nameMatch;

  return null;
}

// In-memory cache for country tariffs
interface TariffCacheEntry {
  data: PublicTariff[];
  timestamp: number;
}
const countryTariffsCache = new Map<string, TariffCacheEntry>();
const inFlightTariffQueries = new Map<string, Promise<PublicTariff[]>>();
const COUNTRY_TARIFF_TTL = 10 * 60 * 1000; // 10 minutes

export function clearCountryTariffsCache(): void {
  countryTariffsCache.clear();
  inFlightTariffQueries.clear();
  cachedDestinations = null;
  cacheTime = 0;
}

/**
 * Fetch strictly public, sanitized tariffs for a specific country or region.
 * NEVER selects sensitive internal columns (ek_price_usd, usd_eur_rate).
 * Cached in-memory with singleflight deduplication and stale fallback on DB error.
 */
export async function getCountryTariffs(countryCode: string): Promise<PublicTariff[]> {
  const upperCode = countryCode.toUpperCase().trim();
  if (!upperCode) return [];

  const now = Date.now();
  const cached = countryTariffsCache.get(upperCode);
  if (cached && now - cached.timestamp < COUNTRY_TARIFF_TTL) {
    return cached.data;
  }

  // Deduplicate concurrent requests for the exact same country code
  const existingPromise = inFlightTariffQueries.get(upperCode);
  if (existingPromise) {
    return existingPromise;
  }

  const queryPromise = (async () => {
    try {
      const { rows } = await query(
        `SELECT id, package_code, slug, name, description, country_code, country_name, region,
                flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type,
                speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, discount_rule_code, raw_data
         FROM tariffs
         WHERE is_active = true AND country_code = $1
         ORDER BY sale_price_eur ASC`,
        [upperCode]
      );

      const tariffs = await Promise.all(
        rows.map(async (row: any) => {
          const t = toPublicTariff(row);
          t.customer_price_eur = await getTariffMinCustomerPrice(row);
          return t;
        })
      );
      countryTariffsCache.set(upperCode, {
        data: tariffs,
        timestamp: Date.now(),
      });
      return tariffs;
    } catch (err: any) {
      console.error(`[getCountryTariffs] DB error fetching tariffs for ${upperCode}:`, err?.message || err);
      // Return stale cache if available, preventing 500 error boundary
      if (cached?.data) {
        return cached.data;
      }
      return [];
    } finally {
      inFlightTariffQueries.delete(upperCode);
    }
  })();

  inFlightTariffQueries.set(upperCode, queryPromise);
  return queryPromise;
}

