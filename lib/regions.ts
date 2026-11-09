/**
 * Central Region Definitions and Lookup for PureSim
 *
 * Rules:
 * - Every region key has AT LEAST 3 characters.
 * - NEVER an ISO 3166-1 alpha-2 code (e.g. EU -> EUROPE, OC -> OCEANIA, NA -> NORTH_AMERICA).
 * - Central authority for region codes, names, slugs, and name detection.
 */

export interface RegionDefinition {
  code: string;
  slug: string;
  name: string;
  members: string[];
  minMatch: number;
  keywords: string[];
}

export const CENTRAL_REGION_CODES = [
  'ASIA',
  'EUROPE',
  'GLOB',
  'AFRICA',
  'MIDDLE_EAST',
  'LATAM',
  'OCEANIA',
  'SEA',
  'NORTH_AMERICA',
] as const;

export type CentralRegionCode = typeof CENTRAL_REGION_CODES[number];

export const REGION_DEFINITIONS: Record<CentralRegionCode, RegionDefinition> = {
  EUROPE: {
    code: 'EUROPE',
    slug: 'europe',
    name: 'Europe',
    members: [
      'AT','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR',
      'HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT',
      'RO','SE','SI','SK','AL','BA','ME','MK','RS','TR','UA','MD','GE','AM','AZ',
    ],
    minMatch: 5,
    keywords: ['europe', 'europa', 'european union'],
  },
  ASIA: {
    code: 'ASIA',
    slug: 'asia',
    name: 'Asia',
    members: [
      'CN','JP','KR','TH','VN','SG','MY','ID','PH','IN','BD','LK','MM','KH',
      'LA','MN','KZ','UZ','TJ','KG','TM','NP','BT','MV','PK','AF',
    ],
    minMatch: 4,
    keywords: ['asia', 'asien', 'asian'],
  },
  SEA: {
    code: 'SEA',
    slug: 'southeast-asia',
    name: 'Southeast Asia',
    members: ['SG','MY','TH','ID','PH','VN','MM','KH','LA','BN','TL'],
    minMatch: 4,
    keywords: ['southeast asia', 'südostasien', 'sudeste asiatico', 'south-east asia'],
  },
  MIDDLE_EAST: {
    code: 'MIDDLE_EAST',
    slug: 'middle-east',
    name: 'Middle East',
    members: ['AE','SA','QA','KW','BH','OM','JO','LB','IL','IQ','IR','YE','SY'],
    minMatch: 3,
    keywords: ['middle east', 'naher osten', 'moyen-orient', 'oriente medio', 'gulf', 'gcc'],
  },
  NORTH_AMERICA: {
    code: 'NORTH_AMERICA',
    slug: 'north-america',
    name: 'North America',
    members: ['US','CA','MX'],
    minMatch: 2,
    keywords: ['north america', 'nordamerika', 'usa & canada', 'us & canada', 'united states & canada', 'usa and canada'],
  },
  LATAM: {
    code: 'LATAM',
    slug: 'latin-america',
    name: 'Latin America',
    members: [
      'BR','AR','CL','CO','PE','VE','EC','BO','PY','UY','CR','PA','GT','HN',
      'SV','NI','DO','CU','JM','TT','BB','GY','SR',
    ],
    minMatch: 4,
    keywords: ['latin america', 'lateinamerika', 'south america', 'südamerika', 'sudamerica', 'amerique latine'],
  },
  OCEANIA: {
    code: 'OCEANIA',
    slug: 'oceania',
    name: 'Oceania',
    members: ['AU','NZ','FJ','PG','SB','VU','WS','TO','KI','FM','PW','MH','NR','TV'],
    minMatch: 2,
    keywords: ['oceania', 'ozeanien', 'oceanie', 'australia & new zealand', 'australia and new zealand'],
  },
  AFRICA: {
    code: 'AFRICA',
    slug: 'africa',
    name: 'Africa',
    members: [
      'ZA','NG','KE','GH','TZ','ET','EG','MA','TN','DZ','SN','CI','CM',
      'UG','ZW','MZ','ZM','BW','RW','MG','AO','SD','LY',
    ],
    minMatch: 4,
    keywords: ['africa', 'afrika', 'afrique'],
  },
  GLOB: {
    code: 'GLOB',
    slug: 'global',
    name: 'Global',
    members: [],
    minMatch: 40,
    keywords: ['global', 'worldwide', 'weltweit', 'international'],
  },
};

/**
 * Normalizes legacy 2-letter or non-standard region codes to canonical 3+ char keys.
 */
export function normalizeRegionCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (upper === 'EU') return 'EUROPE';
  if (upper === 'OC') return 'OCEANIA';
  if (upper === 'GLOBAL') return 'GLOB';
  if (upper === 'NA') return 'NORTH_AMERICA'; // When treated in region context
  return upper;
}

export function isCentralRegionCode(code: string | null | undefined): code is CentralRegionCode {
  if (!code) return false;
  const upper = code.trim().toUpperCase();
  return (CENTRAL_REGION_CODES as readonly string[]).includes(upper);
}

/**
 * Detect region from package name and location info using the central keyword list.
 */
export function detectRegionFromText(text: string): RegionDefinition | null {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const reg of Object.values(REGION_DEFINITIONS)) {
    for (const kw of reg.keywords) {
      if (lower.includes(kw)) {
        return reg;
      }
    }
  }
  return null;
}
