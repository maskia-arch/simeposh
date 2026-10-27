/**
 * Client-safe display helpers for tariffs.
 *
 * These run in the browser and clean up legacy / ugly stored names
 * (e.g. "2 Countries", "30 Länder", "5 Areas") into friendly labels
 * WITHOUT requiring a re-sync. Future syncs already store clean names.
 */
import type { Database } from '@/lib/supabase/types';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { formatGb } from '@/lib/utils';

type TariffLike = Pick<
  Database['public']['Tables']['tariffs']['Row'],
  'country_name' | 'country_code' | 'location_codes' | 'region'
>;

/** Explicit overrides for regions whose full names vary between Node SSR and browser Intl (e.g. HK, MO, GB, US). */
const COUNTRY_NAME_OVERRIDES: Record<string, Record<string, string>> = {
  HK: {
    en: 'Hong Kong', de: 'Hongkong', fr: 'Hong Kong', es: 'Hong Kong', it: 'Hong Kong',
    nl: 'Hongkong', pl: 'Hongkong', pt: 'Hong Kong', tr: 'Hong Kong', sv: 'Hongkong',
    da: 'Hongkong', fi: 'Hongkong', cs: 'Hongkong', ro: 'Hong Kong', hu: 'Hongkong'
  },
  MO: {
    en: 'Macau', de: 'Macau', fr: 'Macao', es: 'Macao', it: 'Macao',
    nl: 'Macau', pl: 'Makau', pt: 'Macau', tr: 'Makao', sv: 'Macao',
    da: 'Macao', fi: 'Macao', cs: 'Macao', ro: 'Macao', hu: 'Makaó'
  },
  TW: {
    en: 'Taiwan', de: 'Taiwan', fr: 'Taïwan', es: 'Taiwán', it: 'Taiwan',
    nl: 'Taiwan', pl: 'Tajwan', pt: 'Taiwan', tr: 'Tayvan', sv: 'Taiwan',
    da: 'Taiwan', fi: 'Taiwan', cs: 'Tchaj-wan', ro: 'Taiwan', hu: 'Tajvan'
  },
  GB: {
    en: 'United Kingdom', de: 'Vereinigtes Königreich', fr: 'Royaume-Uni', es: 'Reino Unido', it: 'Regno Unito',
    nl: 'Verenigd Koninkrijk', pl: 'Wielka Brytania', pt: 'Reino Unido', tr: 'Birleşik Krallık', sv: 'Storbritannien',
    da: 'Storbritannien', fi: 'Iso-Britannia', cs: 'Spojené království', ro: 'Regatul Unit', hu: 'Egyesült Királyság'
  },
  UK: {
    en: 'United Kingdom', de: 'Vereinigtes Königreich', fr: 'Royaume-Uni', es: 'Reino Unido', it: 'Regno Unito',
    nl: 'Verenigd Koninkrijk', pl: 'Wielka Brytania', pt: 'Reino Unido', tr: 'Birleşik Krallık', sv: 'Storbritannien',
    da: 'Storbritannien', fi: 'Iso-Britannia', cs: 'Spojené království', ro: 'Regatul Unit', hu: 'Egyesült Királyság'
  },
  US: {
    en: 'United States', de: 'Vereinigte Staaten', fr: 'États-Unis', es: 'Estados Unidos', it: 'Stati Uniti',
    nl: 'Verenigde Staten', pl: 'Stany Zjednoczone', pt: 'Estados Unidos', tr: 'Amerika Birleşik Devletleri', sv: 'USA',
    da: 'USA', fi: 'Yhdysvallat', cs: 'Spojené státy', ro: 'Statele Unite', hu: 'Egyesült Államok'
  },
  LA: {
    en: 'Laos', de: 'Laos', fr: 'Laos', es: 'Laos', it: 'Laos',
    nl: 'Laos', pl: 'Laos', pt: 'Laos', tr: 'Laos', sv: 'Laos',
    da: 'Laos', fi: 'Laos', cs: 'Laos', ro: 'Laos', hu: 'Laosz'
  }
};

/** Full localised country name from an ISO alpha-2 code. */
export function isoName(code: string, locale = 'en'): string {
  if (!code || code.length !== 2) return code;
  const upper = code.toUpperCase();
  const override = COUNTRY_NAME_OVERRIDES[upper]?.[locale] ?? COUNTRY_NAME_OVERRIDES[upper]?.en;
  if (override) return override;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(upper) ?? code;
  } catch {
    return code;
  }
}

