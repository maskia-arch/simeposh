import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { AiPageClient } from './AiPageClient';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  return {
    title: t('ai_meta_title'),
    description: t('ai_meta_desc'),
    alternates: {
      canonical: '/ai',
    },
  };
}

export default async function AiPage() {
  const locale = await getServerLocale();
  return <AiPageClient locale={locale} />;
}
