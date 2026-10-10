import React from 'react';
import type { LocaleCode } from '@/lib/i18n/config';

import dynamic from 'next/dynamic';

const LanguageProviderDe = dynamic(() => import('@/components/i18n/LanguageProviderDe').then((m) => m.LanguageProviderDe));
const LanguageProviderEn = dynamic(() => import('@/components/i18n/LanguageProviderEn').then((m) => m.LanguageProviderEn));
const LanguageProviderFr = dynamic(() => import('@/components/i18n/LanguageProviderFr').then((m) => m.LanguageProviderFr));
const LanguageProviderEs = dynamic(() => import('@/components/i18n/LanguageProviderEs').then((m) => m.LanguageProviderEs));
const LanguageProviderIt = dynamic(() => import('@/components/i18n/LanguageProviderIt').then((m) => m.LanguageProviderIt));
const LanguageProviderNl = dynamic(() => import('@/components/i18n/LanguageProviderNl').then((m) => m.LanguageProviderNl));
const LanguageProviderPl = dynamic(() => import('@/components/i18n/LanguageProviderPl').then((m) => m.LanguageProviderPl));
const LanguageProviderPt = dynamic(() => import('@/components/i18n/LanguageProviderPt').then((m) => m.LanguageProviderPt));
const LanguageProviderTr = dynamic(() => import('@/components/i18n/LanguageProviderTr').then((m) => m.LanguageProviderTr));
const LanguageProviderSv = dynamic(() => import('@/components/i18n/LanguageProviderSv').then((m) => m.LanguageProviderSv));
const LanguageProviderDa = dynamic(() => import('@/components/i18n/LanguageProviderDa').then((m) => m.LanguageProviderDa));
const LanguageProviderFi = dynamic(() => import('@/components/i18n/LanguageProviderFi').then((m) => m.LanguageProviderFi));
const LanguageProviderCs = dynamic(() => import('@/components/i18n/LanguageProviderCs').then((m) => m.LanguageProviderCs));
const LanguageProviderRo = dynamic(() => import('@/components/i18n/LanguageProviderRo').then((m) => m.LanguageProviderRo));
const LanguageProviderHu = dynamic(() => import('@/components/i18n/LanguageProviderHu').then((m) => m.LanguageProviderHu));

export function LanguageProvider({
  children,
  initialLocale = 'de',
}: {
  children: React.ReactNode;
  initialLocale?: LocaleCode;
}) {
  switch (initialLocale) {
    case 'en': return <LanguageProviderEn>{children}</LanguageProviderEn>;
    case 'fr': return <LanguageProviderFr>{children}</LanguageProviderFr>;
    case 'es': return <LanguageProviderEs>{children}</LanguageProviderEs>;
    case 'it': return <LanguageProviderIt>{children}</LanguageProviderIt>;
    case 'nl': return <LanguageProviderNl>{children}</LanguageProviderNl>;
    case 'pl': return <LanguageProviderPl>{children}</LanguageProviderPl>;
    case 'pt': return <LanguageProviderPt>{children}</LanguageProviderPt>;
    case 'tr': return <LanguageProviderTr>{children}</LanguageProviderTr>;
    case 'sv': return <LanguageProviderSv>{children}</LanguageProviderSv>;
    case 'da': return <LanguageProviderDa>{children}</LanguageProviderDa>;
    case 'fi': return <LanguageProviderFi>{children}</LanguageProviderFi>;
    case 'cs': return <LanguageProviderCs>{children}</LanguageProviderCs>;
    case 'ro': return <LanguageProviderRo>{children}</LanguageProviderRo>;
    case 'hu': return <LanguageProviderHu>{children}</LanguageProviderHu>;
    case 'de':
    default:
      return <LanguageProviderDe>{children}</LanguageProviderDe>;
  }
}

// Re-export context and hook
export { LanguageContext, useTranslation } from '@/components/i18n/LanguageContext';
export type { LangContextValue } from '@/components/i18n/LanguageContext';
