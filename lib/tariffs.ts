/**
 * Central Public Tariff DTO and Whitelist Mapper for puresim.net
 *
 * ============================================================================
 * FELDINVENTUR (CLIENT-KOMPONENTEN & ÖFFENTLICHE AUSGABEN)
 * ============================================================================
 *
 * 1. Tarifliste & Suche/Filter (TariffsPageClient.tsx):
 *    - tariff.tariff_type: Unterscheidung Travel vs. Unlimited (Eco / Pro)
 *    - tariff.country_code: Exakter ISO-Ländercode für Alias-Suche (DE, US, etc.)
 *    - tariff.country_name: Textabgleich bei Freitextsuche
 *    - tariff.region: Regionen-Filter (EU, Asia, etc.)
 *    - tariff.name: Freitextsuche im Titel
 *    - tariff.package_code: Direktsuche nach Paket-Code (z.B. CKH077)
 *    - tariff.location_codes: Abdeckungssuche bei Einzelländern
 *    - tariff.sale_price_eur: Sortierung nach günstigstem Preis
 *    - isPremiumTariff (abgeleitet): Zählung & Filter für "Travel Premium"
 *
 * 2. Tarifkarte (TariffCard.tsx):
 *    - tariff.country_code: CountryFlag Rendering
 *    - tariff.country_name, tariff.location_codes, tariff.region: displayCountryName & coverageLabel
 *    - tariff.tariff_type: Typ-Badge, Farbstreifen, Unlimited-Indikator, Drosselungs-Hinweis
 *    - tariff.data_gb: Datenvolumen Anzeige (formatGb)
 *    - tariff.validity_days: Gültigkeitsdauer in Tagen
 *    - tariff.sale_price_eur: Verkaufspreis via <Price eur={...} />
 *    - tariff.label: Promo-Tag ("Bestseller", etc.)
 *    - tariff.name: Bereinigter Name (cleanTariffName)
 *    - tariff.id, tariff.slug: Key & Detailansicht
 *    - Abgeleitet aus raw_data: operators, breakoutIp, isPremium, isNonHkIp, bestNetworkType
 *
 * 3. Details-Fenster/Modal (TariffDetailModal.tsx):
 *    - Alle Felder der Tarifkarte, plus:
 *    - tariff.description: Ausführliche Tarifbeschreibung
 *    - tariff.id: Für PriceChart Historie & Warenkorb / Checkout
 *    - Abgeleitet: isTurkey, reloadInfo (Aufladbarkeit), operators
 *
 * 4. Tarifdetailseite (/tariffs/[slug], page.tsx & TariffDetailPageClient.tsx):
 *    - tariff.slug, tariff.name, tariff.description: SEO-Metadaten & Canonical Link
 *    - tariff.sale_price_eur, tariff.validity_days: JSON-LD Structured Data Schema.org
 *    - Gleiche Felder wie TariffDetailModal zur Darstellung & Buchung
 *    - Berechneter Tagespreis: sale_price_eur / validity_days
 *
 * 5. Unlimited Configurator (UnlimitedConfigurator.tsx):
 *    - tariff.country_code, tariff.country_name, tariff.flag_emoji, tariff.location_codes
 *    - tariff.tariff_type, tariff.data_gb, tariff.validity_days, tariff.sale_price_eur
 *    - tariff.id, tariff.package_code, tariff.name: Erzeugung synthetischer Tarife für Tagesslider
 *    - Abgeleitet: operators, specialFeatures
 *
 * 6. Warenkorb (CartProvider.tsx, CartDrawer.tsx, /cart/page.tsx):
 *    - tariff.id: Eindeutige Tariff-ID
 *    - tariff.package_code: Für CartItem.packageCode & Fallback-Identifikation
 *    - tariff.name, tariff.country_name, tariff.country_code, tariff.flag_emoji
 *    - tariff.data_gb, tariff.validity_days, tariff.sale_price_eur, tariff.tariff_type
 *    - tariff.location_codes, tariff.region
 *
 * 7. Checkout (CheckoutModal.tsx):
 *    - tariff.id, tariff.name, tariff.country_name, tariff.data_gb, tariff.validity_days, tariff.sale_price_eur, tariff.tariff_type
 *
 * 8. Top-Up (/topup/page.tsx & /api/topup/packages):
 *    - id, package_code, name, data_gb, validity_days, sale_price_eur, flag_emoji, country_name, country_code, description, tariff_type, speed_kbps, is_unlimited
 *
 * 9. JSON-LD / Google Rich Snippets & generateMetadata:
 *    - name, description, country_name, country_code, data_gb, validity_days, sale_price_eur, slug
 *
 * 10. Sitemap (/sitemap.ts):
 *    - slug, updated_at (nur für XML lastmod verwendet, verlässt den Server nur als XML-Datum)
 *
 * 11. /ai & llms.txt:
 *    - Statische Dokumentation (keine dynamische Tariftabellen-Ausgabe)
 *
 * ============================================================================
 * VERBOTENE FELDER (STRIKT AUSGESCHLOSSEN - KEIN CLIENT-ZUGRIFF):
 * ============================================================================
 * - ek_price_usd, alle ek_price* (Einkaufspreis)
 * - usd_eur_rate (Interner Wechselkurs)
 * - raw_data (Lieferanten-Rohdaten)
 * - raw_data.price (Lieferanten-Einkaufspreis)
 * - raw_data.retailPrice (Lieferanten-Preisempfehlung)
 * - raw_data.saleNote (Klauseln wie "Resellers must ensure...", "minimum retail price")
 * - raw_data.discountRuleCode
 * - raw_data.operatorList, raw_data.locationNetworkList (Roh-Netzwerkstrukturen)
 * - raw_data.unusedValidTime, raw_data.supportTopUpType, raw_data.activeType
 * - raw_data.dataType, raw_data.durationType, raw_data.smsStatus, raw_data.ipExport
 * - packageCode (camelCase aus Lieferanten-Rohdaten)
 * - last_synced_at, created_at, updated_at, ai_sync_flag
 * - is_active (inaktive Tarife werden serverseitig gefiltert und gar nicht erst ausgeliefert)
 */

