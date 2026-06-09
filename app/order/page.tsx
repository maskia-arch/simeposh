import type { Metadata } from 'next';
import Link from 'next/link';
import { OrderView } from '@/components/OrderView';
import { getServerT, getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ ref?: string }>;
}) {
  const { ref } = await searchParams;

  if (!ref) {
    const t = getServerT(await getServerLocale());
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="mb-4 text-5xl">🔍</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('op_not_found_title')}</h1>
        <p className="mb-6 text-slate-500">{t('op_not_found_sub')}</p>
        <Link href="/dashboard" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors">
          {t('op_to_orders')}
        </Link>
      </div>
    );
  }

  return <OrderView orderRef={ref} />;
}
