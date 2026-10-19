/**
 * Pricing calculation and dynamic discount tier resolution for eSIM tariffs.
 *
 * Formula:
 *   1. Wholesale EK price in USD
 *   2. Multiply by factor 2  (EK_USD × 2)
 *   3. Convert USD → EUR  (× usdEurRate)
 *   4. Round UP to the nearest x.x9 € boundary:
 *      (0.1 * ceil((x + 0.001) / 0.1) - 0.01)
 *
 * For DayPass / Unlimited plans:
 *   Final price = roundToXX9(frontPricePerDay × days × payRatio)
 *   Dynamic discount rules fetched from database table `discount_rules`
 *   via provider's `discount_rule_code`.
 */
import { query as runRawQuery } from '@/lib/db';

export interface NormalizedPeriodRule {
  minDays: number;
  maxDays: number;
  payRatio: number;
}

export interface ClientTier {
  minDays: number;
  maxDays: number;
  discountPct: number;
}

export interface PriceTableEntry {
  priceEur: number;
  subtotalEur: number;
  savedEur: number;
  discountPct: number;
  minDays: number;
  betterDealDays?: number;
  betterDealPriceEur?: number;
  compareDays?: number;
}

export interface UnlimitedPriceTable {
  frontPricePerDay: number;
  tiers: ClientTier[];
  days: Record<number, PriceTableEntry>;
}

export interface TariffPricingInput {
  sale_price_eur: number;
  validity_days: number;
  discount_rule_code?: string | null;
}

/**
 * Round a price up to the nearest x.x9 € boundary.
 * Works strictly in whole cents to prevent floating point inaccuracies.
 * Formula: 0.1 * Math.ceil((rawEur + 0.001) / 0.1) - 0.01
 */
export function roundToXX9(rawEur: number): number {
  const cents = Math.round(rawEur * 100);
  const rounded = Math.ceil((cents + 0.1) / 10) * 10 - 1;
  return rounded / 100;
}

/**
 * Calculate the EUR sale price from a USD EK price.
 */
export function calculateSalePrice(ekPriceUsd: number, usdEurRate: number): number {
  const doubled = ekPriceUsd * 2;
  const inEur   = doubled * usdEurRate;
  return roundToXX9(inEur);
}

/**
 * Fetch the live USD→EUR exchange rate with fallback.
 */
export async function fetchUsdEurRate(fallbackRate: number): Promise<number> {
  const apiUrl = process.env.EXCHANGE_RATE_API_URL;
  const apiKey = process.env.EXCHANGE_RATE_API_KEY;

  if (!apiUrl) return fallbackRate;

  try {
    const url = apiKey ? `${apiUrl}?apikey=${apiKey}` : apiUrl;
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!res.ok) throw new Error(`Exchange rate API returned ${res.status}`);

    const data = await res.json();
    const rate =
      data?.rates?.EUR ??
      data?.conversion_rates?.EUR ??
      data?.result?.EUR ??
      null;

    if (typeof rate !== 'number' || rate <= 0) {
      throw new Error('Unexpected exchange rate API response format');
    }

    return rate;
  } catch (err) {
    console.warn(
      `[pricing] Failed to fetch live exchange rate, using fallback ${fallbackRate}:`,
      err
    );
    return fallbackRate;
  }
}

// ── In-Memory Cache for Discount Rules & Min Days (5 minute TTL) ──────────────
interface CachedRule {
  periodRules: NormalizedPeriodRule[];
  validFrom: number | null;
  validTo: number | null;
  cachedAt: number;
}
const rulesCache = new Map<string, CachedRule>();
const RULES_CACHE_TTL = 5 * 60 * 1000;

let cachedMinDiscountDays: { value: number; expiresAt: number } | null = null;

/**
 * Retrieve the minimum days threshold for dynamic discounts (default: 4).
 * Reads admin setting `unlimited_discount_min_days` from `system_settings`.
 */
export async function getDiscountMinDays(): Promise<number> {
  const now = Date.now();
  if (cachedMinDiscountDays && now < cachedMinDiscountDays.expiresAt) {
    return cachedMinDiscountDays.value;
  }
  try {
    const res = await runRawQuery(
      `SELECT value FROM system_settings WHERE key = 'unlimited_discount_min_days' LIMIT 1`
    );
    if (res && res.rows.length > 0) {
      const val = parseInt(res.rows[0].value, 10);
      if (!isNaN(val) && val >= 1 && val <= 30) {
        cachedMinDiscountDays = { value: val, expiresAt: now + 60_000 };
        return val;
      }
    }
  } catch (err) {
    console.warn('[pricing] Failed to read unlimited_discount_min_days setting, using fallback 4:', (err as Error).message);
  }
  cachedMinDiscountDays = { value: 4, expiresAt: now + 60_000 };
  return 4;
}

