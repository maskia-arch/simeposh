'use client';

import React, { createContext, useCallback, useEffect, useState } from 'react';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import { isValidLocale, type LocaleCode } from '@/lib/i18n';

// ── lazy-load translation dictionaries ──────────────────────────────────────
const loaders: Record<LocaleCode, () => Promise<{ default: Record<string, string> }>> = {
  en: () => import('@/lib/i18n/translations/en'),
  de: () => import('@/lib/i18n/translations/de'),
  fr: () => import('@/lib/i18n/translations/fr'),
  es: () => import('@/lib/i18n/translations/es'),
  it: () => import('@/lib/i18n/translations/it'),
  nl: () => import('@/lib/i18n/translations/nl'),
  pl: () => import('@/lib/i18n/translations/pl'),
  pt: () => import('@/lib/i18n/translations/pt'),
  tr: () => import('@/lib/i18n/translations/tr'),
  sv: () => import('@/lib/i18n/translations/sv'),
  da: () => import('@/lib/i18n/translations/da'),
  fi: () => import('@/lib/i18n/translations/fi'),
  cs: () => import('@/lib/i18n/translations/cs'),
  ro: () => import('@/lib/i18n/translations/ro'),
  hu: () => import('@/lib/i18n/translations/hu'),
};

// ── Context type ─────────────────────────────────────────────────────────────
interface LangContextValue {
  locale:    LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t:         (key: TranslationKeys, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LangContextValue | null>(null);

// ── Helper: read locale from cookie ─────────────────────────────────────────
function getInitialLocale(): LocaleCode {
  if (typeof document === 'undefined') return 'en';
  const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
  const code  = match?.[1];
  return (code && isValidLocale(code)) ? code : 'en';
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function LanguageProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: LocaleCode }) {
  const [locale,  setLocaleState] = useState<LocaleCode>(initialLocale ?? 'en');
  const [dict,    setDict]        = useState<Record<string, string>>({});
  const [enDict,  setEnDict]      = useState<Record<string, string>>({});

  // On mount: read cookie (client-side) and override SSR default
  useEffect(() => {
    const cookieLocale = getInitialLocale();
    if (cookieLocale !== locale) setLocaleState(cookieLocale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Always keep the English dictionary loaded as a fallback for any key that
  // hasn't been translated into the active locale yet.
  useEffect(() => {
    loaders.en().then((mod) => setEnDict(mod.default as Record<string, string>));
  }, []);

  // Whenever locale changes: load dict + persist cookie
  useEffect(() => {
    loaders[locale]().then((mod) => setDict(mod.default as Record<string, string>));
    document.cookie = `locale=${locale};path=/;max-age=31536000;SameSite=Lax`;
  }, [locale]);

  const setLocale = useCallback((code: LocaleCode) => {
    setLocaleState(code);
  }, []);

  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>): string => {
      // current locale → English fallback → the key itself
      let str = (dict[key] as string | undefined)
        ?? (enDict[key] as string | undefined)
        ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [dict, enDict],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
