/**
 * GET /api/order/status?ref=<checkout_ref>
 *
 * Public lookup of a checkout's orders by its unguessable checkout_ref.
 * Used by the /order page to poll until all eSIMs are provisioned.
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getEsimOverviewUrl } from '@/lib/url';
import { isUuid } from '@/lib/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ref = searchParams.get('ref');
  if (!ref) return NextResponse.json({ error: 'ref required' }, { status: 400 });

  const service = createServiceClient();
  const { data, error } = await service
    .from('orders')
    .select('id, status, amount_eur, period_num, iccid, apn, smdp_address, activation_code, qr_code_url, esim_status, created_at, customer_email, tariffs(country_name, flag_emoji, data_gb, validity_days)')
    .eq('checkout_ref', ref)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[order/status] query error:', error.message);
    return NextResponse.json({ error: 'lookup failed' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ ref, found: false, orders: [] }, { status: 200 });
  }

  // Find corresponding crypto session to check payment status and secure token
  let txId = ref;
  let paymentStatus: string = 'pending';

  try {
    const validOrderIds = data.map((o: any) => o.id).filter(isUuid);
    const customerEmail = data[0].customer_email;
    const { data: sessions } = await service
      .from('crypto_sessions')
      .select('id, order_ids, status, expires_at')
      .eq('customer_email', customerEmail);

    if (sessions) {
      const session = sessions.find((s) => {
        const sOrderIds = Array.isArray(s.order_ids) ? s.order_ids : [];
        return validOrderIds.some((id: string) => sOrderIds.includes(id));
      });
        if (session) {
          // Trigger instant direct chain check if session is active
          if (['pending', 'detected', 'partially_paid'].includes(session.status)) {
            try {
              const { syncSessionWithGateway } = await import('@/app/api/crypto/session/[id]/route');
              await syncSessionWithGateway(session.id, service);
              
              // Refetch updated session status
              const { data: updatedS } = await service
                .from('crypto_sessions')
                .select('status, expires_at')
                .eq('id', session.id)
                .maybeSingle();
              if (updatedS) {
                session.status = updatedS.status;
                session.expires_at = updatedS.expires_at;
              }
            } catch (syncErr) {
              console.warn('[order/status] Instant sync warning:', syncErr);
            }
          }

          txId = session.id;
          const now = Date.now();
          const expiresMs = session.expires_at ? new Date(session.expires_at).getTime() : 0;
          const isExpired = session.status === 'pending' && expiresMs > 0 && expiresMs <= now;
          paymentStatus = isExpired ? 'expired' : session.status;

        // If payment expired/cancelled, update pending orders in DB
        if ((paymentStatus === 'expired' || paymentStatus === 'cancelled') && validOrderIds.length > 0) {
          await service
            .from('orders')
            .update({ status: 'expired' })
            .in('id', validOrderIds)
            .in('status', ['pending']);

          // Update in-memory data status
          data.forEach((o: any) => {
            if (o.status === 'pending') o.status = 'expired';
          });
        }
      }
    }
  } catch (err) {
    console.error('[order/status] session lookup failed:', err);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const orders = data.map((o: any) => {
    const finalToken = txId || ref || o.id;
    return {
      id:             o.id,
      status:         o.status,
      amountEur:      o.amount_eur,
      countryName:    o.tariffs?.country_name ?? 'eSIM',
      flag:           o.tariffs?.flag_emoji ?? null,
      dataGb:         o.tariffs?.data_gb ?? null,
      validityDays:   o.period_num ?? o.tariffs?.validity_days ?? 0,
      iccid:          o.iccid,
      apn:            o.apn || 'internet',
      shortUrl:       null,
      smdpAddress:    o.smdp_address,
      activationCode: o.activation_code,
      qrCodeUrl:      o.qr_code_url,
      esimStatus:     o.esim_status,
      overviewUrl:    o.iccid ? getEsimOverviewUrl(finalToken, o.iccid) : null,
    };
  });

  const allDone = orders.every((o) => o.status === 'completed' || o.status === 'failed' || o.status === 'expired' || o.status === 'cancelled');
  const isPaid = orders.some((o) => o.status === 'paid' || o.status === 'completed' || o.status === 'provisioning');
  const totalPaid = isPaid ? orders.reduce((s, o) => s + (o.amountEur ?? 0), 0) : 0;

  return NextResponse.json({ ref, found: true, allDone, isPaid, paymentStatus, totalPaid, orders });
}
