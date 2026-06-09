/**
 * Authoritative price quoting for custom (configurable) unlimited eSIM plans.
 *
 * The SAME pure functions are used on the client (configurator preview) and on
 * the server (checkout). The server ALWAYS recomputes the price from the base
 * tariff + chosen days — the client-sent price is never trusted.
 */
import { roundToX9, getDiscountPct } from '@/lib/utils';

/** Per-day EUR rate derived from a base unlimited package. */
export function perDayEur(baseSalePriceEur: number, baseValidityDays: number): number {
  if (!baseValidityDays || baseValidityDays <= 0) return baseSalePriceEur;
  return baseSalePriceEur / baseValidityDays;
}

/**
 * Final EUR price for a custom unlimited config.
 * = per-day rate × days × (1 − multi-day discount), rounded up to x.x9.
 *
 * Mirrors the configurator's computePrice() exactly.
 */
export function customUnlimitedPriceEur(
  baseSalePriceEur: number,
  baseValidityDays: number,
  days: number,
): number {
  const rate = perDayEur(baseSalePriceEur, baseValidityDays);
  return roundToX9(rate * days * (1 - getDiscountPct(days)));
}

/** Clamp a requested day count to the supported 1–365 range. */
export function clampDays(days: number): number {
  if (!Number.isFinite(days)) return 1;
  return Math.min(365, Math.max(1, Math.round(days)));
}
