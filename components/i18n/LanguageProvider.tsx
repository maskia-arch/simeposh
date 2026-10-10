'use client';

import React, { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import { type LocaleCode } from '@/lib/i18n/config';
import { LanguageContext } from './LanguageContext';

export interface LanguageProviderProps {
  locale: LocaleCode;
  dict: Record<string, string>;
  children: React.ReactNode;
}

export function LanguageProvider({
  locale,
  dict,
  children,
}: LanguageProviderProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const setLocale = useCallback((code: LocaleCode) => {
    startTransition(() => {
      document.cookie = `locale=${code};path=/;max-age=31536000;SameSite=Lax`;
      if (typeof window !== 'undefined') {
        const p = window.location.pathname;
        const search = window.location.search || '';
        let cleanPath = p.replace(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/, '') || '/';
        let target = cleanPath;
        if (code !== 'de') {
          target = '/' + code + (cleanPath === '/' ? '' : cleanPath);
        }
        window.location.href = target + search;
      } else {
        router.refresh();
      }
    });
  }, [router]);

  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>): string => {
      let str = dict[key] ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [dict]
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
