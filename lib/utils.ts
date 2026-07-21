import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatGb(gb: number | string | null | undefined, unlimitedText = 'Unbegrenzt'): string {
  if (gb === null || gb === undefined || gb === 0) return unlimitedText;
  const num = Number(gb);
  if (isNaN(num)) return unlimitedText;

  // Convert to MB
  const mb = Math.round(num * 1024);

  // If data volume is under 1 GB (0.95 GB), format as MB
  if (num < 0.95) {
    if (Math.abs(mb - 500) < 60) return '500 MB';
    if (Math.abs(mb - 250) < 35) return '250 MB';
    if (Math.abs(mb - 100) < 20) return '100 MB';
    return `${mb} MB`;
  }

  // Integer GB
  if (Number.isInteger(num)) {
    return `${num} GB`;
  }

  // Check decimal vs binary GB
  if (mb >= 900) {
    const nearestGbDec = Math.round(mb / 1000);
    if (Math.abs(mb - nearestGbDec * 1000) < 100) {
      return `${nearestGbDec} GB`;
    }
    const nearestGbBin = Math.round(mb / 1024);
    if (Math.abs(mb - nearestGbBin * 1024) < 100) {
      return `${nearestGbBin} GB`;
    }
  }

  return num % 1 === 0 ? `${num} GB` : `${num.toFixed(1)} GB`;
}


/** Round a price UP to the nearest x.x9 (e.g. 8.34 → 8.39, 8.40 → 8.49) */
export function roundToX9(price: number): number {
  return Math.ceil((price + 0.001) / 0.10) * 0.10 - 0.01;
}

/** Discount percentage for multi-day unlimited plans (as decimal, e.g. 0.08) */
export function getDiscountPct(days: number): number {
  if (days >= 30) return 0.18;
  if (days >= 14) return 0.11;
  if (days >= 7)  return 0.08;
  if (days >= 3)  return 0.04;
  return 0;
}

/** Human-readable discount info string */
export function discountLabel(days: number): { pct: number; nextAt: number | null; nextPct: number } {
  if (days >= 30) return { pct: 18, nextAt: null,  nextPct: 0  };
  if (days >= 14) return { pct: 11, nextAt: 30,    nextPct: 18 };
  if (days >= 7)  return { pct:  8, nextAt: 14,    nextPct: 11 };
  if (days >= 3)  return { pct:  4, nextAt: 7,     nextPct: 8  };
  return                  { pct:  0, nextAt: 3,     nextPct: 4  };
}
