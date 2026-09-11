/**
 * Order fulfilment — provider-agnostic.
 *
 * Called once a payment is confirmed (typically by the crypto watcher).
 * Loads a single order, provisions the eSIM / top-up via esimaccess, stores the
 * delivery details and sends the confirmation e-mail. Idempotent.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { allocateEsim, applyTopUp } from '@/lib/esimaccess/client';
import { sendEsimEmail, sendTopUpEmail, sendConsolidatedOrderEmail } from '@/lib/email/mailer';
import { applyOrderCompletionCashback } from './cashback';
import { getEsimOverviewUrl } from '@/lib/url';

export interface FulfillResult { orderId: string; ok: boolean; error?: string }

export interface FulfillOptions {
  forceResendEmail?: boolean;
  isLatePayment?: boolean;
  skipEmail?: boolean;
}

/** Sends a single consolidated email for one or more completed orders */
export async function sendConsolidatedEmailForOrders(
  supabase: ReturnType<typeof createServiceClient>,
  orders: any[],
  options?: FulfillOptions
): Promise<void> {
  if (!orders || orders.length === 0) return;
  const first = orders[0];
  const customerEmail = first.customer_email;
  if (!customerEmail) return;

  const customerName = orders.find((o) => Boolean(o.customer_name))?.customer_name ?? undefined;
  const locale = orders.find((o) => Boolean(o.locale))?.locale ?? undefined;

  let txId = first.checkout_ref;
  try {
    const { data: sessions } = await supabase
      .from('crypto_sessions')
      .select('id, order_ids')
      .eq('customer_email', customerEmail);

    if (sessions) {
      const session = sessions.find((s: any) =>
        orders.some((o) => s.order_ids?.includes(o.id))
      );
      if (session) txId = session.id;
    }
  } catch (err) {
    console.error('[fulfillment] session lookup failed for email:', err);
  }

  const orderRef = txId || first.checkout_ref || first.id;
  let totalPaidEur = 0;

  const items = orders.map((o) => {
    const price = Number(o.amount_eur ?? o.tariffs?.sale_price_eur ?? 0);
    totalPaidEur += price;

    if (o.order_type === 'top_up') {
      return {
        orderId: o.id,
        type: 'top_up' as const,
        countryName: o.tariffs?.country_name || 'Global',
        tariffName: o.tariffs?.name || 'Top-Up',
        dataGb: Number(o.tariffs?.data_gb ?? 0),
        validityDays: Number(o.period_num ?? o.tariffs?.validity_days ?? 1),
        priceEur: price,
        iccid: o.top_up_iccid || o.iccid || '',
        topUpIccid: o.top_up_iccid,
      };
    } else {
      const finalToken = txId || o.checkout_ref || o.id;
      const overviewUrl = o.iccid ? getEsimOverviewUrl(finalToken, o.iccid) : undefined;
      return {
        orderId: o.id,
        type: 'new_esim' as const,
        countryName: o.tariffs?.country_name || 'Global',
        tariffName: o.tariffs?.name || 'eSIM',
        dataGb: Number(o.tariffs?.data_gb ?? 0),
        validityDays: Number(o.period_num ?? o.tariffs?.validity_days ?? 1),
        priceEur: price,
        iccid: o.iccid || '',
        qrCodeUrl: o.qr_code_url,
        activationCode: o.activation_code,
        smdpAddress: o.smdp_address,
        apn: o.apn ?? 'internet',
        lpaCode: o.smdp_address ? `LPA:1$${o.smdp_address}$${o.activation_code || ''}` : undefined,
        overviewUrl,
      };
    }
  });

  try {
    await sendConsolidatedOrderEmail({
      to: customerEmail,
      customerName,
      orderRef,
      totalPaidEur,
      items,
      locale,
      isLatePayment: options?.isLatePayment,
    });
  } catch (emailErr) {
    console.error('[fulfillment] sendConsolidatedOrderEmail dispatch error:', emailErr);
  }
}