/** Localised label for our virtual region codes across all 15 supported languages. */
const REGION_LABELS: Record<string, Record<string, string>> = {
  EU: {
    en: 'Europe', de: 'Europa', fr: 'Europe', es: 'Europa', it: 'Europa',
    nl: 'Europa', pl: 'Europa', pt: 'Europa', tr: 'Avrupa', sv: 'Europa',
    da: 'Europa', fi: 'Eurooppa', cs: 'Evropa', ro: 'Europa', hu: 'Európa'
  },
  AS: {
    en: 'Asia', de: 'Asien', fr: 'Asie', es: 'Asia', it: 'Asia',
    nl: 'Azië', pl: 'Azja', pt: 'Ásia', tr: 'Asya', sv: 'Asien',
    da: 'Asien', fi: 'Aasia', cs: 'Asie', ro: 'Asia', hu: 'Ázsia'
  },
  SEA: {
    en: 'Southeast Asia', de: 'Südostasien', fr: 'Asie du Sud-Est', es: 'Sudeste Asiático', it: 'Sud-est asiatico',
    nl: 'Zuidoost-Azië', pl: 'Azja Południowo-Wschodnia', pt: 'Sudeste Asiático', tr: 'Güneydoğu Asya', sv: 'Sydostasien',
    da: 'Sydøstasien', fi: 'Kaakkois-Aasia', cs: 'Jihovýchodní Asie', ro: 'Asia de Sud-Est', hu: 'Délkelet-Ázsia'
  },
  ME: {
    en: 'Middle East', de: 'Naher Osten', fr: 'Moyen-Orient', es: 'Oriente Medio', it: 'Medio Oriente',
    nl: 'Midden-Oosten', pl: 'Bliski Wschód', pt: 'Oriente Médio', tr: 'Orta Doğu', sv: 'Mellanöstern',
    da: 'Mellemøsten', fi: 'Lähi-itä', cs: 'Blízký východ', ro: 'Orientul Mijlociu', hu: 'Közel-Kelet'
  },
  NA: {
    en: 'North America', de: 'Nordamerika', fr: 'Amérique du Nord', es: 'Norteamérica', it: 'Nord America',
    nl: 'Noord-Amerika', pl: 'Ameryka Północna', pt: 'América do Norte', tr: 'Kuzey Amerika', sv: 'Nordamerika',
    da: 'Nordamerika', fi: 'Pohjois-Amerikka', cs: 'Severní Amerika', ro: 'America de Nord', hu: 'Észak-Amerika'
  },
  LATAM: {
    en: 'Latin America', de: 'Lateinamerika', fr: 'Amérique latine', es: 'Latinoamérica', it: 'America Latina',
    nl: 'Latijns-Amerika', pl: 'Ameryka Łacińska', pt: 'América Latina', tr: 'Latin Amerika', sv: 'Latinamerika',
    da: 'Latinamerika', fi: 'Latinalainen Amerikka', cs: 'Latinská Amerika', ro: 'America Latină', hu: 'Latin-Amerika'
  },
  OC: {
    en: 'Oceania', de: 'Ozeanien', fr: 'Océanie', es: 'Oceanía', it: 'Oceania',
    nl: 'Oceanië', pl: 'Oceania', pt: 'Oceania', tr: 'Okyanusya', sv: 'Oceanien',
    da: 'Oceanien', fi: 'Oseania', cs: 'Oceánie', ro: 'Oceania', hu: 'Óceánia'
  },
  AF: {
    en: 'Africa', de: 'Afrika', fr: 'Afrique', es: 'África', it: 'Africa',
    nl: 'Afrika', pl: 'Afryka', pt: 'África', tr: 'Afrika', sv: 'Afrika',
    da: 'Afrika', fi: 'Afrikka', cs: 'Afrika', ro: 'Africa', hu: 'Afrika'
  },
  GLOB: {
    en: 'Global', de: 'Weltweit', fr: 'Mondial', es: 'Global', it: 'Globale',
    nl: 'Wereldwijd', pl: 'Globalny', pt: 'Global', tr: 'Küresel', sv: 'Global',
    da: 'Global', fi: 'Maailmanlaajuinen', cs: 'Globální', ro: 'Global', hu: 'Globális'
  },
};

/** True if the code is one of our virtual region codes (EU, AS, ME, …). */
export function isRegionCode(code: string | null | undefined): boolean {
  return Object.prototype.hasOwnProperty.call(REGION_LABELS, (code ?? '').toUpperCase());
}

/** Localised label for a region code, falling back to English / the code itself. */
export function regionLabel(code: string, locale = 'en'): string {
  const entry = REGION_LABELS[(code ?? '').toUpperCase()];
  return entry ? (entry[locale] ?? entry.en) : code;
}

/** Matches legacy ugly placeholder names that we want to replace. */
const UGLY = /^\s*\d+\s*(countries|country|l[äa]nder|land|areas?|regions?|zones?)\b/i;

