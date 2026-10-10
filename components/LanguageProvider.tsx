import React from 'react';
import type { LocaleCode } from '@/lib/i18n/config';

import { LanguageProviderDe } from '@/components/i18n/LanguageProviderDe';
import { LanguageProviderEn } from '@/components/i18n/LanguageProviderEn';
import { LanguageProviderFr } from '@/components/i18n/LanguageProviderFr';
import { LanguageProviderEs } from '@/components/i18n/LanguageProviderEs';
import { LanguageProviderIt } from '@/components/i18n/LanguageProviderIt';
import { LanguageProviderNl } from '@/components/i18n/LanguageProviderNl';
import { LanguageProviderPl } from '@/components/i18n/LanguageProviderPl';
import { LanguageProviderPt } from '@/components/i18n/LanguageProviderPt';
import { LanguageProviderTr } from '@/components/i18n/LanguageProviderTr';
import { LanguageProviderSv } from '@/components/i18n/LanguageProviderSv';
import { LanguageProviderDa } from '@/components/i18n/LanguageProviderDa';
import { LanguageProviderFi } from '@/components/i18n/LanguageProviderFi';
import { LanguageProviderCs } from '@/components/i18n/LanguageProviderCs';
import { LanguageProviderRo } from '@/components/i18n/LanguageProviderRo';
import { LanguageProviderHu } from '@/components/i18n/LanguageProviderHu';

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
