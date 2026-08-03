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
 * Extract the covered network operators from a tariff's stored raw_data.
 * Handles every esimaccess shape: operatorList, networkList, and the nested
 * locationNetworkList[].operatorList — so it works on already-synced data.
 */
export function getTariffOperators(
  rawData: Record<string, unknown> | null | undefined,
  max = 6,
): TariffOperator[] {
  if (!rawData) return [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const norm = (arr: any[]): TariffOperator[] =>
    arr
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((o: any) => ({
        name:        String(o?.operatorName ?? o?.name ?? '').trim(),
        networkType: o?.networkType ? String(o.networkType) : undefined,
      }))
      .filter((o) => o.name);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ops: any[] = [];
  if (Array.isArray(rawData.operatorList) && rawData.operatorList.length) {
    ops = rawData.operatorList;
  } else if (Array.isArray(rawData.networkList) && rawData.networkList.length) {
    ops = rawData.networkList;
  } else if (Array.isArray(rawData.locationNetworkList)) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ops = (rawData.locationNetworkList as any[]).flatMap((l) =>
      Array.isArray(l?.operatorList) ? l.operatorList : [],
    );
  }

  // De-duplicate by operator name
  const seen = new Set<string>();
  const out: TariffOperator[] = [];
  for (const o of norm(ops)) {
    const key = o.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(o);
    if (out.length >= max) break;
  }
  return out;
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
  raw_data?: Record<string, unknown> | null;
}): boolean {
  const nameStr = (tariff.name ?? '').toLowerCase();
  const codeStr = (tariff.package_code ?? '').toLowerCase();
  const descStr = (tariff.description ?? '').toLowerCase();

  return (
    nameStr.includes('nonhk') || nameStr.includes('non-hk') ||
    codeStr.includes('nonhk') || codeStr.includes('non-hk') ||
    descStr.includes('nonhk') || descStr.includes('non-hk')
  );
}

export interface TariffSpecialFeature {
  id: 'non_hk_ip' | 'activation_on_arrival' | 'topup_eligible' | 'has_5g' | 'sms_supported';
  badgeKey: string;
  titleKey: string;
  descKey: string;
  priceNoteKey?: string;
  icon: string;
  cls: string;
  extra?: string;
}

/**
 * Extract all active special features for a tariff.
 */
export function getTariffSpecialFeatures(
  tariff: {
    name?: string | null;
    package_code?: string | null;
    description?: string | null;
    raw_data?: Record<string, unknown> | null;
    is_top_up_eligible?: boolean | null;
  },
): TariffSpecialFeature[] {
  const features: TariffSpecialFeature[] = [];
  const raw = (tariff.raw_data ?? {}) as Record<string, unknown>;

  // 1. Non-HK IP
  if (isNonHkIpTariff(tariff)) {
    const ipExp = typeof raw.ipExport === 'string' && raw.ipExport ? raw.ipExport : undefined;
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

  // 2. Activation on Arrival (activeType = 2 or default for esimaccess)
  const activeType = String(raw.activeType ?? '2');
  if (activeType === '2') {
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
  const ops = getTariffOperators(raw, 10);
  if (bestNetworkType(ops) === '5G' || String(raw.supportedNetworkTypes ?? '').includes('5G')) {
    features.push({
      id: 'has_5g',
      badgeKey: 'feat_5g_badge',
      titleKey: 'feat_5g_title',
      descKey: 'feat_5g_desc',
      icon: '⚡',
      cls: 'bg-violet-50 text-violet-700 border-violet-200 hover:bg-violet-100',
    });
  }

  // 4. Top-Up Eligible / Reloadable
  const topUpType = Number(raw.supportTopUpType ?? 0);
  if (tariff.is_top_up_eligible || topUpType > 0) {
    features.push({
      id: 'topup_eligible',
      badgeKey: 'feat_topup_badge',
      titleKey: 'feat_topup_title',
      descKey: 'feat_topup_desc',
      icon: '🔄',
      cls: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
    });
  }

  // 5. SMS Supported
  if (String(raw.smsStatus ?? '') === '2') {
    features.push({
      id: 'sms_supported',
      badgeKey: 'feat_sms_badge',
      titleKey: 'feat_sms_title',
      descKey: 'feat_sms_desc',
      icon: '💬',
      cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
    });
  }

  return features;
}

