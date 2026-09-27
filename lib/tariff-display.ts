/**
 * Client-safe display helpers for tariffs.
 *
 * These run in the browser and clean up legacy / ugly stored names
 * (e.g. "2 Countries", "30 Länder", "5 Areas") into friendly labels
 * WITHOUT requiring a re-sync. Future syncs already store clean names.
 */
import type { Database } from '@/lib/supabase/types';

type TariffLike = Pick<
  Database['public']['Tables']['tariffs']['Row'],
  'country_name' | 'country_code' | 'location_codes' | 'region'
>;

/** Full localised country name from an ISO alpha-2 code. */
export function isoName(code: string, locale = 'en'): string {
  if (!code || code.length !== 2) return code;
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** Localised label for our virtual region codes. */
const REGION_LABELS: Record<string, Record<string, string>> = {
  EU:   { en: 'Europe',         de: 'Europa',          fr: 'Europe',          es: 'Europa' },
  AS:   { en: 'Asia',           de: 'Asien',           fr: 'Asie',            es: 'Asia' },
  SEA:  { en: 'Southeast Asia', de: 'Südostasien',     fr: 'Asie du Sud-Est', es: 'Sudeste Asiático' },
  ME:   { en: 'Middle East',    de: 'Naher Osten',     fr: 'Moyen-Orient',    es: 'Oriente Medio' },
  NA:   { en: 'North America',  de: 'Nordamerika',     fr: 'Amérique du Nord',es: 'Norteamérica' },
  LA:   { en: 'Latin America',  de: 'Lateinamerika',   fr: 'Amérique latine', es: 'Latinoamérica' },
  OC:   { en: 'Oceania',        de: 'Ozeanien',        fr: 'Océanie',         es: 'Oceanía' },
  AF:   { en: 'Africa',         de: 'Afrika',          fr: 'Afrique',         es: 'África' },
  GLOB: { en: 'Global',         de: 'Weltweit',        fr: 'Mondial',         es: 'Global' },
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
  const word =
    locale === 'de' ? 'Länder' :
    locale === 'fr' ? 'pays'   :
    locale === 'es' ? 'países' :
    'countries';
  return `${codes.length} ${word}`;
}

/**
 * Strips technical raw suffixes like "(nonhkip)" or "nonhkip" from package names
 * so the card title looks clean and professional to customers.
 */
export function cleanTariffName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .replace(/\s*\(\s*non-?hk-?ip\s*\)/gi, '')
    .replace(/\s+non-?hk-?ip\b/gi, '')
    .replace(/\s+FUP\d+(?:[km]bps)?/gi, '')
    .trim();
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
 * Checks if a tariff is a Premium tariff (e.g. Travel Premium / Dual-Network redundancy).
 */
export function isPremiumTariff(tariff: {
  is_premium?: boolean | null;
  name?: string | null;
  package_code?: string | null;
  description?: string | null;
}): boolean {
  if (typeof tariff.is_premium === 'boolean') return tariff.is_premium;
  const nameStr = (tariff.name ?? '').toLowerCase();
  const codeStr = (tariff.package_code ?? '').toLowerCase();
  const descStr = (tariff.description ?? '').toLowerCase();

  return (
    nameStr.includes('premium') ||
    codeStr.includes('premium') ||
    descStr.includes('premium')
  );
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
      icon: '⚡',
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
    icon: '⚡',
    isReloadable: false,
  };
}

/**
 * Extract all active special features for a tariff.
 */
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
): TariffSpecialFeature[] {
  const features: TariffSpecialFeature[] = [];

  // 0. Travel Premium (Dual-Network Redundancy & Breakout IP)
  if (isPremiumTariff(tariff)) {
    const isTR = isTurkeyTariff(tariff as any);
    const ip = getTariffBreakoutIp(tariff);
    features.push({
      id: 'travel_premium',
      badgeKey: 'feat_travel_premium_badge',
      titleKey: isTR ? 'feat_tr_premium_title' : 'feat_travel_premium_title',
      descKey: isTR ? 'feat_tr_premium_desc' : 'feat_travel_premium_desc',
      priceNoteKey: isTR ? 'feat_tr_premium_price_note' : 'feat_travel_premium_price_note',
      icon: '👑',
      cls: 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 font-bold',
      extra: isTR
        ? 'Vodafone & Türk Telekom/Avea (2 Netze) · Breakout IP: UK'
        : (ip ? `Breakout IP: ${ip}` : undefined),
    });
  }

  // 1. Non-HK IP
  if (isNonHkIpTariff(tariff)) {
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

