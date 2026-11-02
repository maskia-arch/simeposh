import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderView } from '@/components/OrderView';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { isUuid } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('op_ready_one') || (locale === 'de' ? 'Deine eSIM' : 'Your eSIM');
  return {
    title: {
      absolute: `${title} | PureSim`,
    },
    robots: {
      index: false,
      follow: false,
    },
    referrer: 'no-referrer',
  };
}

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;
  const trimmedRef = ref?.trim();
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  // Reject missing or non-UUID refs
  if (!trimmedRef || !isUuid(trimmedRef)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 shadow-sm border border-slate-200">
          <svg className="h-7 w-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('op_not_found_title')}</h1>
        <p className="mb-6 text-slate-500 text-sm">{t('op_not_found_sub')}</p>
        <Link href={`${prefix}/dashboard`} className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors inline-block text-sm">
          {t('op_to_orders')}
        </Link>
      </div>
    );
  }

  return <OrderView orderRef={trimmedRef} />;
}
