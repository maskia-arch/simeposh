import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Validates if a string is a valid UUID format (8-4-4-4-12 hex) */
export function isUuid(str: unknown): boolean {
  if (!str || typeof str !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str.trim());
}

const LOCALE_MAP: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  nl: 'nl-NL',
  pl: 'pl-PL',
  pt: 'pt-PT',
  tr: 'tr-TR',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  cs: 'cs-CZ',
  ro: 'ro-RO',
  hu: 'hu-HU',
};

export function formatCurrencyEuro(amount: number | string | null | undefined, locale: string = 'de'): string {
  const val = typeof amount === 'number' ? amount : Number(amount || 0);
  const safeVal = isNaN(val) ? 0 : val;
  const tag = LOCALE_MAP[locale.toLowerCase().slice(0, 2)] || 'de-DE';
  return new Intl.NumberFormat(tag, {
    style: 'currency',
    currency: 'EUR',
  }).format(safeVal);
}

export function formatEur(amount: number | string | null | undefined, locale: string = 'de'): string {
  return formatCurrencyEuro(amount, locale);
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

