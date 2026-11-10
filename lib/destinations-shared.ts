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
 * Whitelist of 211 active destination codes with available tariffs.
 * Zero-tariff codes (such as NA namibia, KP north-korea, ER eritrea, AS american-samoa) are excluded
 * to enforce immediate 404 response on /esim/* and /unlimited/*.
 */
export const ACTIVE_DESTINATION_CODES = new Set<string>([
  'AD', 'AE', 'AF', 'AFRICA', 'AG', 'AI', 'AL', 'AM', 'AO', 'AR', 'ASIA', 'AT', 'AU', 'AW', 'AX', 'AZ',
  'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BW',
  'BY', 'BZ', 'CA', 'CD', 'CF', 'CG', 'CH', 'CI', 'CL', 'CM', 'CN', 'CO', 'CR', 'CV', 'CW', 'CY', 'CZ',
  'DE', 'DK', 'DM', 'DO', 'DZ', 'EC', 'EE', 'EG', 'ES', 'ET', 'EUROPE', 'FI', 'FJ', 'FO', 'FR', 'GA',
  'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL', 'GLOB', 'GM', 'GN', 'GP', 'GR', 'GT', 'GU', 'GW', 'GY',
  'HK', 'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IQ', 'IS', 'IT', 'JE', 'JM', 'JO', 'JP',
  'KE', 'KG', 'KH', 'KN', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LATAM', 'LC', 'LI', 'LK', 'LR', 'LS', 'LT', 'LU',
  'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MIDDLE_EAST', 'MK', 'ML', 'MN', 'MO', 'MQ', 'MR', 'MS',
  'MT', 'MU', 'MV', 'MW', 'MX', 'MY', 'MZ', 'NC', 'NE', 'NG', 'NI', 'NL', 'NO', 'NORTH_AMERICA', 'NP', 'NR',
  'NZ', 'OCEANIA', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PR', 'PT', 'PY', 'QA', 'RE', 'RO',
  'RS', 'RU', 'RW', 'SA', 'SC', 'SD', 'SE', 'SEA', 'SG', 'SI', 'SK', 'SL', 'SM', 'SN', 'SR', 'SS', 'SV',
  'SZ', 'TC', 'TD', 'TG', 'TH', 'TJ', 'TN', 'TO', 'TR', 'TT', 'TZ', 'UA', 'UG', 'US', 'UY', 'UZ', 'VA',
  'VC', 'VE', 'VG', 'VN', 'VU', 'WS', 'XK', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]);

/**
 * Mapping of virtual regions to canonical SEO slugs.
 */
export const REGION_SLUGS: Record<string, string> = {
  EUROPE:        'europe',
  ASIA:          'asia',
  SEA:           'southeast-asia',
  MIDDLE_EAST:   'middle-east',
  NORTH_AMERICA: 'north-america',
  LATAM:         'latin-america',
  OCEANIA:       'oceania',
  AFRICA:        'africa',
  GLOB:          'global',
  EU:            'europe',
  OC:            'oceania',
  GLOBAL:        'global',
};

/**
 * Common slug overrides for ISO codes to ensure clean, human-friendly URLs.
 */
export const CODE_TO_SLUG_OVERRIDES: Record<string, string> = {
  DE:            'germany',
  TR:            'turkey',
  US:            'united-states',
  GB:            'united-kingdom',
  AE:            'united-arab-emirates',
  KR:            'south-korea',
  HK:            'hong-kong',
  MO:            'macao',
  DO:            'dominican-republic',
  ZA:            'south-africa',
  CZ:            'czech-republic',
  XK:            'kosovo',
  LA:            'laos',
  NA:            'namibia',
  EUROPE:        'europe',
  OCEANIA:       'oceania',
  AFRICA:        'africa',
  MIDDLE_EAST:   'middle-east',
  NORTH_AMERICA: 'north-america',
  LATAM:         'latin-america',
  GLOB:          'global',
  AF:            'afghanistan',
  ME:            'montenegro',
  AS:            'american-samoa',
  ASIA:          'asia',
};

/**
 * Known custom aliases for instant slug lookup.
 */
