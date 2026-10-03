import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { CryptoCheckout } from '@/components/CryptoCheckout';

export const metadata: Metadata = { title: 'Crypto Payment' };
export const dynamic = 'force-dynamic';

export default async function CryptoCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const rawTariff = cookieStore.get('esim_checkout_tariff')?.value;
  const rawAmount = cookieStore.get('esim_checkout_amount')?.value;
  const initialTariff = rawTariff ? decodeURIComponent(rawTariff) : '';
  const initialAmount = rawAmount ? decodeURIComponent(rawAmount) : '';

  return (
    <CryptoCheckout
      sessionId={id}
      initialTariff={initialTariff}
      initialAmount={initialAmount}
    />
  );
}
