import type { Metadata } from 'next';
import { getPublicBaseUrl } from '@/lib/url';

export const BASE_URL = getPublicBaseUrl();

export interface HreflangOptions {
  dePath?: string;
  enPath?: string;
}

/**
 * Builds standard alternates metadata (canonical + hreflang: de, en, x-default)
 * - German URL: /{dePath} (root / or /de-path)
 * - English URL: /en/{enPath} (or /en)
 * - Canonical is self-referential to the current URL.
 * - x-default points to the English version (/en/...).
 */
export function buildAlternates(
  currentLocale: 'de' | 'en',
  options: HreflangOptions = {}
): Metadata['alternates'] {
  const deSlug = (options.dePath ?? '').replace(/^\/+/, '');
  const enSlug = (options.enPath ?? (options.dePath ?? '')).replace(/^\/+/, '');

  const deUrl = `${BASE_URL}${deSlug ? `/${deSlug}` : ''}`;
  const enUrl = `${BASE_URL}/en${enSlug ? `/${enSlug}` : ''}`;

  const currentUrl = currentLocale === 'de' ? deUrl : enUrl;

  return {
    canonical: currentUrl,
    languages: {
      de: deUrl,
      en: enUrl,
      'x-default': enUrl,
    },
  };
}
