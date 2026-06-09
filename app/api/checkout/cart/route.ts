/**
 * POST /api/checkout/cart
 *
 * Creates a single Sellauth checkout for MULTIPLE eSIMs (a cart), supporting
 * both fixed tariffs and custom day-pass configs (per item `days`).
 *
 * Security:
 *  - Every price is recomputed server-side from the database.
 *  - One pending order per eSIM unit so each gets its own ICCID/QR + email.
 *  - One on-demand, unlisted Sellauth product per distinct line (at the exact
 *    unit price), all combined into one checkout/invoice.
 *
 * Body: { email, items: { tariffId, quantity, days? }[] }
 * Returns: { checkoutUrl, invoiceId, orderIds }
 */
import { NextResponse } from 'next/server';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { createPricedProduct, createCheckoutSession } from '@/lib/sellauth/client';
import { customUnlimitedPriceEur, clampDays } from '@/lib/quote';
import { resolveCustomer }       from '@/lib/customers';
import type { SellauthCartLine } from '@/lib/sellauth/types';

export const runtime = 'nodejs';

interface CartReqItem { tariffId: string; quantity: number; days?: number }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; items?: CartReqItem[] };
    const email = body.email?.trim();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 });
    }
    if (items.length === 0) {
      return NextResponse.json({ error: 'Warenkorb ist leer' }, { status: 400 });
    }

    // Normalise: merge by (tariffId + days), clamp quantities
    const merged = new Map<string, { tariffId: string; days: number | null; quantity: number }>();
    for (const it of items) {
      if (!it?.tariffId) continue;
      const days = typeof it.days === 'number' ? clampDays(it.days) : null;
      const key  = `${it.tariffId}__${days ?? ''}`;
      const q    = Math.min(99, Math.max(1, Math.floor(Number(it.quantity) || 1)));
      const prev = merged.get(key);
      if (prev) prev.quantity += q;
      else merged.set(key, { tariffId: it.tariffId, days, quantity: q });
    }
    const lines = Array.from(merged.values());
    if (lines.length === 0) {
      return NextResponse.json({ error: 'Keine gültigen Artikel' }, { status: 400 });
    }

    const service = createServiceClient();

    // ── Fetch authoritative tariffs ─────────────────────────────
    const ids = Array.from(new Set(lines.map((l) => l.tariffId)));
    const { data: tariffs, error: tErr } = await service
      .from('tariffs')
      .select('id, package_code, country_name, name, data_gb, validity_days, sale_price_eur, usd_eur_rate, tariff_type, is_active')
      .in('id', ids);

    if (tErr) {
      console.error('[checkout/cart] tariff fetch error:', tErr.message);
      return NextResponse.json({ error: 'Tarife konnten nicht geladen werden' }, { status: 500 });
    }
    const tariffMap = new Map((tariffs ?? []).filter((t) => t.is_active).map((t) => [t.id, t]));

    // ── Resolve customer (logged-in or guest profile by email) ──
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const userId = await resolveCustomer(service, user, email);

    const checkoutRef = crypto.randomUUID();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const redirectUrl = `${appUrl}/order?ref=${checkoutRef}`;

    // ── Build Sellauth products + order rows ────────────────────
    const cart: SellauthCartLine[] = [];
    const orderRows: Array<Record<string, unknown>> = [];

    for (const line of lines) {
      const t = tariffMap.get(line.tariffId);
      if (!t) continue;

      const isUnlimited = t.tariff_type?.startsWith('unlimited') ?? false;
      let unitPrice = t.sale_price_eur;
      let periodNum: number | null = null;
      if (isUnlimited && line.days) {
        periodNum = line.days;
        unitPrice = customUnlimitedPriceEur(t.sale_price_eur, t.validity_days, line.days);
      }

      const label = periodNum
        ? `${t.country_name} · ${t.data_gb ?? '∞'}GB/Tag · ${periodNum} Tage`
        : `${t.country_name} · ${t.name}`;

      // One on-demand "eSIM" product per distinct line, priced at the unit price.
      const { productId, variantId } = await createPricedProduct({
        variantName: label,
        priceEur:    unitPrice,
        redirectUrl,
      });
      cart.push({ productId, variantId, quantity: line.quantity });

      const productRef = `${productId}:${variantId}`;
      for (let n = 0; n < line.quantity; n++) {
        orderRows.push({
          user_id:              userId,
          tariff_id:            t.id,
          order_type:           'new_esim',
          status:               'pending',
          customer_email:       email,
          customer_name:        user?.user_metadata?.full_name ?? null,
          amount_eur:           unitPrice,
          usd_eur_rate:         t.usd_eur_rate,
          period_num:           periodNum,
          sellauth_product_ref: productRef,
          checkout_ref:         checkoutRef,
        });
      }
    }

    if (cart.length === 0 || orderRows.length === 0) {
      return NextResponse.json({ error: 'Keine aktiven Tarife im Warenkorb' }, { status: 400 });
    }

    // ── Create orders ───────────────────────────────────────────
    const { data: insertedOrders, error: oErr } = await service
      .from('orders')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(orderRows as any)
      .select('id');

    if (oErr || !insertedOrders || insertedOrders.length === 0) {
      console.error('[checkout/cart] order insert error:', oErr?.message);
      return NextResponse.json({ error: 'Bestellungen konnten nicht angelegt werden' }, { status: 500 });
    }
    const orderIds = insertedOrders.map((o) => o.id);

    // ── One checkout for the whole cart ─────────────────────────
    const checkout = await createCheckoutSession({ cart, email });

    // ── Link all orders to the invoice ──────────────────────────
    await service
      .from('orders')
      .update({ sellauth_order_id: checkout.invoiceId, sellauth_invoice_id: checkout.invoiceId })
      .in('id', orderIds);

    return NextResponse.json({ checkoutUrl: checkout.url, invoiceId: checkout.invoiceId, orderIds, ref: checkoutRef });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[checkout/cart] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