/** Fulfil a single order by id. Safe to call multiple times (idempotent). */
export async function fulfillOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId:  string,
  options?: FulfillOptions,
): Promise<FulfillResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: order, error } = await supabase
    .from('orders')
    .select('*, tariffs(*)')
    .eq('id', orderId)
    .single();

  if (error || !order) return { orderId, ok: false, error: 'order not found' };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const o = order as any;

  if (o.status === 'completed' && !options?.forceResendEmail) {
    return { orderId, ok: true };
  }

  // If already completed and forceResendEmail is requested, dispatch consolidated email & return
  if (o.status === 'completed' && options?.forceResendEmail) {
    await sendConsolidatedEmailForOrders(supabase, [o], options);
    return { orderId, ok: true };
  }

  // ── HARD SECURITY GATE: Check crypto session validity if order is crypto-funded ──
  try {
    const { data: cryptoSess } = await (supabase.from('crypto_sessions') as any)
      .select('id, status, received_amount, crypto_amount')
      .filter('order_ids', 'cs', `{"${orderId}"}`)
      .maybeSingle();

    if (cryptoSess) {
      const rec = Number(cryptoSess.received_amount || 0);
      const exp = Number(cryptoSess.crypto_amount || 0);
      // If crypto session exists but has 0 received funds, BLOCK FULFILLMENT!
      if (rec <= 0 || cryptoSess.status === 'cancelled' || cryptoSess.status === 'expired') {
        console.error(`[FULFILLMENT CRITICAL SECURITY] Blocked provisioning for order ${orderId}: crypto session ${cryptoSess.id} has 0 received amount (${rec}/${exp}, status=${cryptoSess.status})!`);
        return { orderId, ok: false, error: 'Cannot fulfill crypto order without verified funds received.' };
      }
    }
  } catch (secErr) {
    console.warn('[fulfillment] crypto session check notice:', (secErr as Error).message);
  }

  await supabase.from('orders')
    .update({ status: 'provisioning', payment_confirmed_at: o.payment_confirmed_at ?? new Date().toISOString() })
    .eq('id', orderId);

  try {
    if (o.order_type === 'top_up') {
      if (!o.top_up_iccid) throw new Error('top_up_iccid missing');
      const periodNum = o.period_num ? Number(o.period_num) : undefined;
      await applyTopUp(o.top_up_iccid, o.tariffs.package_code, orderId, { periodNum });
      await supabase.from('orders').update({ status: 'completed', iccid: o.top_up_iccid }).eq('id', orderId);
      
      try {
        await applyOrderCompletionCashback(supabase, orderId);
      } catch (cbErr) {
        console.error('[fulfillment] cashback application error:', cbErr);
      }

      if (!options?.skipEmail) {
        const { data: freshOrder } = await supabase.from('orders').select('*, tariffs(*)').eq('id', orderId).single();
        await sendConsolidatedEmailForOrders(supabase, [freshOrder || o], options);
      }

      return { orderId, ok: true };
    }

    // new_esim
    const periodNum = o.period_num ? Number(o.period_num) : undefined;
    let priceRaw: number | undefined;
    if (periodNum && o.tariffs?.raw_data?.price) {
      const perDayRaw = Number(o.tariffs.raw_data.price);
      if (Number.isFinite(perDayRaw) && perDayRaw > 0) priceRaw = perDayRaw * periodNum;
    } else if (o.tariffs?.raw_data?.price) {
      const raw = Number(o.tariffs.raw_data.price);
      if (Number.isFinite(raw) && raw > 0) priceRaw = raw;
    } else if (o.tariffs?.ek_price_usd) {
      const raw = Math.round(Number(o.tariffs.ek_price_usd) * 10000);
      if (Number.isFinite(raw) && raw > 0) priceRaw = raw;
    }

    const esimRes = await allocateEsim(o.tariffs.package_code, orderId, { periodNum, priceRaw });
    if (!esimRes.success) throw new Error(`esimaccess allocation failed: ${esimRes.errorCode}`);
    const esim = esimRes.obj;

    await supabase.from('orders').update({
      status:          'completed',
      iccid:           esim.iccid,
      qr_code_url:     esim.qrCodeUrl,
      short_url:       esim.shortUrl ?? null,
      activation_code: esim.matchingId,
      smdp_address:    esim.smdpAddress,
      apn:             esim.apn,
      esim_status:     'new',
      esim_status_at:  new Date().toISOString(),
    }).eq('id', orderId);

    try {
      await applyOrderCompletionCashback(supabase, orderId);
    } catch (cbErr) {
      console.error('[fulfillment] cashback application error:', cbErr);
    }

    if (!options?.skipEmail) {
      const { data: freshOrder } = await supabase.from('orders').select('*, tariffs(*)').eq('id', orderId).single();
      await sendConsolidatedEmailForOrders(supabase, [freshOrder || o], options);
    }

    return { orderId, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[fulfillment] error for order', orderId, message);
    await supabase.from('orders').update({ status: 'failed', error_message: message }).eq('id', orderId);
    return { orderId, ok: false, error: message };
  }
}

