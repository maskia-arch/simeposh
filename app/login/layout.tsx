import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const pageTitle = t('login_welcome') || (locale === 'de' ? 'Anmelden' : 'Login');
  return {
    title: { absolute: `${pageTitle} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
