/**
 * Order fulfilment — provider-agnostic.
 *
 * Called once a payment is confirmed (typically by the crypto watcher).
 * Loads a single order, provisions the eSIM / top-up via esimaccess, stores the
 * delivery details and sends the confirmation e-mail. Idempotent.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { allocateEsim, applyTopUp } from '@/lib/esimaccess/client';
import { sendEsimEmail, sendTopUpEmail } from '@/lib/email/mailer';
import { applyOrderCompletionCashback } from './cashback';

export interface FulfillResult { orderId: string; ok: boolean; error?: string }

/** Fulfil a single order by id. Safe to call multiple times (idempotent). */
export async function fulfillOrder(
  supabase: ReturnType<typeof createServiceClient>,
  orderId:  string,
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

  if (o.status === 'completed') return { orderId, ok: true };

  await supabase.from('orders')
    .update({ status: 'provisioning', payment_confirmed_at: o.payment_confirmed_at ?? new Date().toISOString() })
    .eq('id', orderId);

  try {
    if (o.order_type === 'top_up') {
      if (!o.top_up_iccid) throw new Error('top_up_iccid missing');
      await applyTopUp(o.top_up_iccid, o.tariffs.package_code, orderId);
      await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
      await sendTopUpEmail({
        to: o.customer_email, customerName: o.customer_name ?? undefined,
        iccid: o.top_up_iccid, tariffName: o.tariffs.name,
        dataGb: o.tariffs.data_gb ?? 0, validityDays: o.period_num ?? o.tariffs.validity_days,
        priceEur: o.amount_eur ?? o.tariffs.sale_price_eur, orderId,
      });
      await applyOrderCompletionCashback(supabase, orderId);
      return { orderId, ok: true };
    }

    // new_esim
    const periodNum = o.period_num ?? undefined;
    let priceRaw: number | undefined;
    if (periodNum && o.tariffs.raw_data) {
      const perDayRaw = Number(o.tariffs.raw_data.price);
      if (Number.isFinite(perDayRaw) && perDayRaw > 0) priceRaw = perDayRaw * periodNum;
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

    await sendEsimEmail({
      to: o.customer_email, customerName: o.customer_name ?? undefined,
      tariffName: o.tariffs.name, countryName: o.tariffs.country_name,
      dataGb: o.tariffs.data_gb ?? 0, validityDays: o.period_num ?? o.tariffs.validity_days,
      priceEur: o.amount_eur ?? o.tariffs.sale_price_eur,
      iccid: esim.iccid, qrCodeUrl: esim.qrCodeUrl, activationCode: esim.matchingId,
      smdpAddress: esim.smdpAddress, apn: esim.apn, lpaCode: esim.lpaCode ?? '', orderId,
    });
    await applyOrderCompletionCashback(supabase, orderId);
    return { orderId, ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[fulfillment] error for order', orderId, message);
    await supabase.from('orders').update({ status: 'failed', error_message: message }).eq('id', orderId);
    return { orderId, ok: false, error: message };
  }
}

/** Fulfil many orders sequentially. */
export async function fulfillOrders(
  supabase: ReturnType<typeof createServiceClient>,
  orderIds: string[],
): Promise<FulfillResult[]> {
  const out: FulfillResult[] = [];
  for (const id of orderIds) out.push(await fulfillOrder(supabase, id));
  return out;
}