/** Fulfil many orders sequentially and dispatch a single consolidated email. */
export async function fulfillOrders(
  supabase: ReturnType<typeof createServiceClient>,
  orderIds: string[],
  options?: FulfillOptions,
): Promise<FulfillResult[]> {
  const out: FulfillResult[] = [];
  for (const id of orderIds) {
    out.push(await fulfillOrder(supabase, id, { ...options, skipEmail: true }));
  }

  // If email was not requested to be skipped, send 1 consolidated email for all successfully completed orders in this batch
  if (!options?.skipEmail) {
    const successIds = out.filter((r) => r.ok).map((r) => r.orderId);
    if (successIds.length > 0) {
      const { data: completedOrders } = await supabase
        .from('orders')
        .select('*, tariffs(*)')
        .in('id', successIds)
        .eq('status', 'completed');

      if (completedOrders && completedOrders.length > 0) {
        await sendConsolidatedEmailForOrders(supabase, completedOrders, options);
      }
    }
  }

  return out;
}

/**
 * Sweeps completed orders from the last 7 days that do not have a recorded 'sent' email
 * and automatically retries email delivery.
 */
export async function sweepFailedEmailDeliveries(supabase: ReturnType<typeof createServiceClient>) {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: completedOrders } = await supabase
      .from('orders')
      .select('id, status, customer_email, iccid, created_at')
      .eq('status', 'completed')
      .gt('created_at', sevenDaysAgo)
      .order('created_at', { ascending: false })
      .limit(30);

    const validOrders = (completedOrders || []).filter((o: any) => Boolean(o.iccid));

    if (validOrders.length > 0) {
      const { data: sentList } = await (supabase.from('sent_emails' as any))
        .select('metadata, status')
        .eq('status', 'sent');

      const sentOrderIds = new Set(
        (sentList || []).flatMap((s: any) => [
          s.metadata?.order_id,
          ...(Array.isArray(s.metadata?.order_ids) ? s.metadata.order_ids : [])
        ]).filter(Boolean)
      );

      for (const ord of validOrders) {
        if (!sentOrderIds.has(ord.id)) {
          console.log(`[sweepFailedEmailDeliveries] Auto-retrying email delivery for order ${ord.id} (${ord.customer_email})`);
          try {
            await fulfillOrder(supabase, ord.id, { forceResendEmail: true });
          } catch (retryErr) {
            console.warn(`[sweepFailedEmailDeliveries] Retry failed for ${ord.id}:`, (retryErr as Error).message);
          }
        }
      }
    }
  } catch (err) {
    console.error('[sweepFailedEmailDeliveries] Error:', err);
  }
}