/**
 * Friendly, locale-aware display name for a tariff's coverage.
 *
 * "Germany"          → "Germany" / "Deutschland"
 * region tariff "EU" → "Europe"  / "Europa"
 * "2 Countries"      → "Germany & Austria" (rebuilt from location_codes)
 * huge bundle        → "Global"  / "Weltweit"
 */
export function displayCountryName(t: TariffLike, locale = 'en'): string {
  const code = (t.country_code ?? '').toUpperCase();

  // Virtual region code → localised region label
  // We only return 'Global' if the package covers 40+ countries. Smaller custom-named
  // multi-country packages (e.g. UK & Ireland) should show their custom names.
  if (REGION_LABELS[code] && (code !== 'GLOB' || (t.location_codes ?? []).length >= 40)) {
    return REGION_LABELS[code][locale] ?? REGION_LABELS[code].en;
  }

  const name  = (t.country_name ?? '').trim();
  const codes = t.location_codes ?? [];

  // Already a clean name → just localise pure single-country names
  if (name && !UGLY.test(name)) {
    if (codes.length === 1) return isoName(codes[0], locale);
    if (/^[A-Z]{2}$/.test(code) && codes.length <= 1) return isoName(code, locale);
    return name;
  }

  // Rebuild from coverage codes
  if (codes.length === 0) return name || isoName(code, locale);
  if (codes.length >= 40)  return REGION_LABELS.GLOB[locale] ?? 'Global';
  if (codes.length === 1)  return isoName(codes[0], locale);
  const names = codes.slice(0, 2).map((c) => isoName(c, locale));
  if (codes.length === 2)  return names.join(' & ');
  return `${names.join(', ')} +${codes.length - 2}`;
}

// ── Network operators ────────────────────────────────────────

export interface TariffOperator {
  name:        string;
  networkType?: string; // "2G" | "3G" | "4G" | "LTE" | "5G"
}

/**
 * Extract the covered network operators from a public tariff object or operator array.
 */
export function getTariffOperators(
  source: { operators?: TariffOperator[] | null } | TariffOperator[] | null | undefined,
  max = 6,
): TariffOperator[] {
  if (!source) return [];
  if (Array.isArray(source)) {
    return source.slice(0, max);
  }
  if (Array.isArray(source.operators)) {
    return source.operators.slice(0, max);
  }
  return [];
}

/** Best (highest) network generation among a set of operators. */
export function bestNetworkType(ops: TariffOperator[]): string | null {
  const types = ops.map((o) => (o.networkType ?? '').toUpperCase());
  if (types.some((t) => t.includes('5G'))) return '5G';
  if (types.some((t) => t.includes('4G') || t.includes('LTE'))) return '4G';
  if (types.some((t) => t.includes('3G'))) return '3G';
  return null;
}

/** Short coverage hint, e.g. "33 Länder" / "33 countries" for region tariffs. */
export function coverageLabel(t: TariffLike, locale = 'en'): string | null {
  const codes = t.location_codes ?? [];
  if (codes.length <= 1) return null;
  const words: Record<string, string> = {
    de: 'Länder', en: 'countries', fr: 'pays', es: 'países', it: 'paesi',
    nl: 'landen', pl: 'krajów', pt: 'países', tr: 'ülke', sv: 'länder',
    da: 'lande', fi: 'maata', cs: 'zemí', ro: 'țări', hu: 'ország'
  };
  const word = words[locale] || 'countries';
  return `${codes.length} ${word}`;
}

/**
 * Strips technical raw suffixes like "(nonhkip)" or "nonhkip" from package names
 * so the card title looks clean and professional to customers.
 */
export function cleanTariffName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\s*\(\s*(?:AUIP|USIP(?:-FIFA)?|IIJ|MYIP|non-?hk-?ip|\d+\s*areas)\s*\)/gi, '')
    .replace(/\s+Premium\b/gi, '')
    .replace(/\s+non-?hk-?ip\b/gi, '')
    .replace(/\s+FUP\d+(?:[km]bps)?/gi, '')
    .trim();
}

/**
 * Localizes the tariff title by substituting the English country name
 * with the localized country name, and localizing /Day suffixes.
 */
