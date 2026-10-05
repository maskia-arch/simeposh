import { isRegionCode, regionLabel, isoName } from '@/lib/tariff-display';
import { aliasToCode, aliasToRegion } from '@/lib/i18n/countryAliases';

export interface Destination {
  code: string;
  name: string;
  slug: string;
  flag: string | null;
  isRegion: boolean;
  count: number;
  minPrice: number;
}

export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Mapping of virtual regions to canonical SEO slugs.
 */
export const REGION_SLUGS: Record<string, string> = {
  EU:   'europe',
  AS:   'asia',
  SEA:  'southeast-asia',
  ME:   'middle-east',
  NA:   'north-america',
  LA:   'latin-america',
  OC:   'oceania',
  AF:   'africa',
  GLOB: 'global',
};

/**
 * Common slug overrides for ISO codes to ensure clean, human-friendly URLs.
 */
export const CODE_TO_SLUG_OVERRIDES: Record<string, string> = {
  DE: 'germany',
  TR: 'turkey',
  US: 'united-states',
  GB: 'united-kingdom',
  AE: 'united-arab-emirates',
  KR: 'south-korea',
  HK: 'hong-kong',
  MO: 'macao',
  DO: 'dominican-republic',
  ZA: 'south-africa',
  CZ: 'czech-republic',
};

/**
 * Known custom aliases for instant slug lookup.
 */
export const CUSTOM_ALIASES: Record<string, string> = {
  usa: 'US',
  us: 'US',
  uk: 'GB',
  gb: 'GB',
  turkey: 'TR',
  turkiye: 'TR',
  tuerkei: 'TR',
  tr: 'TR',
  germany: 'DE',
  deutschland: 'DE',
  niemcy: 'DE',
  de: 'DE',
  schweiz: 'CH',
  suisse: 'CH',
  svizzera: 'CH',
  switzerland: 'CH',
  ch: 'CH',
  oesterreich: 'AT',
  autriche: 'AT',
  austria: 'AT',
  at: 'AT',
  spanien: 'ES',
  espana: 'ES',
  spain: 'ES',
  es: 'ES',
  frankreich: 'FR',
  france: 'FR',
  fr: 'FR',
  italien: 'IT',
  italia: 'IT',
  italy: 'IT',
  it: 'IT',
  niederlande: 'NL',
  netherlands: 'NL',
  nl: 'NL',
  belgien: 'BE',
  belgium: 'BE',
  be: 'BE',
  griechenland: 'GR',
  greece: 'GR',
  gr: 'GR',
  aegypten: 'EG',
  egypt: 'EG',
  eg: 'EG',
  japan: 'JP',
  jp: 'JP',
  thailand: 'TH',
  th: 'TH',
  europa: 'EU',
  europe: 'EU',
  eu: 'EU',
  asien: 'AS',
  asia: 'AS',
  nordamerika: 'NA',
  lateinamerika: 'LA',
  ozeanien: 'OC',
  oceania: 'OC',
  afrika: 'AF',
  africa: 'AF',
  weltweit: 'GLOB',
  global: 'GLOB',
};

/**
 * Returns canonical slug for a country or region code. Client-safe!
 */
export function countryCodeToSlug(code: string, fallbackName?: string): string {
  const upper = (code || '').toUpperCase().trim();
  if (REGION_SLUGS[upper]) {
    return REGION_SLUGS[upper];
  }
  if (CODE_TO_SLUG_OVERRIDES[upper]) {
    return CODE_TO_SLUG_OVERRIDES[upper];
  }
  const enName = isoName(upper, 'en');
  if (enName && enName !== upper) {
    return slugify(enName);
  }
  return slugify(fallbackName || upper);
}

/**
 * Resolves any query, alias, or slug to an ISO or region code.
 */
export function resolveCountryOrRegionCode(term: string): string | null {
  const q = slugify(term);
  if (!q) return null;
  if (CUSTOM_ALIASES[q]) return CUSTOM_ALIASES[q];
  const directUpper = q.toUpperCase();
  if (REGION_SLUGS[directUpper]) return directUpper;
  const regionSlugMatch = Object.entries(REGION_SLUGS).find(([_, s]) => s === q);
  if (regionSlugMatch) return regionSlugMatch[0];
  const code = aliasToCode(q) || aliasToRegion(q);
  if (code) return code.toUpperCase();
  return null;
}
