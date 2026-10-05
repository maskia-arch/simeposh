import { query } from '@/lib/db';
import { isRegionCode, regionLabel, isoName } from '@/lib/tariff-display';
import { aliasToCode, aliasToRegion } from '@/lib/i18n/countryAliases';
import { toPublicTariff, type PublicTariff } from '@/lib/tariffs';
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
    `SELECT country_code, country_name, flag_emoji, count(*) as count, min(sale_price_eur) as min_price
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

    // Region name or canonical English name
    const name = isRegion ? regionLabel(code, 'en') : (isoName(code, 'en') || r.country_name || code);

    const existing = destMap.get(code);
    if (existing) {
      existing.count += count;
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

  // 4. i18n aliases lookup
  const i18nCode = aliasToCode(slug);
  if (i18nCode) {
    const match = destinations.find((d) => d.code === i18nCode.toUpperCase());
    if (match) return match;
  }

  const i18nRegion = aliasToRegion(slug);
  if (i18nRegion) {
    const match = destinations.find((d) => d.code === i18nRegion.toUpperCase());
    if (match) return match;
  }

  // 5. Fallback: name contains slug or slug contains name
  const nameMatch = destinations.find(
    (d) => slugify(d.name) === slug || slug.includes(slugify(d.name))
  );
  if (nameMatch) return nameMatch;

  return null;
}

/**
 * Fetch strictly public, sanitized tariffs for a specific country or region.
 * NEVER selects sensitive internal columns (ek_price_usd, usd_eur_rate).
 */
export async function getCountryTariffs(countryCode: string): Promise<PublicTariff[]> {
  const upperCode = countryCode.toUpperCase().trim();
  const { rows } = await query(
    `SELECT id, package_code, slug, name, description, country_code, country_name, region,
            flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type,
            speed_kbps, label, is_top_up_eligible, raw_data
     FROM tariffs
     WHERE is_active = true AND country_code = $1
     ORDER BY sale_price_eur ASC`,
    [upperCode]
  );

  return rows.map(toPublicTariff);
}