export function formatLocalizedTariffName(
  tariffName: string | null | undefined,
  countryLabel: string,
  englishCountryName?: string,
  locale = 'de'
): string {
  if (!tariffName) return '';
  let name = cleanTariffName(tariffName);
  const enName = (englishCountryName || '').trim();

  // If name starts with English country name or common variants, replace it with the localized country name
  const candidateNames: string[] = [];
  if (enName) candidateNames.push(enName);
  // Special alias handling: Türkiye vs Turkey, USA vs United States, etc.
  if (enName.toLowerCase() === 'türkiye' || enName.toLowerCase() === 'turkey') {
    candidateNames.push('Turkey', 'Türkiye');
  } else if (enName.toLowerCase() === 'united states' || enName.toLowerCase() === 'usa') {
    candidateNames.push('United States', 'USA');
  } else if (enName.toLowerCase() === 'united kingdom' || enName.toLowerCase() === 'uk') {
    candidateNames.push('United Kingdom', 'UK');
  } else if (enName.toLowerCase() === 'latin america' || enName.toLowerCase() === 'latam' || enName.toLowerCase() === 'south america') {
    candidateNames.push('Latin America', 'South America', 'Lateinamerika');
  }

  // Check if tariffName starts with any of the candidate names
  const SOUTH_AMERICA_LOCALIZED: Record<string, string> = {
    de: 'Südamerika', es: 'Sudamérica', fr: 'Amérique du Sud', pt: 'América do Sul',
    it: 'Sud America', nl: 'Zuid-Amerika', pl: 'Ameryka Południowa', tr: 'Güney Amerika',
    sv: 'Sydamerika', da: 'Sydamerika', fi: 'Etelä-Amerikka', cs: 'Jižní Amerika',
    ro: 'America de Sud', hu: 'Dél-Amerika', en: 'South America'
  };

  let matchedPrefix = '';
  for (const cand of candidateNames) {
    const regex = new RegExp(`^${cand}\\b`, 'i');
    if (regex.test(name)) {
      matchedPrefix = cand;
      const repl = cand.toLowerCase() === 'south america'
        ? (SOUTH_AMERICA_LOCALIZED[locale] || countryLabel)
        : countryLabel;
      name = name.replace(regex, repl);
      break;
    }
  }

  // Fallback: If countryLabel is provided and name begins with "Turkey" but country was not in candidateNames
  if (!matchedPrefix && countryLabel) {
    if (/^turkey\b/i.test(name) && /türk|turk/i.test(countryLabel)) {
      name = name.replace(/^turkey\b/i, countryLabel);
    }
  }

  // Ensure space between digit and data unit: 500MB -> 500 MB
  name = name.replace(/(\d+)\s*(MB|GB)\b/gi, '$1 $2');

  // Localize "/Day" suffix, and ensure English uses lowercase "/day"
  if (/\b(?:per\s+day|\/day)\b/i.test(name) || /\/day\b/i.test(name)) {
    const dayWords: Record<string, string> = {
      de: '/Tag',
      fr: '/jour',
      es: '/día',
      it: '/giorno',
      nl: '/dag',
      pl: '/dzień',
      pt: '/dia',
      tr: '/gün',
      sv: '/dag',
      da: '/dag',
      fi: '/päivä',
      cs: '/den',
      ro: '/zi',
      hu: '/nap',
      en: '/day',
    };
    const dayWord = dayWords[locale] || '/day';
    name = name.replace(/\b(?:per\s+day|\/day)\b|\/day\b/gi, dayWord);
  }

  // Localize standalone days duration, e.g. "30Days", "30 Days", "7Days", "1Day"
  name = name.replace(/\b(\d+)\s*Days?\b/gi, (_, count) => {
    return formatDaysWithUnit(parseInt(count, 10), locale);
  });

  // Insert middle dot separator between country and data portion if not already present
  if (countryLabel && name.startsWith(countryLabel)) {
    const remainder = name.slice(countryLabel.length).trim();
    if (remainder && !remainder.startsWith('·') && !remainder.startsWith('-')) {
      name = `${countryLabel} · ${remainder}`;
    }
  }

  return name;
}

export interface CheckoutTariffInput {
  countryName?: string | null;
  countryCode?: string | null;
  locationCodes?: string[] | null;
  region?: string | null;
  tariffType?: string | null;
  isPremium?: boolean | null;
  dataGb?: number | null;
  validityDays?: number | null;
  periodDays?: number | null;
  name?: string | null;
}

const PER_DAY_SUFFIXES: Record<string, string> = {
  de: '/Tag',
  en: '/day',
  fr: '/jour',
  es: '/día',
  it: '/giorno',
  nl: '/dag',
  pl: '/dzień',
  pt: '/dia',
  tr: '/gün',
  sv: '/dag',
  da: '/dag',
  fi: '/päivä',
  cs: '/den',
  ro: '/zi',
  hu: '/nap',
};

function extractGbFromName(name: string): number | null {
  const mbMatch = name.match(/(\d+)\s*MB/i);
  if (mbMatch) return parseInt(mbMatch[1], 10) / 1024;
  const gbMatch = name.match(/(\d+(?:\.\d+)?)\s*GB/i);
  if (gbMatch) return parseFloat(gbMatch[1]);
  return null;
}

