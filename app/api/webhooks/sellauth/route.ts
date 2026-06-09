/**
 * POST /api/webhooks/sellauth
 *
 * Receives payment events from Sellauth, verifies the HMAC-SHA256 signature,
 * provisions the eSIM via esimaccess, sends confirmation email, and updates
 * the order in Supabase.
 *
 * This endpoint must be public (no auth) – Sellauth calls it from their servers.
 */
import { NextResponse }            from 'next/server';
import { verifySellauthSignature } from '@/lib/sellauth/webhook';
import { allocateEsim, applyTopUp } from '@/lib/esimaccess/client';
import { deleteProduct }            from '@/lib/sellauth/client';
import { createServiceClient }     from '@/lib/supabase/server';
import { sendEsimEmail, sendTopUpEmail } from '@/lib/email/mailer';
import type { SellauthWebhookPayload } from '@/lib/sellauth/types';

export const runtime = 'nodejs';

// Disable Next.js body parsing – we need the raw body for HMAC verification
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // ── 1. Read raw body ─────────────────────────────────────
  const rawBody  = Buffer.from(await request.arrayBuffer());
  const signature = request.headers.get('x-sellauth-signature');

  // ── 2. Verify signature ──────────────────────────────────
  let isValid = false;
  try {
    isValid = verifySellauthSignature(rawBody, signature);
  } catch (err) {
    console.error('[webhook/sellauth] Signature verification error:', err);
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  if (!isValid) {
    console.warn('[webhook/sellauth] Invalid signature received');
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── 3. Parse payload ─────────────────────────────────────
  let payload: SellauthWebhookPayload;
  try {
    payload = JSON.parse(rawBody.toString('utf-8')) as SellauthWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // We only process paid orders
  if (payload.event !== 'order.paid') {
    return NextResponse.json({ received: true, skipped: payload.event });
  }

  const { order: sellauthOrder } = payload;
  const supabase = createServiceClient();

  // ── 4. Resolve ALL orders for this payment ───────────────
  // A single Sellauth invoice can cover a cart of multiple eSIMs, so we may
  // have several order rows sharing the same sellauth_order_id.
  let orders: OrderWithTariff[] = [];

  // 4a. By Sellauth invoice/order id (handles single + cart)
  const { data: byInvoice } = await supabase
    .from('orders')
    .select('*, tariffs(*)')
    .eq('sellauth_order_id', sellauthOrder.id);

  if (byInvoice && byInvoice.length > 0) {
    orders = byInvoice as OrderWithTariff[];
  } else {
    // 4b. Fallback via custom_fields (order_ids comma list, or single order_id)
    const idsField = sellauthOrder.custom_fields?.order_ids
      ?? sellauthOrder.custom_fields?.order_id
      ?? '';
    const ids = idsField.split(',').map((s) => s.trim()).filter(Boolean);

    if (ids.length === 0) {
      console.error('[webhook/sellauth] No orders found for Sellauth ID:', sellauthOrder.id);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: byCustom } = await supabase
      .from('orders')
      .select('*, tariffs(*)')
      .in('id', ids);

    if (!byCustom || byCustom.length === 0) {
      console.error('[webhook/sellauth] No orders found by custom_fields ids:', ids);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    orders = byCustom as OrderWithTariff[];
  }

  // ── 5. Provision each order ──────────────────────────────
  const results: Array<{ orderId: string; ok: boolean; error?: string }> = [];
  for (const order of orders) {
    results.push(await provisionOrder(supabase, order, sellauthOrder));
  }

  const failed = results.filter((r) => !r.ok);

  // ── 6. Clean up the temporary Sellauth "eSIM" products ────
  // Each checkout created its own unlisted product; once everything is
  // provisioned we delete them so they don't accumulate. Best-effort.
  if (failed.length === 0) {
    const productIds = new Set<string>();
    for (const o of orders) {
      const ref = o.sellauth_product_ref;        // "productId:variantId"
      const pid = ref ? ref.split(':')[0] : '';
      if (pid) productIds.add(pid);
    }
    await Promise.allSettled(Array.from(productIds).map((pid) => deleteProduct(pid)));
  }

  // Always return 200 so Sellauth stops retrying; failed ones need manual review.
  return NextResponse.json({
    received:    true,
    provisioned: results.length - failed.length,
    failed:      failed.length,
    results,
  });
}

// ────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────

type OrderWithTariff = {
  id:             string;
  order_type:     'new_esim' | 'top_up';
  status:         string;
  customer_email: string;
  customer_name:  string | null;
  top_up_iccid:   string | null;
  period_num:     number | null;
  amount_eur:     number;
  sellauth_product_ref: string | null;
  tariffs: {
    package_code:  string;
    name:          string;
    country_name:  string;
    data_gb:       number | null;
    validity_days: number;
    sale_price_eur: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    raw_data:      Record<string, any> | null;
  };
};

async function provisionOrder(
  supabase:       ReturnType<typeof createServiceClient>,
  order:          OrderWithTariff,
  sellauthOrder:  SellauthWebhookPayload['order']
): Promise<{ orderId: string; ok: boolean; error?: string }> {
  // Idempotency: skip if already processed
  if (order.status === 'completed') {
    console.log('[webhook/sellauth] Order already completed, skipping:', order.id);
    return { orderId: order.id, ok: true };
  }

  // Mark as paid
  await supabase
    .from('orders')
    .update({
      status:               'paid',
      sellauth_order_id:    sellauthOrder.id,
      payment_confirmed_at: sellauthOrder.paid_at ?? new Date().toISOString(),
    })
    .eq('id', order.id);

  // Mark as provisioning
  await supabase
    .from('orders')
    .update({ status: 'provisioning' })
    .eq('id', order.id);

  try {
    if (order.order_type === 'new_esim') {
      // ── Provision new eSIM ─────────────────────────────
      // For custom day-pass orders pass periodNum + total esimaccess price
      // (per-day raw price × periodNum). Travel plans use periodNum = none.
      const periodNum = order.period_num ?? undefined;
      let priceRaw: number | undefined;
      if (periodNum && order.tariffs.raw_data) {
        const perDayRaw = Number(order.tariffs.raw_data.price);
        if (Number.isFinite(perDayRaw) && perDayRaw > 0) {
          priceRaw = perDayRaw * periodNum;
        }
      }

      const esimRes = await allocateEsim(order.tariffs.package_code, order.id, { periodNum, priceRaw });

      if (!esimRes.success) {
        throw new Error(`esimaccess allocation failed: ${esimRes.errorCode}`);
      }

      const esim = esimRes.obj;

      await supabase
        .from('orders')
        .update({
          status:          'completed',
          iccid:           esim.iccid,
          qr_code_url:     esim.qrCodeUrl,
          short_url:       esim.shortUrl ?? null,
          activation_code: esim.matchingId,
          smdp_address:    esim.smdpAddress,
          apn:             esim.apn,
          esim_status:     'new',
          esim_status_at:  new Date().toISOString(),
        })
        .eq('id', order.id);

      // Send confirmation email (custom day-pass: use chosen days + paid price)
      await sendEsimEmail({
        to:             order.customer_email,
        customerName:   order.customer_name ?? undefined,
        tariffName:     order.tariffs.name,
        countryName:    order.tariffs.country_name,
        dataGb:         order.tariffs.data_gb ?? 0,
        validityDays:   order.period_num ?? order.tariffs.validity_days,
        priceEur:       order.amount_eur ?? order.tariffs.sale_price_eur,
        iccid:          esim.iccid,
        qrCodeUrl:      esim.qrCodeUrl,
        activationCode: esim.matchingId,
        smdpAddress:    esim.smdpAddress,
        apn:            esim.apn,
        lpaCode:        esim.lpaCode ?? '',
        orderId:        order.id,
      });

      console.log(`[webhook/sellauth] eSIM provisioned: order=${order.id} iccid=${esim.iccid}`);
      return { orderId: order.id, ok: true };
    } else if (order.order_type === 'top_up') {
      // ── Apply top-up ───────────────────────────────────
      if (!order.top_up_iccid) {
        throw new Error('top_up_iccid is missing on the order');
      }

      await applyTopUp(
        order.top_up_iccid,
        order.tariffs.package_code,
        order.id
      );

      await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      await sendTopUpEmail({
        to:           order.customer_email,
        customerName: order.customer_name ?? undefined,
        iccid:        order.top_up_iccid,
        tariffName:   order.tariffs.name,
        dataGb:       order.tariffs.data_gb ?? 0,
        validityDays: order.tariffs.validity_days,
        priceEur:     order.tariffs.sale_price_eur,
        orderId:      order.id,
      });

      console.log(`[webhook/sellauth] Top-up applied: order=${order.id} iccid=${order.top_up_iccid}`);
      return { orderId: order.id, ok: true };
    }

    // Unknown order type
    return { orderId: order.id, ok: false, error: `Unknown order_type: ${order.order_type}` };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[webhook/sellauth] Provisioning error:', message);

    await supabase
      .from('orders')
      .update({ status: 'failed', error_message: message })
      .eq('id', order.id);

    // Failed orders need manual handling; caller still returns 200 to Sellauth.
    return { orderId: order.id, ok: false, error: message };
  }
}
