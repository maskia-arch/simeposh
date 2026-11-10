import type { Metadata } from 'next';
import NotFound from '@/app/not-found';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = `${t('page_not_found_title' as any) || (locale === 'de' ? 'Seite nicht gefunden' : 'Page Not Found')} · PureSim`;

  return {
    title: { absolute: title },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function Page404() {
  const locale = await getServerLocale();
  return <NotFound localeOverride={locale} />;
}
