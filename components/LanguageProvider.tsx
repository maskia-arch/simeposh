'use client';

import React, { createContext, useCallback, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import { isValidLocale, type LocaleCode } from '@/lib/i18n';

// Static imports for maximum switching performance (no network waterfall for dictionary chunks)
import en from '@/lib/i18n/translations/en';
import de from '@/lib/i18n/translations/de';
import fr from '@/lib/i18n/translations/fr';
import es from '@/lib/i18n/translations/es';
import it from '@/lib/i18n/translations/it';
import nl from '@/lib/i18n/translations/nl';
import pl from '@/lib/i18n/translations/pl';
import pt from '@/lib/i18n/translations/pt';
import tr from '@/lib/i18n/translations/tr';
import sv from '@/lib/i18n/translations/sv';
import da from '@/lib/i18n/translations/da';
import fi from '@/lib/i18n/translations/fi';
import cs from '@/lib/i18n/translations/cs';
import ro from '@/lib/i18n/translations/ro';
import hu from '@/lib/i18n/translations/hu';

const DICTS: Record<LocaleCode, Record<string, string>> = {
  en, de, fr, es, it, nl, pl, pt, tr, sv, da, fi, cs, ro, hu,
} as unknown as Record<LocaleCode, Record<string, string>>;

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
  const [locale, setLocaleState] = useState<LocaleCode>(initialLocale ?? 'en');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // On mount: read cookie (client-side) and override SSR default
  useEffect(() => {
    const cookieLocale = getInitialLocale();
    if (cookieLocale !== locale) setLocaleState(cookieLocale);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((code: LocaleCode) => {
    startTransition(() => {
      setLocaleState(code);
      document.cookie = `locale=${code};path=/;max-age=31536000;SameSite=Lax`;
      router.refresh();
    });
  }, [router]);

  const t = useCallback(
    (key: TranslationKeys, vars?: Record<string, string | number>): string => {
      const dict = DICTS[locale] ?? DICTS.en;
      const enDict = DICTS.en;
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
    [locale],
  );

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
      {isPending && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-950/60 backdrop-blur-md transition-all duration-300">
          <div className="flex flex-col items-center p-8 rounded-3xl bg-slate-900/80 border border-slate-700/30 shadow-2xl backdrop-blur-xl max-w-xs text-center animate-[fadeIn_0.2s_ease-out]">
            {/* Spinning modern outer glow indicator */}
            <div className="relative h-16 w-16 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
              <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-brand-500 animate-spin" />
            </div>
            <p className="text-white font-semibold text-sm tracking-wide">
              {t('cart_loading') || 'Loading...'}
            </p>
          </div>
        </div>
      )}
    </LanguageContext.Provider>
  );
}