/**
 * Constructs the canonical, fully localized checkout tariff name including
 * localized country, English proper tariff type (Unlimited Pro / Unlimited Eco / Travel Standard / Travel Premium),
 * localized data volume, and localized validity duration.
 *
 * Examples:
 *   de: "Deutschland · Unlimited Pro · 1 GB/Tag · 28 Tage"
 *   en: "Germany · Unlimited Pro · 1 GB/day · 28 days"
 *   cs: "Německo · Unlimited Pro · 1 GB/den · 28 dní"
 *   tr: "Almanya · Unlimited Pro · 1 GB/gün · 28 gün"
 *   de: "Deutschland · Travel Standard · 5 GB · 30 Tage"
 */
export function formatFullCheckoutTariffName(
  tariff: CheckoutTariffInput,
  locale = 'de'
): string {
  if (!tariff) return '';

  // 1. Resolve country label
  const countryLabel = displayCountryName(
    {
      country_name: tariff.countryName ?? '',
      country_code: tariff.countryCode ?? '',
      location_codes: tariff.locationCodes ?? null,
      region: tariff.region ?? null,
    },
    locale
  );

  // 2. Resolve tariff type (English proper noun)
  let typeLabel = '';
  const rawType = (tariff.tariffType ?? '').toLowerCase();
  const rawName = (tariff.name ?? '').toLowerCase();
  const isPrem = typeof tariff.isPremium === 'boolean'
    ? tariff.isPremium
    : isPremiumTariff({ name: tariff.name, tariff_type: tariff.tariffType });

  if (rawType === 'unlimited_pro' || rawName.includes('unlimited pro')) {
    typeLabel = 'Unlimited Pro';
  } else if (rawType === 'unlimited_eco' || rawName.includes('unlimited eco')) {
    typeLabel = 'Unlimited Eco';
  } else if (rawType.startsWith('unlimited') || rawName.includes('/day') || rawName.includes('/tag') || tariff.dataGb === 0) {
    typeLabel = rawName.includes('pro') ? 'Unlimited Pro' : 'Unlimited Eco';
  } else if (isPrem || rawType === 'travel_premium') {
    typeLabel = 'Travel Premium';
  } else {
    typeLabel = 'Travel Standard';
  }

  // 3. Resolve data volume
  let volumeLabel = '';
  const isUnlimited = typeLabel.startsWith('Unlimited');
  const gb = tariff.dataGb ?? (tariff.name ? extractGbFromName(tariff.name) : null);
  if (isUnlimited) {
    const effectiveGb = gb && gb > 0 ? gb : 1;
    const dayWord = PER_DAY_SUFFIXES[locale] || '/day';
    volumeLabel = `${formatGb(effectiveGb)}${dayWord}`;
  } else if (gb && gb > 0) {
    volumeLabel = formatGb(gb);
  }

  // 4. Resolve validity / duration
  const days = tariff.periodDays ?? tariff.validityDays ?? null;
  const validityLabel = days && days > 0 ? formatDaysWithUnit(days, locale) : '';

  // 5. Combine with middle dots
  return [countryLabel, typeLabel, volumeLabel, validityLabel].filter(Boolean).join(' · ');
}

/**
 * Checks if a tariff has Non-HK IP routing.
 */
export function isNonHkIpTariff(tariff: {
  name?: string | null;
  package_code?: string | null;
  description?: string | null;
  is_non_hk_ip?: boolean | null;
}): boolean {
  if (typeof tariff.is_non_hk_ip === 'boolean') return tariff.is_non_hk_ip;
  const nameStr = (tariff.name ?? '').toLowerCase();
  const codeStr = (tariff.package_code ?? '').toLowerCase();
  const descStr = (tariff.description ?? '').toLowerCase();

  return (
    nameStr.includes('nonhk') || nameStr.includes('non-hk') ||
    codeStr.includes('nonhk') || codeStr.includes('non-hk') ||
    descStr.includes('nonhk') || descStr.includes('non-hk')
  );
}

/**
 * Checks if a tariff has HK IP routing (explicit breakout_ip === 'HK' or default standard routing).
 */
export function isHkIpTariff(tariff: {
  breakout_ip?: string | null;
  name?: string | null;
  package_code?: string | null;
  description?: string | null;
  is_non_hk_ip?: boolean | null;
  is_premium?: boolean | null;
}): boolean {
  if (isNonHkIpTariff(tariff) || isPremiumTariff(tariff)) return false;
  const ip = (tariff.breakout_ip ?? '').toUpperCase().trim();
  if (ip === 'HK') return true;
  // If no other breakout_ip is specified and it's not non-hk/premium, it routes via HK
  return !ip || ip === 'HK';
}


/**
 * Checks if a tariff is a Premium tariff (e.g. Travel Premium / Dual-Network redundancy).
 */
