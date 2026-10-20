import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('reset_pw_title' as any) || (locale === 'de' ? 'Neues Passwort festlegen' : 'Reset password');
  return {
    title: { absolute: `${title} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
    alternates: buildAlternates(locale, {
      dePath: 'reset-password',
      enPath: 'reset-password',
    }),
  };
}

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
