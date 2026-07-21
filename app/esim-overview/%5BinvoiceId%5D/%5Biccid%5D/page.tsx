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

  const cleanInvoiceId = invoiceId.trim();
  const cleanIccid = iccid.trim();

  const db = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let matchingOrder: any = null;

  // 1. Look up via crypto session (invoiceId == crypto_sessions.id)
  try {
    const { data: session } = await db
      .from('crypto_sessions')
      .select('order_ids')
      .eq('id', cleanInvoiceId)
      .maybeSingle();

    if (session && Array.isArray(session.order_ids) && session.order_ids.length > 0) {
      const { data: orders } = await db
        .from('orders')
        .select('*')
        .in('id', session.order_ids)
        .eq('iccid', cleanIccid)
        .eq('status', 'completed');

      if (orders && orders.length > 0) {
        matchingOrder = orders[0];
      }
    }
  } catch (err) {
    console.error('[EsimOverviewPage] Session lookup error:', err);
  }

  // 2. Look up via checkout_ref
  if (!matchingOrder) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('*')
        .eq('checkout_ref', cleanInvoiceId)
        .eq('iccid', cleanIccid)
        .eq('status', 'completed');

      if (orders && orders.length > 0) {
        matchingOrder = orders[0];
      }
    } catch (err) {
      console.error('[EsimOverviewPage] Checkout ref lookup error:', err);
    }
  }

  // 3. Look up via order ID directly (invoiceId == orders.id)
  if (!matchingOrder) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('*')
        .eq('id', cleanInvoiceId)
        .eq('iccid', cleanIccid)
        .eq('status', 'completed');

      if (orders && orders.length > 0) {
        matchingOrder = orders[0];
      }
    } catch (err) {
      console.error('[EsimOverviewPage] Order ID lookup error:', err);
    }
  }

  // 4. Look up via ICCID directly (resilient fallback for completed eSIMs)
  if (!matchingOrder) {
    try {
      const { data: orders } = await db
        .from('orders')
        .select('*')
        .eq('iccid', cleanIccid)
        .eq('status', 'completed');

      if (orders && orders.length > 0) {
        matchingOrder = orders[0];
      }
    } catch (err) {
      console.error('[EsimOverviewPage] Direct ICCID lookup error:', err);
    }
  }

  // Anti-tampering & Security Check: If order is not found or not completed, deny access (404)
  if (!matchingOrder || matchingOrder.status !== 'completed') {
    return notFound();
  }

  // Fetch tariff specifications with resilient fallback
  let countryName = 'eSIM';
  let flag: string | null = '🌐';
  let dataGb: number | null = null;
  let validityDays = 1;

  if (matchingOrder.tariff_id) {
    try {
      const { data: tariff } = await db
        .from('tariffs')
        .select('country_name, flag_emoji, data_gb, validity_days')
        .eq('id', matchingOrder.tariff_id)
        .maybeSingle();

      if (tariff) {
        countryName = tariff.country_name;
        flag = tariff.flag_emoji;
        dataGb = matchingOrder.period_num ? null : tariff.data_gb;
        validityDays = matchingOrder.period_num ?? tariff.validity_days;
      }
    } catch (err) {
      console.error('[EsimOverviewPage] Tariff fetch error:', err);
    }
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
      countryName={countryName}
      flag={flag}
      dataGb={dataGb}
      validityDays={validityDays}
    />
  );
}
