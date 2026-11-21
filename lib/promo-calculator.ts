/**
 * Pure mathematical calculation and rounding rules for promotions.
 * Safe for client-side and server-side components (zero node/database dependencies).
 */

export interface PromoCalculationResult {
  regularCents: number;
  promoCents: number;
  discountCents: number;
  applied: boolean;
  strategy: 'x9_down' | 'existing_x9';
}

export function roundToXX9(rawEur: number): number {
  const cents = Math.round(rawEur * 100);
  const rounded = Math.ceil(cents / 10) * 10 - 1;
  return rounded / 100;
}

/**
 * Calculates promotional price from regular cents, applying named rounding strategies.
 */
export function calculatePromoPriceCents(
  regularCents: number,
  basisPoints: number,
  strategy: 'x9_down' | 'existing_x9' = 'x9_down'
): PromoCalculationResult {
  if (basisPoints <= 0 || regularCents <= 9) {
    return {
      regularCents,
      promoCents: regularCents,
      discountCents: 0,
      applied: false,
      strategy,
    };
  }

  let promoCents = regularCents;

  if (strategy === 'x9_down') {
    const floorCents = Math.floor((regularCents * (10000 - basisPoints)) / 10000);
    const rem = floorCents % 10;
    promoCents = rem === 9 ? floorCents : floorCents - (rem + 1);
  } else {
    const rawEur = (regularCents * (10000 - basisPoints)) / 1000000;
    promoCents = Math.round(roundToXX9(rawEur) * 100);
  }

  // Guard: Promotion must yield a lower price and remain >= 9 cents (0.09 €)
  if (promoCents >= regularCents || promoCents < 9) {
    return {
      regularCents,
      promoCents: regularCents,
      discountCents: 0,
      applied: false,
      strategy,
    };
  }

  return {
    regularCents,
    promoCents,
    discountCents: regularCents - promoCents,
    applied: true,
    strategy,
  };
}
