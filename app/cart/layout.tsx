import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const cartTitle = t('nav_cart_aria') || t('cart_title') || (locale === 'de' ? 'Warenkorb' : 'Cart');
  return {
    title: { absolute: `${cartTitle} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function CartLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
