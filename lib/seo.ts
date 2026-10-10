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
