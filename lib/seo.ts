import type { Metadata } from 'next';
import { getPublicBaseUrl } from '@/lib/url';
import { SUPPORTED_LOCALES, type LocaleCode } from '@/lib/i18n/config';

export const BASE_URL = getPublicBaseUrl();

export interface HreflangOptions {
  dePath?: string;
  enPath?: string;
  localizedPaths?: Partial<Record<LocaleCode, string>>;
}

/**
 * Builds standard alternates metadata (canonical + hreflang for all 15 languages + x-default)
 * - German URL: /{dePath} (root / or /{dePath})
 * - Other languages: /{locale}/{localizedPath} (or /{locale})
 * - Canonical is self-referential to the current URL.
 * - x-default points to the English version (/en/...).
 */
export function buildAlternates(
  currentLocale: LocaleCode,
  options: HreflangOptions = {}
): Metadata['alternates'] {
  const deSlug = (options.dePath ?? '').replace(/^\/+/, '');
  const enSlug = (options.enPath ?? (options.dePath ?? '')).replace(/^\/+/, '');

  const languages: Record<string, string> = {};

  for (const { code } of SUPPORTED_LOCALES) {
    if (code === 'de') {
      languages.de = `${BASE_URL}${deSlug ? `/${deSlug}` : ''}`;
    } else {
      const slug = options.localizedPaths?.[code] ?? (code === 'en' ? enSlug : (options.dePath ?? ''));
      const cleanSlug = slug.replace(/^\/+/, '');
      languages[code] = `${BASE_URL}/${code}${cleanSlug ? `/${cleanSlug}` : ''}`;
    }
  }

  // x-default always points to English
  languages['x-default'] = languages.en;

  const currentUrl = languages[currentLocale] || languages.de;

  return {
    canonical: currentUrl,
    languages,
  };
}

export const OG_LOCALES: Record<LocaleCode, string> = {
  de: 'de_DE',
  en: 'en_US',
  fr: 'fr_FR',
  es: 'es_ES',
  it: 'it_IT',
  nl: 'nl_NL',
  pl: 'pl_PL',
  pt: 'pt_PT',
  tr: 'tr_TR',
  sv: 'sv_SE',
  da: 'da_DK',
  fi: 'fi_FI',
  cs: 'cs_CZ',
  ro: 'ro_RO',
  hu: 'hu_HU',
};

export function getOgLocale(locale: LocaleCode): string {
  return OG_LOCALES[locale] || 'en_US';
}

export function getOgLocaleAlternates(locale: LocaleCode): string[] {
  const currentOg = getOgLocale(locale);
  return Object.values(OG_LOCALES).filter((og) => og !== currentOg);
}
