import { createServiceClient } from '@/lib/supabase/server';
import { getEsimOverviewUrl } from '@/lib/url';
import { isUuid } from '@/lib/utils';
import { query as runRawQuery } from '@/lib/db';

export interface OrderLookupItem {
  id: string;
  status: string;
  amountEur: number | null;
  countryCode: string | null;
  countryName: string;
  flag: string | null;
  dataGb: number | null;
  validityDays: number;
  iccid: string | null;
  apn: string;
  shortUrl: string | null;
  setupToken: string | null;
  smdpAddress: string | null;
  activationCode: string | null;
  qrCodeUrl: string | null;
  esimStatus: string | null;
  orderType: string;
  topUpIccid: string | null;
  tariffName: string;
  overviewUrl: string | null;
}

export interface OrderLookupResult {
  ref: string;
  found: boolean;
  allDone: boolean;
  isPaid: boolean;
  paymentStatus: string;
  totalPaid: number;
  orders: OrderLookupItem[];
}

export async function lookupOrderData(rawRef: string | null | undefined): Promise<OrderLookupResult | null> {
  const ref = rawRef?.trim();
  if (!ref || !isUuid(ref)) {
    return null;
  }

  const service = createServiceClient();
  const selectFields =
    'id, status, amount_eur, period_num, iccid, apn, smdp_address, activation_code, qr_code_url, esim_status, created_at, customer_email, order_type, top_up_iccid, setup_token, tariffs(name, country_code, country_name, flag_emoji, data_gb, validity_days)';

  // 1. Primary: match by checkout_ref
  const { data: initialData, error } = await service
    .from('orders')
    .select(selectFields)
    .eq('checkout_ref', ref)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[order-lookup] query error:', error.message);
  }

  let data = initialData;

  // 2. Fallback 1: match by exact order id
  if (!data || data.length === 0) {
    const { data: byId } = await service
      .from('orders')
      .select(selectFields)
      .eq('id', ref);
    if (byId && byId.length > 0) {
      data = byId;
    }
  }

  // 3. Fallback 2: match by exact crypto session id
  if (!data || data.length === 0) {
    try {
      const sessionRes = await runRawQuery(
        'SELECT order_ids FROM crypto_sessions WHERE id = $1 LIMIT 1',
        [ref]
      );
      if (sessionRes.rows && sessionRes.rows.length > 0) {
        const orderIds = sessionRes.rows[0].order_ids;
        if (Array.isArray(orderIds) && orderIds.length > 0) {
          const { data: bySession } = await service
            .from('orders')
            .select(selectFields)
            .in('id', orderIds)
            .order('created_at', { ascending: true });
          if (bySession && bySession.length > 0) {
            data = bySession;
          }
        }
      }
    } catch (sessErr) {
      console.warn('[order-lookup] crypto session lookup error:', sessErr);
    }
  }

  if (!data || data.length === 0) {
    return null;
  }

  // Find corresponding crypto session to check payment status
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
        // Trigger instant direct sync if active
        if (['pending', 'detected', 'partially_paid'].includes(session.status)) {
          try {
            const { syncSessionWithGateway } = await import('@/app/api/crypto/session/[id]/route');
            await syncSessionWithGateway(session.id, service);

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
            console.warn('[order-lookup] instant sync warning:', syncErr);
          }
        }

        const now = Date.now();
        const expiresMs = session.expires_at ? new Date(session.expires_at).getTime() : 0;
        const isExpired = session.status === 'pending' && expiresMs > 0 && expiresMs <= now;
        paymentStatus = isExpired ? 'expired' : session.status;

        if ((paymentStatus === 'expired' || paymentStatus === 'cancelled') && validOrderIds.length > 0) {
          await service
            .from('orders')
            .update({ status: 'expired' })
            .in('id', validOrderIds)
            .in('status', ['pending']);

          data.forEach((o: any) => {
            if (o.status === 'pending') o.status = 'expired';
          });
        }
      }
    }
  } catch (err) {
    console.error('[order-lookup] session check failed:', err);
  }

  const orders: OrderLookupItem[] = data.map((o: any) => {
    const installUrl = o.setup_token ? getEsimOverviewUrl(o.setup_token) : null;
    return {
      id:             o.id,
      status:         o.status,
      amountEur:      o.amount_eur,
      countryCode:    o.tariffs?.country_code ?? null,
      countryName:    o.tariffs?.country_name ?? 'eSIM',
      flag:           o.tariffs?.flag_emoji ?? null,
      dataGb:         o.tariffs?.data_gb ?? null,
      validityDays:   o.period_num ?? o.tariffs?.validity_days ?? 0,
      iccid:          o.iccid,
      apn:            o.apn || 'internet',
      shortUrl:       installUrl,
      setupToken:     o.setup_token ?? null,
      smdpAddress:    o.smdp_address,
      activationCode: o.activation_code,
      qrCodeUrl:      o.qr_code_url,
      esimStatus:     o.esim_status,
      orderType:      o.order_type || 'new_esim',
      topUpIccid:     o.top_up_iccid || o.iccid,
      tariffName:     o.tariffs?.name || (o.order_type === 'top_up' ? 'Top-Up' : 'eSIM'),
      overviewUrl:    installUrl,
    };
  });

  const allDone = orders.every(
    (o) => o.status === 'completed' || o.status === 'failed' || o.status === 'expired' || o.status === 'cancelled'
  );
  const isPaid = orders.some((o) => o.status === 'paid' || o.status === 'completed' || o.status === 'provisioning');
  const totalPaid = isPaid ? orders.reduce((s, o) => s + (o.amountEur ?? 0), 0) : 0;

  return {
    ref,
    found: true,
    allDone,
    isPaid,
    paymentStatus,
    totalPaid,
    orders,
  };
}
