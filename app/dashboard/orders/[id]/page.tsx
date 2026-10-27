import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { displayCountryName } from '@/lib/tariff-display';
import { OrderDetailClient } from '@/components/OrderDetailClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('order_details_title' as any) || (locale === 'de' ? 'Bestelldetails' : 'Order Details');
  return {
    title: { absolute: `${title} | PureSim` },
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await Promise.resolve(params);
  const id = resolvedParams?.id;
  if (!id) notFound();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const locale = await getServerLocale();
  const prefix = locale === 'de' ? '' : `/${locale}`;

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('id, status, amount_eur, iccid, checkout_ref, setup_token, payment_confirmed_at, created_at, tariffs(id, name, country_name, country_code, flag_emoji, data_gb, validity_days)')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!order) notFound();

  const tariff = (order as any).tariffs;
  const countryLabel = tariff
    ? displayCountryName({ country_code: tariff.country_code, country_name: tariff.country_name } as any, locale)
    : 'eSIM';

  const isPaid = ['completed', 'paid', 'provisioning'].includes(order.status) || Boolean(order.payment_confirmed_at) || Boolean(order.iccid);
  let existingFeedback: { id: string; rating: number; created_at: string } | null = null;
  if (isPaid) {
    try {
      const { data: fb } = await (service.from('feedbacks' as any))
        .select('id, rating, created_at')
        .eq('order_id', order.id)
        .maybeSingle();
      existingFeedback = fb as any;
    } catch (fbErr) {
      console.error('[OrderDetailPage] feedback query error:', fbErr);
    }
  }

  return (
    <OrderDetailClient
      order={{
        id: order.id,
        status: order.status,
        amount_eur: Number(order.amount_eur || 0),
        iccid: order.iccid ? `•••• ${order.iccid.slice(-4)}` : null,
        created_at: order.created_at,
        checkout_ref: order.checkout_ref,
        setup_token: (order as any).setup_token,
      }}
      tariff={tariff}
      countryLabel={countryLabel}
      userEmail={user.email || ''}
      prefix={prefix}
      locale={locale}
      existingFeedback={existingFeedback}
    />
  );
}
