'use client';

import React, { createContext, useContext } from 'react';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import type { LocaleCode } from '@/lib/i18n/config';

export interface LangContextValue {
  locale:    LocaleCode;
  setLocale: (code: LocaleCode) => void;
  t:         (key: TranslationKeys, vars?: Record<string, string | number>) => string;
}

export const LanguageContext = createContext<LangContextValue | null>(null);

export function useTranslation() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useTranslation must be used inside <LanguageProvider>');
  return ctx;
}
