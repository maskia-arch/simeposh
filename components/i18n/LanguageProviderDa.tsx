'use client';

import React, { useCallback, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dict from '@/lib/i18n/translations/da';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import { type LocaleCode } from '@/lib/i18n/config';
import { LanguageContext } from './LanguageContext';

export function LanguageProviderDa({ children }: { children: React.ReactNode }) {
  const locale: LocaleCode = 'da';
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = useCallback((code: LocaleCode) => {
    startTransition(() => {
      document.cookie = `locale=${code};path=/;max-age=31536000;SameSite=Lax`;
      if (typeof window !== 'undefined') {
        const p = window.location.pathname;
        const search = window.location.search || '';
        // Strip any existing language prefix (except for root /)
        // Supported prefixes: en, fr, es, it, nl, pl, pt, tr, sv, da, fi, cs, ro, hu
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
      let str = ((dict as any)[key] as string | undefined) ?? key;
      if (vars) {
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
      }
      return str;
    },
    [],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col items-center p-8 rounded-3xl bg-slate-900/80 border border-slate-700/30 shadow-2xl backdrop-blur-xl max-w-xs text-center animate-[fadeIn_0.2s_ease-out]">
            <div className="relative h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
            </div>
            <p className="text-sm font-bold text-white tracking-wide">
              {t('lang_loading' as any) || 'Loading…'}
            </p>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
}
