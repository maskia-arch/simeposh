import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = t('topup_page_title') || (locale === 'de' ? 'eSIM aufladen' : 'Top up eSIM');
  return {
    title: { absolute: `${pageTitle} | PureSim` },
  };
}

export default function TopUpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
