import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = t('meta_reviews_title' as any) || (locale === 'de' ? 'Kundenbewertungen & Feedback' : 'Customer Reviews & Feedback');
  return {
    title: { absolute: `${pageTitle} | PureSim` },
  };
}

export default function ReviewsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
