import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('forgot_pw_title' as any) || (locale === 'de' ? 'Passwort vergessen' : 'Forgot password');
  return {
    title: { absolute: `${title} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
    alternates: buildAlternates(locale, {
      dePath: 'forgot-password',
      enPath: 'forgot-password',
    }),
  };
}

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
