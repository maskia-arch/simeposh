/**
 * GET /api/order/status?ref=<checkout_ref>
 *
 * Public lookup of a checkout's orders by its unguessable checkout_ref.
 * Used by the /order page to poll until all eSIMs are provisioned.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  if (!ref) return NextResponse.json({ error: 'ref required' }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('orders')
    .select('id, status, amount_eur, period_num, iccid, short_url, smdp_address, activation_code, qr_code_url, esim_status, created_at, tariffs(country_name, flag_emoji, data_gb, validity_days)')
    .eq('checkout_ref', ref)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[order/status] query error:', error.message);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ref, found: false, orders: [] }, { status: 200 });
  }

  // Find corresponding crypto session to use its ID as the secure token (or fallback to ref)
  let txId = ref;
  try {
    const orderIds = data.map((o: any) => o.id);
    const customerEmail = data[0].customer_email;
    const { data: sessions } = await service
      .from('crypto_sessions')
      .select('id, order_ids')
      .eq('customer_email', customerEmail);

    if (sessions) {
      const session = sessions.find((s) => s.order_ids?.includes(orderIds[0]));
      if (session) {
        txId = session.id;
      }
    }
  } catch (err) {
    console.error('[order/status] session lookup failed:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = data.map((o: any) => ({
    id:             o.id,
    status:         o.status,
    amountEur:      o.amount_eur,
    countryName:    o.tariffs?.country_name ?? 'eSIM',
    flag:           o.tariffs?.flag_emoji ?? null,
    dataGb:         o.tariffs?.data_gb ?? null,
    validityDays:   o.period_num ?? o.tariffs?.validity_days ?? 0,
    iccid:          o.iccid,
    shortUrl:       o.short_url,
    smdpAddress:    o.smdp_address,
    activationCode: o.activation_code,
    qrCodeUrl:      o.qr_code_url,
    esimStatus:     o.esim_status,
    overviewUrl:    o.iccid ? `https://esim.puresim.net/${txId}/${o.iccid}` : null,
  }));

  const allDone = orders.every((o) => o.status === 'completed' || o.status === 'failed');
  const totalPaid = orders.reduce((s, o) => s + (o.amountEur ?? 0), 0);

  return NextResponse.json({ ref, found: true, allDone, totalPaid, orders });
}
