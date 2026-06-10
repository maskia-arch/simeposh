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

export function formatGb(gb: number | null): string {
  if (gb === null) return '–';

  // If it's a clean integer, just return GB
  if (Number.isInteger(gb)) {
    return `${gb} GB`;
  }

  // Convert to MB and check if it matches a round GB/MB value
  const mb = Math.round(gb * 1024);

  // If MB is close to a multiple of 1000 MB (within 100MB threshold), round to that GB integer
  // E.g., 976 MB -> 1 GB, 1953 MB -> 2 GB, 2930 MB -> 3 GB, 4882 MB -> 5 GB, 9765 MB -> 10 GB
  if (mb >= 900) {
    const nearestGb = Math.round(mb / 1000);
    if (Math.abs(mb - nearestGb * 1000) < 100) {
      return `${nearestGb} GB`;
    }
  }

  // If MB is close to 500 MB (within 50MB threshold), round to 500 MB
  // E.g., 488 MB -> 500 MB
  if (Math.abs(mb - 500) < 50) {
    return `500 MB`;
  }

  if (gb >= 1) {
    // Fallback for general decimals
    return gb % 1 === 0 ? `${gb} GB` : `${gb.toFixed(1)} GB`;
  }

  return `${mb} MB`;
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
