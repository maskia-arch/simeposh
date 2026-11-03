import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { OrderView } from '@/components/OrderView';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { lookupOrderData } from '@/lib/order-lookup';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('op_ready_one');
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

  // Server-side lookup of order by ref (checkout_ref, order.id, or crypto_sessions.id)
  const orderData = trimmedRef ? await lookupOrderData(trimmedRef) : null;

  if (!orderData) {
    notFound();
  }

  return <OrderView orderRef={trimmedRef!} initialData={orderData} />;
}