export function isPremiumTariff(tariff: {
  is_premium?: boolean | null;
  tariff_type?: string | null;
  name?: string | null;
  package_code?: string | null;
  description?: string | null;
  slug?: string | null;
}): boolean {
  if (typeof tariff.is_premium === 'boolean') return tariff.is_premium;
  if (tariff.tariff_type === 'travel_premium') return true;
  return false;
}

/**
 * Extract Breakout IP export country/location code (e.g. "UK", "NL", "SG").
 */
export function getTariffBreakoutIp(tariff: {
  breakout_ip?: string | null;
}): string | null {
  return tariff.breakout_ip ?? null;
}

/**
 * Checks if a tariff applies to Turkey (TR).
 */
export function isTurkeyTariff(tariff: {
  country_code?: string | null;
  location_codes?: string[] | null;
}): boolean {
  const code = (tariff.country_code ?? '').toUpperCase();
  if (code === 'TR') return true;
  const codes = tariff.location_codes ?? [];
  return codes.length === 1 && codes[0].toUpperCase() === 'TR';
}

export interface TariffSpecialFeature {
  id: 'non_hk_ip' | 'activation_on_arrival' | 'topup_eligible' | 'topup_days' | 'topup_data' | 'topup_none' | 'has_5g' | 'travel_premium';
  badgeKey: string;
  titleKey: string;
  descKey: string;
  priceNoteKey?: string;
  icon: string;
  cls: string;
  extra?: string;
  vars?: Record<string, string | number>;
}

export interface ReloadabilityInfo {
  type: 'days' | 'data' | 'none';
  labelKey: string;
  badgeKey: string;
  titleKey: string;
  descKey: string;
  icon: string;
  isReloadable: boolean;
}

/**
 * Determine reloadability classification:
 * - 'days': Unlimited / validity extension
 * - 'data': Fixed data top-up
 * - 'none': Not reloadable
 */
export function getReloadabilityInfo(tariff: {
  tariff_type?: string | null;
  data_gb?: number | null;
  is_top_up_eligible?: boolean | null;
  reloadability_type?: 'days' | 'data' | 'none' | null;
  is_reloadable?: boolean | null;
}): ReloadabilityInfo {
  const type = tariff.reloadability_type;
  if (type === 'days') {
    return {
      type: 'days',
      labelKey: 'det_reloadable_unlimited',
      badgeKey: 'feat_topup_days_badge',
      titleKey: 'feat_topup_days_title',
      descKey: 'feat_topup_days_desc',
      icon: '🔄',
      isReloadable: true,
    };
  }
  if (type === 'data') {
    return {
      type: 'data',
      labelKey: 'det_reloadable',
      badgeKey: 'feat_topup_data_badge',
      titleKey: 'feat_topup_data_title',
      descKey: 'feat_topup_data_desc',
      icon: '🔄',
      isReloadable: true,
    };
  }
  if (type === 'none') {
    return {
      type: 'none',
      labelKey: 'det_not_reloadable',
      badgeKey: 'feat_topup_none_badge',
      titleKey: 'feat_topup_none_title',
      descKey: 'feat_topup_none_desc',
      icon: '🚫',
      isReloadable: false,
    };
  }

  // Fallback if reloadability_type is not explicitly set
  const isEligible = tariff.is_reloadable === true || tariff.is_top_up_eligible === true;
  if (isEligible) {
    const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
    if (isUnlimited) {
      return {
        type: 'days',
        labelKey: 'det_reloadable_unlimited',
        badgeKey: 'feat_topup_days_badge',
        titleKey: 'feat_topup_days_title',
        descKey: 'feat_topup_days_desc',
        icon: '🔄',
        isReloadable: true,
      };
    }
    return {
      type: 'data',
      labelKey: 'det_reloadable',
      badgeKey: 'feat_topup_data_badge',
      titleKey: 'feat_topup_data_title',
      descKey: 'feat_topup_data_desc',
      icon: '🔄',
      isReloadable: true,
    };
  }

  return {
    type: 'none',
    labelKey: 'det_not_reloadable',
    badgeKey: 'feat_topup_none_badge',
    titleKey: 'feat_topup_none_title',
    descKey: 'feat_topup_none_desc',
    icon: '🚫',
    isReloadable: false,
  };
}

/**
 * Extract all active special features for a tariff.
 */
const DUAL_NETWORK_LABEL: Record<string, string> = {
  de: '(2 Netze)',
  en: '(2 Networks)',
  fr: '(2 Réseaux)',
  es: '(2 Redes)',
  it: '(2 Reti)',
  nl: '(2 Netwerken)',
  pl: '(2 Sieci)',
  pt: '(2 Redes)',
  tr: '(2 Ağ)',
  sv: '(2 Nätverk)',
  da: '(2 Netværk)',
  fi: '(2 Verkkoa)',
  cs: '(2 Sítě)',
  ro: '(2 Rețele)',
  hu: '(2 Hálózat)',
};

