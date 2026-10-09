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

  const nameStr = (tariff.name ?? '').toLowerCase();
  const codeStr = (tariff.package_code ?? '').toLowerCase();
  const descStr = (tariff.description ?? '').toLowerCase();
  const slugStr = (tariff.slug ?? '').toLowerCase();

  return (
    nameStr.includes('premium') ||
    codeStr.includes('premium') ||
    descStr.includes('premium') ||
    slugStr.includes('premium')
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


