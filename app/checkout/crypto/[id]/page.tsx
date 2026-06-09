import type { Metadata } from 'next';
import { CryptoCheckout } from '@/components/CryptoCheckout';

export const metadata: Metadata = { title: 'Crypto Payment' };
export const dynamic = 'force-dynamic';

export default async function CryptoCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CryptoCheckout sessionId={id} />;
}
