'use client';

import { useContext } from 'react';
import { LanguageContext } from '@/components/LanguageProvider';
import type { TranslationKeys } from './translations/en';

export type { TranslationKeys };

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polski',     flag: '🇵🇱' },
  { code: 'pt', label: 'Português',  flag: '🇵🇹' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
  { code: 'sv', label: 'Svenska',    flag: '🇸🇪' },
  { code: 'da', label: 'Dansk',      flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi',      flag: '🇫🇮' },
  { code: 'cs', label: 'Čeština',    flag: '🇨🇿' },
  { code: 'ro', label: 'Română',     flag: '🇷🇴' },
  { code: 'hu', label: 'Magyar',     flag: '🇭🇺' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export function isValidLocale(code: string): code is LocaleCode {
  return SUPPORTED_LOCALES.some((l) => l.code === code);
}

/** Hook: call inside a Client Component that is a descendant of LanguageProvider. */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>');
  return ctx;
}