import {
  getTariffOperators,
  getTariffBreakoutIp,
  isPremiumTariff,
  isNonHkIpTariff,
  getReloadabilityInfo,
  bestNetworkType,
  cleanTariffName,
  type TariffOperator,
} from './tariff-display';

export interface PublicTariff {
  id:                   string;
  slug:                 string;
  package_code:         string;
  name:                 string;
  description:          string | null;
  country_code:         string;
  country_name:         string;
  region:               string | null;
  flag_emoji:           string | null;
  location_codes:       string[] | null;
  data_gb:              number | null;
  validity_days:        number;
  sale_price_eur:       number;
  tariff_type:          'travel' | 'unlimited_eco' | 'unlimited_pro' | string | null;
  speed_kbps:           number | null;
  label:                string | null;
  is_top_up_eligible:   boolean | null;

  // Serverseitig sauber aufbereitete Felder (ersetzen raw_data vollständig, einheitlich snake_case):
  operators:            TariffOperator[];
  breakout_ip:          string | null;
  best_network_type:    string | null;
  is_premium:           boolean;
  is_non_hk_ip:         boolean;
  is_reloadable:        boolean;
  reloadability_type:   'days' | 'data' | 'none';
  throttle_speed:       string | null; // Drosselungsgeschwindigkeit (ehemals fupPolicy/fup_policy)
  network_speed:        string | null;
  activates_on_arrival: boolean;       // steuert das Badge Activation on Arrival (activeType === 2)
}

/**
 * Sanitizes FUP policy string so it only contains technical speed descriptions
 * and never any supplier clauses, notes, or contract text.
 */
function sanitizeFupPolicy(rawFup: unknown): string | null {
  if (typeof rawFup !== 'string') return null;
  const trimmed = rawFup.trim();
  if (!trimmed) return null;
  // If it contains contractual or pricing terms, drop it immediately
  if (/reseller|retail|ensure|price|usd|eur|contract|supplier/i.test(trimmed)) {
    return null;
  }
  // Allow speed patterns like "512 kbps", "1 Mbps", "384Kbps", "128kbps"
  if (/^\s*FUP\s*\d+/i.test(trimmed) || /\d+\s*(?:k|m)?bps/i.test(trimmed) || trimmed.length <= 40) {
    return trimmed;
  }
  return null;
}

