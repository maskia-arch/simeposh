/**
 * Authoritative price quoting helpers for custom (configurable) unlimited eSIM plans.
 */
import { roundToXX9 } from '@/lib/pricing';

/** Per-day EUR rate derived from a base unlimited package. */
export function perDayEur(baseSalePriceEur: number, baseValidityDays: number): number {
  if (!baseValidityDays || baseValidityDays <= 0) return baseSalePriceEur;
  return baseSalePriceEur / baseValidityDays;
}

/** Clamp a requested day count to the supported 1–365 range. */
export function clampDays(days: number): number {
  if (!Number.isFinite(days)) return 1;
  return Math.min(365, Math.max(1, Math.round(days)));
}
