import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import QRCode from 'qrcode';
import { ClientPage } from '@/components/EsimOverviewClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'Deine eSIM einrichten | PureSim' },
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }> | { token: string };
}

export default async function SetupViewPage({ params }: PageProps) {
  const resolvedParams = await Promise.resolve(params);
  const token = resolvedParams?.token?.trim();
  if (!token) {
    return notFound();
  }

  const db = createServiceClient();

  // Find order by setup_token
  const { data: order, error } = await db
    .from('orders')
    .select('id, status, iccid, smdp_address, activation_code, apn, period_num, checkout_ref, setup_token, tariff_id, tariffs(country_name, flag_emoji, data_gb, validity_days)')
    .eq('setup_token', token)
    .maybeSingle();

  if (error || !order || !['completed', 'paid', 'provisioning'].includes(order.status)) {
    return notFound();
  }

  const tariff = (order as any).tariffs;
  const countryName = tariff?.country_name || 'eSIM';
  const flag = tariff?.flag_emoji || '🌐';
  const dataGb = order.period_num ? null : (tariff?.data_gb ?? null);
  const validityDays = order.period_num ?? tariff?.validity_days ?? 1;

  // Masked ICCID: only last 4 digits in initial HTML/RSC
  const maskedIccid = order.iccid ? `•••• ${order.iccid.slice(-4)}` : '';

  // Sibling eSIMs in same checkout
  let siblingEsims: { setupToken: string; countryName: string; flag: string | null }[] = [];
  if (order.checkout_ref) {
    try {
      const { data: siblings } = await db
        .from('orders')
        .select('setup_token, tariffs(country_name, flag_emoji)')
        .eq('checkout_ref', order.checkout_ref)
        .in('status', ['completed', 'paid', 'provisioning']);

      if (siblings && siblings.length > 1) {
        siblingEsims = siblings
          .filter((s: any) => s.setup_token)
          .map((s: any) => ({
            setupToken: s.setup_token,
            countryName: s.tariffs?.country_name || 'eSIM',
            flag: s.tariffs?.flag_emoji || null,
          }));
      }
    } catch {
      // Non-critical: sibling lookup failed
    }
  }

  // Generate QR code server-side
  let qrCodeDataUrl = '';
  if (order.activation_code) {
    try {
      qrCodeDataUrl = await QRCode.toDataURL(order.activation_code, {
        errorCorrectionLevel: 'M',
        margin: 2,
        width: 320,
        color: { dark: '#000000', light: '#ffffff' },
      });
    } catch {
      // Non-critical: QR generation failed
    }
  }

  return (
    <ClientPage
      orderId={order.id}
      maskedIccid={maskedIccid}
      hasIccid={Boolean(order.iccid)}
      setupToken={(order as any).setup_token}
      smdpAddress={order.smdp_address || 'rsp.truphone.com'}
      activationCode={order.activation_code || ''}
      apn={order.apn || 'globaldata'}
      qrCodeDataUrl={qrCodeDataUrl}
      countryName={countryName}
      flag={flag}
      dataGb={dataGb}
      validityDays={validityDays}
      token={token}
      siblingEsims={siblingEsims}
    />
  );
}