export function clearDiscountMinDaysCache(): void {
  cachedMinDiscountDays = null;
}

/**
 * Retrieve active period rules for a given discountRuleCode from the database.
 */
export async function getDiscountRuleByCode(
  code?: string | null,
  now: Date = new Date()
): Promise<NormalizedPeriodRule[] | null> {
  const cleanCode = (code || '').trim();
  if (!cleanCode) return null;

  const cached = rulesCache.get(cleanCode);
  const nowTs = now.getTime();
  if (cached && nowTs - cached.cachedAt < RULES_CACHE_TTL) {
    if (cached.validFrom && nowTs < cached.validFrom) return null;
    if (cached.validTo && nowTs > cached.validTo) return null;
    return cached.periodRules;
  }

  try {
    const res = await runRawQuery(
      `SELECT period_rules, valid_from, valid_to FROM discount_rules WHERE discount_rule_code = $1 LIMIT 1`,
      [cleanCode]
    );

    if (!res || res.rows.length === 0) {
      return null;
    }

    const row = res.rows[0];
    const rawPeriodRules = typeof row.period_rules === 'string'
      ? JSON.parse(row.period_rules)
      : row.period_rules;

    const periodRules: NormalizedPeriodRule[] = Array.isArray(rawPeriodRules)
      ? rawPeriodRules
      : [];

    const validFrom = row.valid_from ? new Date(row.valid_from).getTime() : null;
    const validTo = row.valid_to ? new Date(row.valid_to).getTime() : null;

    rulesCache.set(cleanCode, {
      periodRules,
      validFrom,
      validTo,
      cachedAt: nowTs,
    });

    if (validFrom && nowTs < validFrom) return null;
    if (validTo && nowTs > validTo) return null;

    return periodRules;
  } catch (err) {
    console.warn(`[pricing] Failed to load discount rule for ${cleanCode}:`, (err as Error).message);
    return null;
  }
}

/**
 * Calculates the DayPass / Unlimited price for any day count (1–365) server-side.
 * - For 1 to (minDiscountDays - 1) days: strictly no discount; rounded up to the nearest x.x9 € boundary.
 * - For minDiscountDays+ days: 1:1 pass-through of dynamic provider discount rules, commercial cent rounding.
 */
export async function getDayPassPrice(
  tariff: TariffPricingInput,
  days: number,
  now: Date = new Date(),
  options?: { rules?: NormalizedPeriodRule[] | null; minDiscountDays?: number }
): Promise<number> {
  const frontPrice = roundToXX9(tariff.sale_price_eur / Math.max(1, tariff.validity_days || 1));
  const frontCents = Math.round(frontPrice * 100);
  const clampedDays = Math.min(365, Math.max(1, Math.round(days)));

  const minDiscountDays = options?.minDiscountDays !== undefined
    ? options.minDiscountDays
    : await getDiscountMinDays();

  // 1 to 3 days (or < minDiscountDays): no discount, rounded up to nearest ,x9
  if (clampedDays < minDiscountDays) {
    const base = frontCents * clampedDays;
    const x9 = Math.floor(base / 10) * 10 + 9;
    const finalCents = x9 >= base ? x9 : x9 + 10;
    return finalCents / 100;
  }

  const rules = options?.rules !== undefined
    ? options.rules
    : await getDiscountRuleByCode(tariff.discount_rule_code, now);

  let payRatio = 1.0;
  if (rules && rules.length > 0) {
    const match = rules.find((r) => clampedDays >= r.minDays && clampedDays <= r.maxDays);
    if (match && typeof match.payRatio === 'number' && match.payRatio > 0 && match.payRatio <= 1) {
      payRatio = match.payRatio;
    }
  }

  const ratioBp = Math.round(payRatio * 10000);
  const finalCents = Math.floor((frontCents * clampedDays * ratioBp + 5000) / 10000);
  return finalCents / 100;
}

/**
 * Resolves the minimum customer price for any tariff.
 * For Unlimited / DayPass plans, returns the 1-day price without discount (e.g. 0.59 €).
 * For Travel plans, returns the standard sale_price_eur.
 */
export async function getTariffMinCustomerPrice(
  tariff: TariffPricingInput & { tariff_type?: string | null; data_gb?: number | null },
  now: Date = new Date(),
  options?: { rules?: NormalizedPeriodRule[] | null; minDiscountDays?: number }
): Promise<number> {
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  if (isUnlimited) {
    return await getDayPassPrice(tariff, 1, now, options);
  }
  return tariff.sale_price_eur;
}

/**
 * Precomputes the complete price table for 1–365 days server-side.
 * Sanitized to never leak raw payRatio, wholesale cost, exchange rates or internal factors.
 * Includes dynamic threshold comparison ("Tipp: 30 Tage kosten nur 14,51 €").
 */
