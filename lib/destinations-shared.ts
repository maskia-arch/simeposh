import { COUNTRY_ALIASES, REGION_ALIASES } from '@/lib/i18n/countryAliases';
import { isoName } from '@/lib/tariff-display';

export interface Destination {
  code: string;
  name: string;
  slug: string;
  flag: string | null;
  isRegion: boolean;
  count: number;
  minPrice: number;
  hasUnlimited?: boolean;
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
  EU:    'europe',
  AS:    'asia',
  SEA:   'southeast-asia',
  ME:    'middle-east',
  NA:    'north-america',
  LATAM: 'latin-america',
  OC:    'oceania',
  AF:    'africa',
  GLOB:  'global',
};

/**
 * Common slug overrides for ISO codes to ensure clean, human-friendly URLs.
 */
export const CODE_TO_SLUG_OVERRIDES: Record<string, string> = {
  DE:    'germany',
  TR:    'turkey',
  US:    'united-states',
  GB:    'united-kingdom',
  AE:    'united-arab-emirates',
  KR:    'south-korea',
  HK:    'hong-kong',
  MO:    'macao',
  DO:    'dominican-republic',
  ZA:    'south-africa',
  CZ:    'czech-republic',
  XK:    'kosovo',
  LA:    'laos',
  LATAM: 'latin-america',
};

/**
 * Known custom aliases for instant slug lookup.
 */
export const CUSTOM_ALIASES: Record<string, string> = {
  laos: 'LA',
  la: 'LA',
  'latin-america': 'LATAM',
  latam: 'LATAM',
  latin_america: 'LATAM',
  lateinamerika: 'LATAM',
  macau: 'MO',
  macao: 'MO',
  kosovo: 'XK',
  xk: 'XK',
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
 * Complete ISO 3166-1 alpha-2 country code list (+ XK for Kosovo).
 */
export const ALL_ISO_CODES = [
  'AD','AE','AF','AG','AI','AL','AM','AO','AQ','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BI','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BV','BW','BY','BZ','CA','CC','CD','CF','CG','CH','CI','CK','CL','CM','CN',
  'CO','CR','CU','CV','CW','CX','CY','CZ','DE','DJ','DK','DM','DO','DZ','EC','EE',
  'EG','EH','ER','ES','ET','FI','FJ','FK','FM','FO','FR','GA','GB','GD','GE','GF',
  'GG','GH','GI','GL','GM','GN','GP','GQ','GR','GS','GT','GU','GW','GY','HK','HM',
  'HN','HR','HT','HU','ID','IE','IL','IM','IN','IO','IQ','IR','IS','IT','JE','JM',
  'JO','JP','KE','KG','KH','KI','KM','KN','KP','KR','KW','KY','KZ','LA','LB','LC',
  'LI','LK','LR','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MG','MH','MK',
  'ML','MM','MN','MO','MP','MQ','MR','MS','MT','MU','MV','MW','MX','MY','MZ','NA',
  'NC','NE','NF','NG','NI','NL','NO','NP','NR','NU','NZ','OM','PA','PE','PF','PG',
  'PH','PK','PL','PM','PN','PR','PS','PT','PW','PY','QA','RE','RO','RS','RU','RW',
  'SA','SB','SC','SD','SE','SG','SH','SI','SJ','SK','SL','SM','SN','SO','SR','SS',
  'ST','SV','SX','SY','SZ','TC','TD','TF','TG','TH','TJ','TK','TL','TM','TN','TO',
  'TR','TT','TV','TW','TZ','UA','UG','UM','US','UY','UZ','VA','VC','VE','VG','VI',
  'VN','VU','WF','WS','XK','YE','YT','ZA','ZM','ZW'
];

/**
 * Precomputed map from all canonical slugs to their ISO or region code.
 */
export const CANONICAL_SLUG_TO_CODE: Record<string, string> = {};

for (const code of ALL_ISO_CODES) {
  const slug = countryCodeToSlug(code);
  if (slug) {
    CANONICAL_SLUG_TO_CODE[slug] = code;
  }
}
for (const [code, slug] of Object.entries(CODE_TO_SLUG_OVERRIDES)) {
  CANONICAL_SLUG_TO_CODE[slug] = code;
}
for (const [region, slug] of Object.entries(REGION_SLUGS)) {
  CANONICAL_SLUG_TO_CODE[slug] = region;
}

/**
 * Resolves any query, alias, or slug to an ISO or region code.
 */
export function resolveCountryOrRegionCode(term: string): string | null {
  const q = slugify(term);
  if (!q) return null;

  // 1. Direct match in precomputed canonical slug dictionary (100% of ISO codes & regions)
  if (CANONICAL_SLUG_TO_CODE[q]) {
    return CANONICAL_SLUG_TO_CODE[q];
  }

  // 2. Direct 2-letter ISO code match (e.g. "de", "fr", "us")
  const directUpper = q.toUpperCase();
  if (directUpper.length === 2 && ALL_ISO_CODES.includes(directUpper)) {
    return directUpper;
  }

  // 3. Region code direct match
  if (REGION_SLUGS[directUpper]) {
    return directUpper;
  }

  // 4. Custom alias match
  if (CUSTOM_ALIASES[q]) {
    return CUSTOM_ALIASES[q];
  }

  // 5. Slug with spaces fallback for country aliases (e.g. "south africa", "saint lucia")
  const withSpaces = q.replace(/-/g, ' ');

  // 6. i18n aliases exact lookup ONLY (no prefix or substring matching)
  const exactCode = COUNTRY_ALIASES[q] || COUNTRY_ALIASES[withSpaces] || REGION_ALIASES[q] || REGION_ALIASES[withSpaces];
  if (exactCode) {
    return exactCode.toUpperCase();
  }

  return null;
}