export const CUSTOM_ALIASES: Record<string, string> = {
  af: 'AF',
  afghanistan: 'AF',
  me: 'ME',
  montenegro: 'ME',
  na: 'NA',
  namibia: 'NA',
  africa: 'AFRICA',
  afrika: 'AFRICA',
  'middle-east': 'MIDDLE_EAST',
  'middle_east': 'MIDDLE_EAST',
  nahost: 'MIDDLE_EAST',
  'north-america': 'NORTH_AMERICA',
  nordamerika: 'NORTH_AMERICA',
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
  europa: 'EUROPE',
  europe: 'EUROPE',
  eu: 'EUROPE',
  asien: 'ASIA',
  asia: 'ASIA',
  ozeanien: 'OCEANIA',
  oceania: 'OCEANIA',
  oc: 'OCEANIA',
  weltweit: 'GLOB',
  global: 'GLOB',
  glob: 'GLOB',
};

/**
 * Returns canonical slug for a country or region code. Client-safe!
 */
export function countryCodeToSlug(code: string, fallbackName?: string): string {
  const upper = (code || '').toUpperCase().trim();
  const lowerName = (fallbackName || '').toLowerCase().trim();
  if (lowerName.includes('latin america') || lowerName.includes('lateinamerika')) {
    return 'latin-america';
  }
  if (lowerName.includes('north america') || lowerName.includes('nordamerika') || lowerName.includes('usa & canada') || lowerName.includes('us & canada')) {
    return 'north-america';
  }
  if (lowerName === 'middle east') {
    return 'middle-east';
  }
  if (lowerName === 'africa' || lowerName === 'afrika') {
    return 'africa';
  }
  if (upper === 'AS') {
    return 'american-samoa';
  }
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
  if (!CANONICAL_SLUG_TO_CODE[slug] || region.length > 2 || region === 'GLOB') {
    CANONICAL_SLUG_TO_CODE[slug] = region;
  }
}

// Canonical long regional keys must strictly win and never be overridden by short keys
CANONICAL_SLUG_TO_CODE['europe'] = 'EUROPE';
CANONICAL_SLUG_TO_CODE['oceania'] = 'OCEANIA';
CANONICAL_SLUG_TO_CODE['global'] = 'GLOB';
CANONICAL_SLUG_TO_CODE['asia'] = 'ASIA';
CANONICAL_SLUG_TO_CODE['north-america'] = 'NORTH_AMERICA';
CANONICAL_SLUG_TO_CODE['latin-america'] = 'LATAM';
CANONICAL_SLUG_TO_CODE['africa'] = 'AFRICA';
CANONICAL_SLUG_TO_CODE['middle-east'] = 'MIDDLE_EAST';
CANONICAL_SLUG_TO_CODE['southeast-asia'] = 'SEA';

/**
 * Resolves any query, alias, or slug to an ISO or region code.
 */
export function resolveCountryOrRegionCode(term: string): string | null {
  const q = slugify(term);
  if (!q) return null;

  let code: string | null = null;

  // 1. Direct match in precomputed canonical slug dictionary (100% of ISO codes & regions)
  if (CANONICAL_SLUG_TO_CODE[q]) {
    code = CANONICAL_SLUG_TO_CODE[q];
  } else {
    // 2. Direct 2-letter ISO code match (e.g. "de", "fr", "us")
    const directUpper = q.toUpperCase();
    if (directUpper.length === 2 && ALL_ISO_CODES.includes(directUpper)) {
      code = directUpper;
    } else if (REGION_SLUGS[directUpper]) {
      code = directUpper;
    } else if (CUSTOM_ALIASES[q]) {
      code = CUSTOM_ALIASES[q];
    } else {
      const withSpaces = q.replace(/-/g, ' ');
      const exactCode = COUNTRY_ALIASES[q] || COUNTRY_ALIASES[withSpaces] || REGION_ALIASES[q] || REGION_ALIASES[withSpaces];
      if (exactCode) {
        code = exactCode.toUpperCase();
      }
    }
  }

  if (code) {
    // Only normalize legacy EU, OC, GLOBAL to long canonical codes. NEVER normalize NA (Namibia) or other ISO codes!
    if (code === 'EU') return 'EUROPE';
    if (code === 'OC') return 'OCEANIA';
    if (code === 'GLOBAL') return 'GLOB';
    return code;
  }

  return null;
}
