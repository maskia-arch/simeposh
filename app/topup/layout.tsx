import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = t('topup_page_title') || (locale === 'de' ? 'eSIM aufladen' : 'Top up eSIM');
  return {
    title: { absolute: `${pageTitle} | PureSim` },
    alternates: buildAlternates(locale, { dePath: 'topup', enPath: 'topup' }),
  };
}

export default function TopUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