export function isLocalIpTariff(tariff: {
  country_code?: string | null;
  breakout_ip?: string | null;
  name?: string | null;
  package_code?: string | null;
  raw_data?: any;
}): boolean {
  const code = (tariff.country_code ?? '').toUpperCase();
  const ip = (getTariffBreakoutIp(tariff as any) ?? '').toUpperCase();
  if (code && ip && (code === ip || (code === 'USA' && ip === 'US') || (code === 'GB' && ip === 'UK'))) {
    return true;
  }
  const name = (tariff.name ?? '').toUpperCase();
  const pkg = (tariff.package_code ?? '').toUpperCase();
  if (name.includes('AUIP') || pkg.includes('AUIP') || (code === 'AU' && ip === 'AU')) return true;
  if (name.includes('USIP') || pkg.includes('USIP') || (code === 'US' && ip === 'US')) return true;
  if (name.includes('MYIP') || pkg.includes('MYIP') || (code === 'MY' && ip === 'MY')) return true;
  if (name.includes('IIJ') || pkg.includes('IIJ') || (code === 'JP' && (ip === 'JP' || name.includes('IIJ')))) return true;
  return false;
}

export function getTariffSpecialFeatures(
  tariff: {
    name?: string | null;
    package_code?: string | null;
    description?: string | null;
    tariff_type?: string | null;
    data_gb?: number | null;
    is_top_up_eligible?: boolean | null;
    operators?: TariffOperator[];
    breakout_ip?: string | null;
    is_premium?: boolean | null;
    is_non_hk_ip?: boolean | null;
    is_reloadable?: boolean | null;
    reloadability_type?: 'days' | 'data' | 'none' | null;
    country_code?: string | null;
    location_codes?: string[] | null;
    activates_on_arrival?: boolean | null;
  },
  locale: string = 'en',
): TariffSpecialFeature[] {
  const features: TariffSpecialFeature[] = [];

  // 0. Travel Premium Advantage Chip (exactly one chip: Local IP, Non-HK, or Multi-IP)
  if (isPremiumTariff(tariff)) {
    const isLocal = isLocalIpTariff(tariff as any);
    const isNonHk = isNonHkIpTariff(tariff as any);
    const countryName = displayCountryName(tariff as any, locale);

    if (isLocal) {
      features.push({
        id: 'travel_premium',
        badgeKey: 'feat_prem_adv_local_ip',
        titleKey: 'feat_prem_adv_local_ip',
        descKey: 'feat_prem_adv_local_ip_desc',
        icon: '📍',
        cls: 'bg-amber-50 text-amber-950 border-amber-300 hover:bg-amber-100 font-bold',
        vars: { country: countryName },
      });
    } else if (isNonHk) {
      features.push({
        id: 'travel_premium',
        badgeKey: 'feat_prem_adv_non_hk',
        titleKey: 'feat_prem_adv_non_hk',
        descKey: 'feat_prem_adv_non_hk_desc',
        icon: '🛡️',
        cls: 'bg-indigo-50 text-indigo-950 border-indigo-200 hover:bg-indigo-100 font-bold',
      });
    } else {
      features.push({
        id: 'travel_premium',
        badgeKey: 'feat_prem_adv_multi_ip',
        titleKey: 'feat_prem_adv_multi_ip',
        descKey: 'feat_prem_adv_multi_ip_desc',
        icon: '🌐',
        cls: 'bg-sky-50 text-sky-950 border-sky-200 hover:bg-sky-100 font-bold',
      });
    }
  }

  // 1. Non-HK IP (for Travel Standard tariffs that route outside HK)
  if (!isPremiumTariff(tariff) && isNonHkIpTariff(tariff)) {
    const ipExp = getTariffBreakoutIp(tariff);
    features.push({
      id: 'non_hk_ip',
      badgeKey: 'feat_non_hk_ip_badge',
      titleKey: 'feat_non_hk_ip_title',
      descKey: 'feat_non_hk_ip_desc',
      priceNoteKey: 'feat_non_hk_ip_price_note',
      icon: '🛡️',
      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      extra: ipExp ? `IP Export: ${ipExp}` : undefined,
    });
  }

  // 2. Activation on Arrival (controlled strictly by activates_on_arrival === true)
  if (tariff.activates_on_arrival === true) {
    features.push({
      id: 'activation_on_arrival',
      badgeKey: 'feat_activation_arrival_badge',
      titleKey: 'feat_activation_arrival_title',
      descKey: 'feat_activation_arrival_desc',
      icon: '📶',
      cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
    });
  }

  // 3. 5G Network Ready
  const ops = getTariffOperators(tariff, 10);
  if (bestNetworkType(ops) === '5G') {
    features.push({
      id: 'has_5g',
      badgeKey: 'feat_5g_badge',
      titleKey: 'feat_5g_title',
      descKey: 'feat_5g_desc',
      icon: '⚡',
      cls: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    });
  }

  // 4. Reloadability Feature Badge (differentiated according to eSIMAccess API specs)
  const reload = getReloadabilityInfo(tariff);
  if (reload.type === 'days') {
    features.push({
      id: 'topup_days',
      badgeKey: reload.badgeKey,
      titleKey: reload.titleKey,
      descKey: reload.descKey,
      icon: reload.icon,
      cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
    });
  } else if (reload.type === 'data') {
    features.push({
      id: 'topup_data',
      badgeKey: reload.badgeKey,
      titleKey: reload.titleKey,
      descKey: reload.descKey,
      icon: reload.icon,
      cls: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100',
    });
  } else {
    features.push({
      id: 'topup_none',
      badgeKey: reload.badgeKey,
      titleKey: reload.titleKey,
      descKey: reload.descKey,
      icon: reload.icon,
      cls: 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200',
    });
  }

  return features;
}

