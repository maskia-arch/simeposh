/**
 * Central Pricing Service for PureSim.
 *
 * Single Source of Truth for:
 * - Tariff Cards, Detail Modals, Detail Pages, Unlimited Duration Configurator,
 *   Cart, Crypto Checkout, Payment Requests, and Order Fulfillment.
 *
 * All money arithmetic uses integer cents. Percentages use basis points (1% = 100 bp).
 * No float accumulation. Zero client-side price authority.
 */

import { query as runRawQuery } from './db';
import { roundToXX9, getDayPassPrice, TariffPricingInput } from './pricing';
import { getNow } from './time';
import { calculatePromoPriceCents, PromoCalculationResult } from './promo-calculator';
import crypto from 'crypto';

export { calculatePromoPriceCents, type PromoCalculationResult };

export interface Promotion {
  id: string;
  slug: string;
  internal_name: string;
  titles: Record<string, string>;
  texts: Record<string, string>;
  badge_texts: Record<string, string>;
  discount_basis_points: number;
  rounding_strategy: 'x9_down' | 'existing_x9';
  show_reference_price: boolean;
  scope: 'new_esim' | 'all' | 'specific';
  applies_to_topup: boolean;
  applies_to_cash: boolean;
  allow_voucher_stacking: boolean;
  starts_at: string;
  ends_at: string;
  priority: number;
  status: 'draft' | 'scheduled' | 'active' | 'paused' | 'ended';
  theme_id: string;
  version: number;
}

export interface PriceCalculationItem {
  packageCode: string;
  salePriceEur: number;
  quantity: number;
  validityDays?: number;
  isUnlimited?: boolean;
  discountRuleCode?: string | null;
  isTopUp?: boolean;
  isCash?: boolean;
}

export interface CalculatedItem {
  packageCode: string;
  quantity: number;
  unitRegularCents: number;
  unitPromoCents: number;
  unitDiscountCents: number;
  totalRegularCents: number;
  totalPromoCents: number;
  totalDiscountCents: number;
  hasPromo: boolean;
  referencePriceEur?: number;
}

