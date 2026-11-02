'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { SUPPORTED_LOCALES, type LocaleCode } from '@/lib/i18n/config';

const LANG_NAMES: Record<LocaleCode, string> = {
  de: 'Deutsch',
  en: 'English',
  fr: 'Français',
  es: 'Español',
  it: 'Italiano',
  nl: 'Nederlands',
  pl: 'Polski',
  pt: 'Português',
  tr: 'Türkçe',
  sv: 'Svenska',
  da: 'Dansk',
  fi: 'Suomi',
  cs: 'Čeština',
  ro: 'Română',
  hu: 'Magyar',
};

export function BrowserLanguageBanner() {
  const { t, locale: currentLocale } = useTranslation();
  const pathname = usePathname();
  const [targetLang, setTargetLang] = useState<LocaleCode | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;

    // Do not show banner on sensitive or non-browse paths
    if (
      pathname?.startsWith('/checkout') ||
      pathname?.startsWith('/order') ||
      pathname?.startsWith('/s/') ||
      pathname?.startsWith('/auth')
    ) {
      return;
    }

    try {
      const isDismissed = sessionStorage.getItem('puresim_lang_dismissed') === '1';
      if (isDismissed) return;

      const browserLang = (navigator.language || '').toLowerCase().split('-')[0] as LocaleCode;
      const isSupported = SUPPORTED_LOCALES.some((l) => l.code === browserLang);

      if (isSupported && browserLang !== currentLocale) {
        setTargetLang(browserLang);
        setDismissed(false);
      }
    } catch {
      // ignore storage access errors
    }
  }, [currentLocale, pathname]);

  if (dismissed || !targetLang) {
    return null;
  }

  const targetName = LANG_NAMES[targetLang] || targetLang;

  const handleDismiss = () => {
    try {
      sessionStorage.setItem('puresim_lang_dismissed', '1');
    } catch {}
    setDismissed(true);
  };

  const handleSwitch = () => {
    try {
      sessionStorage.setItem('puresim_lang_dismissed', '1');
      document.cookie = `locale=${targetLang}; path=/; max-age=31536000; SameSite=Lax`;
    } catch {}

    // Build target URL
    const search = window.location.search || '';
    const hash = window.location.hash || '';

    // Strip current locale prefix if any
    const rawPath = currentLocale === 'de'
      ? pathname
      : pathname.replace(new RegExp(`^/${currentLocale}(?=/|$)`), '') || '/';

    const cleanRaw = rawPath.replace(/\/+$/, '') || '/';
    const targetPath = targetLang === 'de'
      ? cleanRaw
      : `/${targetLang}${cleanRaw === '/' ? '' : cleanRaw}`;

    window.location.href = `${targetPath}${search}${hash}`;
  };

  return (
    <div
      role="region"
      aria-label="Language recommendation"
      className="bg-brand-900 text-white border-b border-brand-800 text-xs px-4 py-2 transition-all relative z-50"
    >
      <div className="mx-auto max-w-6xl flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-base" aria-hidden="true">🌐</span>
          <p className="font-medium text-slate-100">
            {t('lang_banner_text', { targetLang: targetName }) || `PureSim ist auf ${targetName} verfügbar.`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSwitch}
            className="rounded-lg bg-white text-brand-900 hover:bg-brand-50 active:bg-brand-100 px-3 py-1 font-bold text-xs shadow-xs transition-colors cursor-pointer"
          >
            {t('lang_banner_switch', { targetLang: targetName }) || `Zu ${targetName} wechseln`}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label={t('lang_banner_close') || 'Schließen'}
            className="text-slate-300 hover:text-white p-1 rounded-md transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
