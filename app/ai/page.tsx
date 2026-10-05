import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { AiPageClient } from './AiPageClient';

import { buildAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const isDe = locale === 'de';
  return {
    title: t('ai_meta_title'),
    description: t('ai_meta_desc'),
    alternates: buildAlternates(isDe ? 'de' : 'en', { dePath: 'ai', enPath: 'ai' }),
    openGraph: {
      locale: isDe ? 'de_DE' : 'en_US',
    },
  };
}

export default async function AiPage() {
  const locale = await getServerLocale();
  return <AiPageClient locale={locale} />;
}