export interface CalculatedOrder {
  items: CalculatedItem[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
  promotion: Promotion | null;
  quoteToken?: string;
  expiresAt?: string;
}

// ── In-Memory Active Promotion Cache (15s TTL) ───────────────
let cachedPromo: { promo: Promotion | null; expiresAt: number; atTimeMs: number } | null = null;
const PROMO_CACHE_TTL_MS = 15_000;

export function invalidatePromotionCache() {
  cachedPromo = null;
}

/**
 * Resolves the currently active promotion considering server time (or testenv simulated time).
 * Resolves priority order: highest priority wins. Never stacks.
 */
export async function getActivePromotion(): Promise<Promotion | null> {
  const now = getNow();
  const nowMs = now.getTime();

  // If in testenv and time was shifted, don't use stale cache
  if (cachedPromo && nowMs < cachedPromo.expiresAt && Math.abs(nowMs - cachedPromo.atTimeMs) < 1000) {
    return cachedPromo.promo;
  }

  try {
    const nowIso = now.toISOString();
    // Eligible statuses: 'active' or 'scheduled' if starts_at <= now < ends_at
    const res = await runRawQuery(
      `SELECT * FROM public.promotions
       WHERE (status = 'active' OR (status = 'scheduled' AND starts_at <= $1 AND ends_at > $1))
         AND starts_at <= $1
         AND ends_at > $1
       ORDER BY priority DESC, created_at DESC
       LIMIT 1`,
      [nowIso]
    );

    if (res && res.rows.length > 0) {
      const p = res.rows[0];
      const promo: Promotion = {
        id: p.id,
        slug: p.slug,
        internal_name: p.internal_name,
        titles: typeof p.titles === 'string' ? JSON.parse(p.titles) : p.titles || {},
        texts: typeof p.texts === 'string' ? JSON.parse(p.texts) : p.texts || {},
        badge_texts: typeof p.badge_texts === 'string' ? JSON.parse(p.badge_texts) : p.badge_texts || {},
        discount_basis_points: p.discount_basis_points || 0,
        rounding_strategy: p.rounding_strategy || 'x9_down',
        show_reference_price: Boolean(p.show_reference_price),
        scope: p.scope || 'new_esim',
        applies_to_topup: Boolean(p.applies_to_topup),
        applies_to_cash: Boolean(p.applies_to_cash),
        allow_voucher_stacking: Boolean(p.allow_voucher_stacking),
        starts_at: p.starts_at,
        ends_at: p.ends_at,
        priority: p.priority || 0,
        status: p.status,
        theme_id: p.theme_id || 'standard',
        version: p.version || 1,
      };
      cachedPromo = { promo, expiresAt: nowMs + PROMO_CACHE_TTL_MS, atTimeMs: nowMs };
      return promo;
    }
  } catch (err: any) {
    console.warn('[pricing-service] Failed to query active promotion:', err.message);
  }

  cachedPromo = { promo: null, expiresAt: nowMs + PROMO_CACHE_TTL_MS, atTimeMs: nowMs };
  return null;
}

/**
 * Calculates end prices for an array of items.
 * Single source of calculation for Cart, Configurator, and Checkout.
 */
export async function calculateOrderPricing(
  items: PriceCalculationItem[],
  customPromo?: Promotion | null
): Promise<CalculatedOrder> {
  const promo = customPromo !== undefined ? customPromo : await getActivePromotion();
  const calculatedItems: CalculatedItem[] = [];

  let subtotalCents = 0;
  let totalDiscountCents = 0;

  for (const item of items) {
    const qty = Math.max(1, Math.round(item.quantity || 1));
    let regularUnitEur = item.salePriceEur;

    // For Unlimited plans: resolve regular duration price first
    if (item.isUnlimited && item.validityDays) {
      const tariffInput: TariffPricingInput = {
        sale_price_eur: item.salePriceEur,
        validity_days: 1,
        discount_rule_code: item.discountRuleCode,
      };
      regularUnitEur = await getDayPassPrice(tariffInput, item.validityDays);
    }

    const unitRegularCents = Math.round(regularUnitEur * 100);

    // Check scope applicability
    const isExcluded = (item.isTopUp && !promo?.applies_to_topup) || (item.isCash && !promo?.applies_to_cash);
    const canApplyPromo = Boolean(promo && promo.discount_basis_points > 0 && !isExcluded);

    let unitPromoCents = unitRegularCents;
    let unitDiscountCents = 0;
    let hasPromo = false;

    if (canApplyPromo && promo) {
      const calc = calculatePromoPriceCents(
        unitRegularCents,
        promo.discount_basis_points,
        promo.rounding_strategy
      );
      if (calc.applied) {
        unitPromoCents = calc.promoCents;
        unitDiscountCents = calc.discountCents;
        hasPromo = true;
      }
    }

    const totalRegularCents = unitRegularCents * qty;
    const totalPromoCents = unitPromoCents * qty;
    const itemDiscountCents = unitDiscountCents * qty;

    subtotalCents += totalRegularCents;
    totalDiscountCents += itemDiscountCents;

    calculatedItems.push({
      packageCode: item.packageCode,
      quantity: qty,
      unitRegularCents,
      unitPromoCents,
      unitDiscountCents,
      totalRegularCents,
      totalPromoCents,
      totalDiscountCents: itemDiscountCents,
      hasPromo,
      referencePriceEur: promo?.show_reference_price && hasPromo ? unitRegularCents / 100 : undefined,
    });
  }

  const finalTotalCents = subtotalCents - totalDiscountCents;

  return {
    items: calculatedItems,
    subtotalCents,
    discountCents: totalDiscountCents,
    totalCents: finalTotalCents,
    promotion: promo,
  };
}

/**
 * Creates a signed/tokenized Quote at checkout.
 * Enforces the 30-minute promotion cutoff rule:
 * - If promotion ends in < 30 minutes: Rejects checkout quote creation.
 * - Otherwise sets expires_at = min(30 mins, promotion.ends_at).
 */
export async function createCheckoutQuote(
  items: PriceCalculationItem[],
  customPromo?: Promotion | null
): Promise<{ ok: true; quote: CalculatedOrder } | { ok: false; error: string; code: string }> {
  const now = getNow();
  const order = await calculateOrderPricing(items, customPromo);
  const promo = order.promotion;

  let sessionLifetimeMs = 30 * 60 * 1000; // 30 minutes default crypto payment window
  let quoteExpiresAt = new Date(now.getTime() + sessionLifetimeMs);

  if (promo && promo.discount_basis_points > 0 && order.discountCents > 0) {
    const promoEndMs = new Date(promo.ends_at).getTime();
    const msRemaining = promoEndMs - now.getTime();

    // Rule B4(a): Checkout refuses new payment request if promo ends in < 30 minutes
    if (msRemaining < 30 * 60 * 1000) {
      return {
        ok: false,
        code: 'PROMO_ENDING_SOON',
        error: 'Die Aktion endet in Kürze (< 30 Minuten). Bitte warten Sie auf die Normalpreise oder aktualisieren Sie Ihren Warenkorb.',
      };
    }

    // Rule B4(b): expires_at = min(standard_laufzeit, promotion.ends_at)
    if (promoEndMs < quoteExpiresAt.getTime()) {
      quoteExpiresAt = new Date(promoEndMs);
    }
  }

  const tokenBytes = crypto.randomBytes(24).toString('hex');
  const quoteToken = `qt_${tokenBytes}`;

  try {
    await runRawQuery(
      `INSERT INTO public.quotes (
         quote_token, items, currency, subtotal_cents, discount_cents, total_cents,
         promotion_id, expires_at, created_at
       ) VALUES ($1, $2, 'EUR', $3, $4, $5, $6, $7, NOW())`,
      [
        quoteToken,
        JSON.stringify(order.items),
        order.subtotalCents,
        order.discountCents,
        order.totalCents,
        promo?.id || null,
        quoteExpiresAt.toISOString(),
      ]
    );

    order.quoteToken = quoteToken;
    order.expiresAt = quoteExpiresAt.toISOString();

    return { ok: true, quote: order };
  } catch (err: any) {
    console.error('[pricing-service] Failed to persist checkout quote:', err.message);
    return { ok: false, error: 'Fehler beim Erstellen des Preisangebots', code: 'QUOTE_DB_ERROR' };
  }
}

/**
 * Validates a quote token when payment or order confirmation is requested.
 */
export async function verifyCheckoutQuote(quoteToken: string): Promise<{
  valid: boolean;
  reason?: 'expired' | 'not_found' | 'invalid';
  quoteRow?: any;
}> {
  try {
    const res = await runRawQuery(
      `SELECT * FROM public.quotes WHERE quote_token = $1 LIMIT 1`,
      [quoteToken]
    );

    if (!res || res.rows.length === 0) {
      return { valid: false, reason: 'not_found' };
    }

    const row = res.rows[0];
    const now = getNow();
    const expiresAt = new Date(row.expires_at);

    if (now > expiresAt) {
      return { valid: false, reason: 'expired', quoteRow: row };
    }

    return { valid: true, quoteRow: row };
  } catch (err: any) {
    console.error('[pricing-service] Error verifying quote:', err.message);
    return { valid: false, reason: 'invalid' };
  }
}
