import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates } from '@/lib/seo';
import { CartPageClient } from './CartPageClient';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const isCancelled = params?.cancelled === '1' || params?.cancelled === 'true';
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = isCancelled
    ? (t('cart_cancelled_title' as any) || (locale === 'de' ? 'Zahlung abgebrochen' : 'Payment cancelled'))
    : (t('cart_title' as any) || (locale === 'de' ? 'Warenkorb' : 'Cart'));

  return {
    title: { absolute: `${pageTitle} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
    alternates: buildAlternates(locale, {
      dePath: 'cart',
      enPath: 'cart',
    }),
  };
}

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ cancelled?: string }>;
}) {
  const params = await searchParams;
  const isCancelled = params?.cancelled === '1' || params?.cancelled === 'true';
  return <CartPageClient initialCancelled={isCancelled} />;
}
