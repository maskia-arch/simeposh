/**
 * POST /api/checkout
 *
 * Creates a Sellauth checkout for a SINGLE eSIM (fixed tariff, custom day-pass,
 * or top-up). The price is ALWAYS computed server-side from the database — the
 * client-sent price is never trusted.
 *
 * Body:
 *   { tariffId, email, orderType?, topUpIccid?, days? }
 *   - days: only for custom unlimited/day-pass configs (1–365). When present the
 *           price is recomputed (per-day × days × discount) and stored as
 *           period_num so the webhook provisions esimaccess with that periodNum.
 *
 * Returns: { checkoutUrl, orderId }
 */
import { NextResponse } from 'next/server';
import { createClient }            from '@/lib/supabase/server';
import { createServiceClient }     from '@/lib/supabase/server';
import { createSingleCheckout }    from '@/lib/sellauth/client';
import { customUnlimitedPriceEur, clampDays } from '@/lib/quote';
import { resolveCustomer }         from '@/lib/customers';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      tariffId:    string;
      email:       string;
      orderType?:  'new_esim' | 'top_up';
      topUpIccid?: string;
      days?:       number;
    };

    const { tariffId, email, orderType = 'new_esim', topUpIccid } = body;

    if (!tariffId || !email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'tariffId and a valid email are required' }, { status: 400 });
    }
    if (orderType === 'top_up' && !topUpIccid) {
      return NextResponse.json({ error: 'topUpIccid is required for top-up orders' }, { status: 400 });
    }

    const service = createServiceClient();

    // ── Fetch authoritative tariff ──────────────────────────────
    const { data: tariff, error: tariffError } = await service
      .from('tariffs')
      .select('*')
      .eq('id', tariffId)
      .eq('is_active', true)
      .single();

    if (tariffError || !tariff) {
      return NextResponse.json({ error: 'Tariff not found' }, { status: 404 });
    }

    // ── Determine price + period (server-authoritative) ─────────
    const isUnlimited = tariff.tariff_type?.startsWith('unlimited') ?? false;
    let amountEur   = tariff.sale_price_eur;
    let periodNum: number | null = null;

    if (orderType === 'new_esim' && isUnlimited && typeof body.days === 'number') {
      periodNum = clampDays(body.days);
      amountEur = customUnlimitedPriceEur(tariff.sale_price_eur, tariff.validity_days, periodNum);
    }

    // ── Resolve customer (logged-in user or guest profile by email) ──
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const userId = await resolveCustomer(service, user, email);

    // Group this checkout's order(s) so the public /order page can find them.
    const checkoutRef = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

    // ── Create pending order ────────────────────────────────────
    const { data: order, error: orderError } = await service
      .from('orders')
      .insert({
        user_id:        userId,
        tariff_id:      tariffId,
        order_type:     orderType,
        status:         'pending',
        customer_email: email,
        customer_name:  user?.user_metadata?.full_name ?? null,
        amount_eur:     amountEur,
        usd_eur_rate:   tariff.usd_eur_rate,
        top_up_iccid:   topUpIccid ?? null,
        period_num:     periodNum,
        checkout_ref:   checkoutRef,
      })
      .select()
      .single();

    if (orderError || !order) {
      console.error('[checkout] Order insert error:', orderError?.message);
      return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
    }

    // ── Create Sellauth checkout (on-demand priced "eSIM" variant) ─────
    const label = periodNum
      ? `${tariff.country_name} · ${tariff.data_gb ?? '∞'}GB/Tag · ${periodNum} Tage`
      : `${tariff.country_name} · ${tariff.name}`;

    const checkout = await createSingleCheckout({
      variantName: label,
      priceEur:    amountEur,
      email,
      quantity:    1,
      redirectUrl: `${appUrl}/order?ref=${checkoutRef}`,
    });

    // ── Link Sellauth ids to the order ──────────────────────────
    await service
      .from('orders')
      .update({
        sellauth_order_id:    checkout.invoiceId,
        sellauth_invoice_id:  checkout.invoiceId,
        sellauth_product_ref: `${checkout.productId}:${checkout.variantId}`,
      })
      .eq('id', order.id);

    return NextResponse.json({ checkoutUrl: checkout.url, orderId: order.id, ref: checkoutRef });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[checkout] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
