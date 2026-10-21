import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates } from '@/lib/seo';
import type { LocaleCode } from '@/lib/i18n/config';

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
    alternates: buildAlternates(locale as LocaleCode, { dePath: 'login', enPath: 'login' }),
  };
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
