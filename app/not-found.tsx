import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerLocale, getServerT } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: {
    absolute: '404 – Page Not Found | PureSim',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  return (
    <main className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4 py-16 font-sans text-slate-100">
      <div className="max-w-md mx-auto space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-600/20 border border-brand-500/30 text-brand-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            404 – {t('page_not_found_title' as any) || 'Page Not Found'}
          </h1>
          <p className="text-sm text-slate-400">
            {t('page_not_found_desc' as any) || 'The requested page is not available at this address.'}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href={prefix || '/'}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
          >
            <span>{t('page_not_found_btn' as any) || 'Back to PureSim Webshop'}</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </Link>

          <Link
            href={`${prefix}/dashboard?tab=tickets`}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-800 bg-slate-900 hover:bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300 transition-all"
          >
            <span>🎫</span> {t('esim_open_ticket_btn' as any) || 'Support-Ticket'}
          </Link>
        </div>
      </div>
    </main>
  );
}