/**
 * Returns the activation sentence key under "Activation & Setup"
 * strictly driven by activates_on_arrival boolean.
 *
 * If activates_on_arrival === true:
 *   EN: "Validity starts counting upon your first connection to the local network."
 *   DE: "Die Laufzeit beginnt mit der ersten Verbindung zum lokalen Netz."
 * If activates_on_arrival is false, null, or undefined:
 *   EN: "Validity starts when the eSIM is installed/activated."
 *   DE: "Die Laufzeit beginnt mit dem Installieren oder Aktivieren der eSIM."
 */
export function getTariffActivationNoticeKey(tariff: {
  activates_on_arrival?: boolean | null;
}): 'det_act_4_arrival' | 'det_act_4_installed' {
  return tariff.activates_on_arrival === true
    ? 'det_act_4_arrival'
    : 'det_act_4_installed';
}

/**
 * Returns the speed description for an unlimited tariff.
 * For unlimited_eco: uses tariff.throttle_speed if present, or generic note without 512 kbps fallback.
 * For unlimited_pro: uses pro description.
 */
export function getTariffSpeedDesc(
  tariff: { tariff_type?: string | null; throttle_speed?: string | null },
  t: (key: any, vars?: Record<string, string | number>) => string,
): string {
  if (tariff.tariff_type === 'unlimited_eco') {
    const speed = tariff.throttle_speed?.trim();
    if (speed) {
      return t('tp_eco_desc', { speed });
    }
    return t('tp_eco_desc_generic');
  }
  return t('tp_pro_desc');
}

/**
 * Determines the single "Empfohlen" (Recommended) tariff ID for a list of tariffs.
 * In a destination / country view, travelers typically look for a solid 10 GB (30 days)
 * or 5 GB (30 days) plan, or the most popular mid-tier plan.
 * Returns null if list is empty or represents the un-scoped multi-country catalog.
 */
export function getRecommendedTariffId<T extends { id: string; data_gb?: number | null; validity_days?: number | null; tariff_type?: string | null; sale_price_eur?: number | null }>(
  tariffs: T[],
): string | null {
  if (!tariffs || tariffs.length === 0) return null;

  // Filter to standard/travel data plans first
  const travelPlans = tariffs.filter((t) => !t.tariff_type?.startsWith('unlimited') && (t.data_gb ?? 0) > 0);
  const pool = travelPlans.length > 0 ? travelPlans : tariffs;

  // 1. Ideal candidate: 10 GB with 30 days
  const plan10Gb = pool.find((t) => t.data_gb === 10 && t.validity_days === 30);
  if (plan10Gb) return plan10Gb.id;

  // 2. Candidate: 5 GB with 30 days
  const plan5Gb = pool.find((t) => t.data_gb === 5 && t.validity_days === 30);
  if (plan5Gb) return plan5Gb.id;

  // 3. Candidate: 3 GB (15 or 30 days)
  const plan3Gb = pool.find((t) => t.data_gb === 3);
  if (plan3Gb) return plan3Gb.id;

  // 4. Candidate: 10 GB or 5 GB any duration
  const any10or5 = pool.find((t) => t.data_gb === 10 || t.data_gb === 5);
  if (any10or5) return any10or5.id;

  // 5. Fallback: median-priced plan in the pool
  const sorted = [...pool].sort((a, b) => (a.sale_price_eur ?? 0) - (b.sale_price_eur ?? 0));
  const midIndex = Math.floor(sorted.length / 2);
  return sorted[midIndex]?.id ?? pool[0].id;
}


