/**
 * Locale auto-detection (framework-agnostic, edge-safe — no 'use client').
 * Used by middleware (to persist a cookie) and the root layout (for SSR).
 *
 * Priority: geo country (if a host provides it) → Accept-Language → 'en'.
 */

export const DETECT_LOCALES = [
  'en', 'de', 'fr', 'es', 'it', 'nl', 'pl', 'pt', 'tr', 'sv', 'da', 'fi', 'cs', 'ro', 'hu',
] as const;

const SUPPORTED = new Set<string>(DETECT_LOCALES);

/** True if the code is one of our supported locales. */
export function isSupportedLocale(code: string | null | undefined): boolean {
  return !!code && SUPPORTED.has(code);
}

/** Map an ISO country code → the national language we support. */
export const COUNTRY_LOCALE: Record<string, string> = {
  // German
  DE: 'de', AT: 'de', CH: 'de', LI: 'de',
  // English
  GB: 'en', US: 'en', IE: 'en', AU: 'en', NZ: 'en', CA: 'en', ZA: 'en', IN: 'en', SG: 'en', MT: 'en',
  // French
  FR: 'fr', BE: 'fr', LU: 'fr', MC: 'fr',
  // Spanish
  ES: 'es', MX: 'es', AR: 'es', CO: 'es', CL: 'es', PE: 'es', VE: 'es', EC: 'es', UY: 'es',
  // Italian
  IT: 'it', SM: 'it', VA: 'it',
  // Dutch
  NL: 'nl',
  // Polish
  PL: 'pl',
  // Portuguese
  PT: 'pt', BR: 'pt',
  // Turkish
  TR: 'tr',
  // Swedish
  SE: 'sv',
  // Danish
  DK: 'da',
  // Finnish
  FI: 'fi',
  // Czech
  CZ: 'cs',
  // Romanian
  RO: 'ro', MD: 'ro',
  // Hungarian
  HU: 'hu',
};

export function localeFromCountry(country?: string | null): string | null {
  if (!country) return null;
  return COUNTRY_LOCALE[country.toUpperCase()] ?? null;
}

/** Parse an Accept-Language header and return the first supported locale. */
export function localeFromAcceptLanguage(header?: string | null): string | null {
  if (!header) return null;
  // e.g. "de-DE,de;q=0.9,en-US;q=0.8,en;q=0.7"
  const parts = header
    .split(',')
    .map((p) => {
      const [tag, q] = p.trim().split(';q=');
      return { tag: tag.trim().toLowerCase(), q: q ? parseFloat(q) : 1 };
    })
    .sort((a, b) => b.q - a.q);

  for (const { tag } of parts) {
    const primary = tag.split('-')[0];
    if (SUPPORTED.has(primary)) return primary;
  }
  return null;
}

/** Resolve the best locale from a geo country and/or Accept-Language header. */
export function detectLocale(opts: { country?: string | null; acceptLanguage?: string | null }): string {
  return (
    localeFromCountry(opts.country) ??
    localeFromAcceptLanguage(opts.acceptLanguage) ??
    'en'
  );
}

/** Read a geo country code from common host headers (Cloudflare, Vercel, etc.). */
export function countryFromHeaders(get: (name: string) => string | null): string | null {
  return (
    get('cf-ipcountry') ||
    get('x-vercel-ip-country') ||
    get('x-country-code') ||
    get('x-geo-country') ||
    null
  );
}