export async function getUnlimitedPriceTable(
  tariff: TariffPricingInput,
  minDays: number = 1,
  maxDays: number = 365,
  now: Date = new Date(),
  options?: { rules?: NormalizedPeriodRule[] | null; minDiscountDays?: number }
): Promise<UnlimitedPriceTable> {
  const frontPrice = tariff.sale_price_eur / Math.max(1, tariff.validity_days || 1);
  const frontPricePerDay = roundToXX9(frontPrice);
  const frontCents = Math.round(frontPricePerDay * 100);

  const minDiscountDays = options?.minDiscountDays !== undefined
    ? options.minDiscountDays
    : await getDiscountMinDays();

  const rules = options?.rules !== undefined
    ? options.rules
    : await getDiscountRuleByCode(tariff.discount_rule_code, now);

  // Build clean client tiers starting strictly at minDiscountDays
  const tiers: ClientTier[] = (rules || [])
    .filter((r) => r.maxDays >= minDiscountDays)
    .map((r) => ({
      minDays: Math.max(r.minDays, minDiscountDays),
      maxDays: r.maxDays,
      discountPct: Math.round((1 - r.payRatio) * 100),
    }));

  const daysTable: Record<number, PriceTableEntry> = {};

  // 1. First pass: compute exact price, subtotal, savedEur, discountPct for each day
  for (let d = minDays; d <= maxDays; d++) {
    const subtotalCents = frontCents * d;
    const subtotalEur = subtotalCents / 100;

    // For days before minDiscountDays, apply strictly no discount with ,x9 rounding
    if (d < minDiscountDays) {
      const base = subtotalCents;
      const x9 = Math.floor(base / 10) * 10 + 9;
      const finalCents = x9 >= base ? x9 : x9 + 10;
      daysTable[d] = {
        priceEur: finalCents / 100,
        subtotalEur,
        savedEur: 0,
        discountPct: 0,
        minDays: minDiscountDays,
      };
      continue;
    }

    let payRatio = 1.0;
    let discountPct = 0;
    let ruleMinDays = minDiscountDays;

    if (rules && rules.length > 0) {
      const match = rules.find((r) => d >= r.minDays && d <= r.maxDays);
      if (match && typeof match.payRatio === 'number' && match.payRatio > 0 && match.payRatio <= 1) {
        payRatio = match.payRatio;
        discountPct = Math.round((1 - payRatio) * 100);
        ruleMinDays = Math.max(match.minDays, minDiscountDays);
      }
    }

    let finalCents = subtotalCents;
    if (payRatio < 1.0) {
      const ratioBp = Math.round(payRatio * 10000);
      finalCents = Math.floor((frontCents * d * ratioBp + 5000) / 10000);
    }
    const priceEur = finalCents / 100;
    const savedEur = (subtotalCents - finalCents) / 100;

    daysTable[d] = {
      priceEur,
      subtotalEur,
      savedEur,
      discountPct,
      minDays: ruleMinDays,
    };
  }

  // 2. Second pass: detect better deals at threshold transitions
  // If a longer duration d2 (e.g. 30 days) costs equal or less than d (e.g. 29 days),
  // show the tip for day d (and starting 2 days prior to the threshold, e.g. day 28 & 29).
  for (let d = minDays; d <= maxDays; d++) {
    // Look ahead across upcoming days / next tier
    for (let d2 = d + 1; d2 <= Math.min(maxDays, d + 7); d2++) {
      if (daysTable[d2] && daysTable[d2].priceEur <= daysTable[d].priceEur) {
        daysTable[d].betterDealDays = d2;
        daysTable[d].betterDealPriceEur = daysTable[d2].priceEur;
        daysTable[d].compareDays = d;
        break;
      }
    }

    // Check tier threshold inversion (e.g. if tier starts at 30, and day 30 <= day 29, activate tip on day 28 as well)
    for (const tier of tiers) {
      if (tier.minDays > d && d >= tier.minDays - 2) {
        const thresholdDay = tier.minDays;
        const thresholdPrice = daysTable[thresholdDay]?.priceEur;
        const prevDayPrice = daysTable[thresholdDay - 1]?.priceEur;
        if (thresholdPrice !== undefined && prevDayPrice !== undefined && thresholdPrice <= prevDayPrice) {
          if (!daysTable[d].betterDealDays || thresholdPrice < daysTable[d].betterDealPriceEur!) {
            daysTable[d].betterDealDays = thresholdDay;
            daysTable[d].betterDealPriceEur = thresholdPrice;
            daysTable[d].compareDays = thresholdDay - 1;
          }
        }
      }
    }
  }

  return {
    frontPricePerDay,
    tiers,
    days: daysTable,
  };
}
