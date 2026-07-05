import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import { ClientPage } from './ClientPage';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ invoiceId: string; iccid: string }>;
}

export default async function EsimOverviewPage({ params }: PageProps) {
  const { invoiceId, iccid } = await params;
  if (!invoiceId || !iccid) {
    return notFound();
  }

  const db = createServiceClient();
  let matchingOrder = null;

  // 1. Look up via crypto session
  const { data: session } = await db
    .from('crypto_sessions')
    .select('order_ids')
    .eq('id', invoiceId)
    .maybeSingle();

  if (session && Array.isArray(session.order_ids)) {
    const { data: orders } = await db
      .from('orders')
      .select('*')
      .in('id', session.order_ids);

    if (orders) {
      matchingOrder = orders.find((o) => o.iccid === iccid);
    }
  }

  // 2. Fallback lookup via checkout_ref directly (for eSIM Cash or direct checkout)
  if (!matchingOrder) {
    const { data: orders } = await db
      .from('orders')
      .select('*')
      .eq('checkout_ref', invoiceId)
      .eq('iccid', iccid);

    if (orders && orders.length > 0) {
      matchingOrder = orders[0];
    }
  }

  // If order does not exist or is not completed, block access
  if (!matchingOrder || matchingOrder.status !== 'completed') {
    return notFound();
  }

  // Fetch tariff specifications
  const { data: tariff } = await db
    .from('tariffs')
    .select('country_name, flag_emoji, data_gb, validity_days')
    .eq('id', matchingOrder.tariff_id)
    .maybeSingle();

  if (!tariff) {
    return notFound();
  }

  // Server-side generate QR Code as base64 data URL
  const activationString = `LPA:1$${matchingOrder.smdp_address || ''}$${matchingOrder.activation_code || ''}`;
  let qrCodeDataUrl = '';
  try {
    qrCodeDataUrl = await QRCode.toDataURL(activationString, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: 'M',
    });
  } catch (err) {
    console.error('[EsimOverviewPage] QR Code generation failed:', err);
  }

  return (
    <ClientPage
      iccid={matchingOrder.iccid ?? ''}
      smdpAddress={matchingOrder.smdp_address ?? ''}
      activationCode={matchingOrder.activation_code ?? ''}
      apn={matchingOrder.apn ?? 'internet'}
      qrCodeDataUrl={qrCodeDataUrl}
      countryName={tariff.country_name}
      flag={tariff.flag_emoji}
      dataGb={matchingOrder.period_num ? null : tariff.data_gb}
      validityDays={matchingOrder.period_num ?? tariff.validity_days}
    />
  );
}