/**
 * Sanitizes network speed string (e.g. "3G/4G/5G").
 */
function sanitizeNetworkSpeed(rawSpeed: unknown): string | null {
  if (typeof rawSpeed === 'number') {
    return `${rawSpeed} kbps`;
  }
  if (typeof rawSpeed !== 'string') return null;
  const trimmed = rawSpeed.trim();
  if (!trimmed || trimmed.length > 30) return null;
  if (/reseller|price|retail/i.test(trimmed)) return null;
  return trimmed;
}

/**
 * Maps a database row or supplier package to a strictly whitelisted PublicTariff.
 *
 * RULES:
 * - Creates a new object property-by-property.
 * - NO object spread (...row), NO omit.
 * - NO raw_data passthrough under any circumstances.
 * - NO ek_price_usd, usd_eur_rate, retailPrice, raw_data.price, saleNote.
 * - Unified snake_case fields, no duplicate camelCase fields.
 */
export function toPublicTariff(row: any): PublicTariff {
  if (!row) {
    throw new Error('[toPublicTariff] Invalid tariff row: null or undefined');
  }

  // Pre-calculate safe derived values from server-side raw_data
  const ops = getTariffOperators(row.raw_data ?? row.operators, 8);
  const bestNet = bestNetworkType(ops);
  const breakout = getTariffBreakoutIp(row);
  const isPrem = isPremiumTariff(row);
  const isNonHk = isNonHkIpTariff(row);
  const reload = getReloadabilityInfo(row);
  const safeThrottle = sanitizeFupPolicy(row.raw_data?.fupPolicy ?? row.throttle_speed ?? row.fup_policy ?? row.fupPolicy);
  const safeSpeed = sanitizeNetworkSpeed(row.raw_data?.speed ?? row.network_speed ?? row.networkSpeed);

  const locationCodes = Array.isArray(row.location_codes)
    ? row.location_codes.map((c: any) => String(c).toUpperCase().trim()).filter(Boolean)
    : (row.country_code ? [String(row.country_code).toUpperCase().trim()] : null);

  const cleanName = cleanTariffName(row.name);

  // Activates on Arrival: strictly activeType === 2 (from raw_data, database row, or existing PublicTariff)
  const rawActiveType = row.raw_data?.activeType ?? row.activeType;
  const activatesOnArrival = rawActiveType !== undefined && rawActiveType !== null
    ? String(rawActiveType) === '2'
    : row.activates_on_arrival === true;

  return {
    id:                   String(row.id ?? ''),
    slug:                 String(row.slug ?? (row.package_code ? String(row.package_code).toLowerCase() : '')),
    package_code:         String(row.package_code ?? row.packageCode ?? ''),
    name:                 cleanName || String(row.name ?? ''),
    description:          row.description ? String(row.description) : null,
    country_code:         String(row.country_code ?? row.locationCode ?? 'XX').toUpperCase(),
    country_name:         String(row.country_name ?? row.locationCode ?? 'Global'),
    region:               row.region ? String(row.region) : null,
    flag_emoji:           row.flag_emoji ? String(row.flag_emoji) : null,
    location_codes:       locationCodes,
    data_gb:              row.data_gb !== null && row.data_gb !== undefined ? Number(row.data_gb) : null,
    validity_days:        Math.max(1, Number(row.validity_days ?? row.duration ?? 1)),
    sale_price_eur:       Number(row.sale_price_eur ?? 0),
    tariff_type:          row.tariff_type ? String(row.tariff_type) : 'travel',
    speed_kbps:           row.speed_kbps !== null && row.speed_kbps !== undefined ? Number(row.speed_kbps) : null,
    label:                row.label ? String(row.label) : null,
    is_top_up_eligible:   row.is_top_up_eligible !== undefined && row.is_top_up_eligible !== null ? Boolean(row.is_top_up_eligible) : null,

    // Derived whitelisted fields (strictly snake_case)
    operators:            ops,
    breakout_ip:          breakout,
    best_network_type:    bestNet,
    is_premium:           isPrem,
    is_non_hk_ip:         isNonHk,
    is_reloadable:        reload.isReloadable,
    reloadability_type:   reload.type,
    throttle_speed:       safeThrottle,
    network_speed:        safeSpeed,
    activates_on_arrival: activatesOnArrival,
  };
}
