'use client';

import { useContext } from 'react';
import { LanguageContext } from '@/components/LanguageProvider';
import type { TranslationKeys } from './translations/en';
import { SUPPORTED_LOCALES, type LocaleCode, isValidLocale } from './config';

export type { TranslationKeys, LocaleCode };
export { SUPPORTED_LOCALES, isValidLocale };

/** Hook: call inside a Client Component that is a descendant of LanguageProvider. */
export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>');
  return ctx;
}
