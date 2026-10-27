import type { Metadata } from 'next';
import TariffsPage, { generateMetadata as generateTariffsMetadata } from '../tariffs/page';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  return {
    title: t('meta_tariffs_title' as any) || (locale === 'de' ? 'eSIM Übersicht & Tarife' : 'eSIM Plans & Overview'),
    description: t('meta_tariffs_desc' as any) || (locale === 'de'
      ? 'Finde günstige eSIM-Tarife für über 150 Länder weltweit.'
      : 'Find affordable eSIM plans for over 150 countries worldwide.'),
    alternates: buildAlternates(locale, { dePath: 'esim', enPath: 'esim' }),
    openGraph: {
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
    },
  };
}

export default TariffsPage;
