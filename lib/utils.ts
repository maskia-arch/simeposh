import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatEur(amount: number | string | null | undefined): string {
  const val = typeof amount === 'number' ? amount : Number(amount || 0);
  if (isNaN(val)) return '0,00 €';
  return new Intl.NumberFormat('de-DE', {
    style:    'currency',
    currency: 'EUR',
  }).format(val);
}

export function formatGb(gb: number | string | null | undefined, unlimitedText = 'Unbegrenzt'): string {
  if (gb === null || gb === undefined || gb === 0 || gb === '0') return unlimitedText;
  const num = typeof gb === 'string' ? parseFloat(gb) : Number(gb);
  if (isNaN(num) || num <= 0) return unlimitedText;

  // Round to max 1 decimal place (0.1GB - 50GB)
  // e.g. 1.000 -> 1 -> "1 GB"
  // e.g. 1.500 -> 1.5 -> "1.5 GB"
  // e.g. 50.000 -> 50 -> "50 GB"
  const rounded = Math.round(num * 10) / 10;

  if (rounded < 0.95) {
    const mb = Math.round(num * 1024);
    if (Math.abs(mb - 500) < 60) return '500 MB';
    if (Math.abs(mb - 250) < 35) return '250 MB';
    if (Math.abs(mb - 100) < 20) return '100 MB';
    return `${rounded} GB`;
  }

  if (Number.isInteger(rounded)) {
    return `${rounded} GB`;
  }

  return `${rounded} GB`;
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
