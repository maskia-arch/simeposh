/**
 * POST /api/crypto/checkout
 *
 * Creates pending orders (server-priced) and a fixed-amount crypto session.
 * Body: { email, coin, items: { tariffId, quantity, days? }[] }
 * Returns: { sessionId, ref }
 */
import { NextResponse } from 'next/server';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { customUnlimitedPriceEur, clampDays } from '@/lib/quote';
import { resolveCustomer }     from '@/lib/customers';
import { createCryptoSession } from '@/lib/crypto/session';

export const runtime = 'nodejs';

interface ReqItem { tariffId: string; quantity: number; days?: number; topUpIccid?: string }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; coin?: string; items?: ReqItem[] };
    const email = body.email?.trim();
    const coin  = body.coin?.trim().toUpperCase();
    const items = Array.isArray(body.items) ? body.items : [];

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid e-mail required' }, { status: 400 });
    }
    if (!coin)        return NextResponse.json({ error: 'Coin required' }, { status: 400 });
    if (items.length === 0) return NextResponse.json({ error: 'Cart is empty' }, { status: 400 });

    // Normalise lines
    const merged = new Map<string, { tariffId: string; days: number | null; quantity: number; topUpIccid: string | null }>();
    for (const it of items) {
      if (!it?.tariffId) continue;
      const days   = typeof it.days === 'number' ? clampDays(it.days) : null;
      const iccid  = it.topUpIccid?.trim() || null;
      const key    = `${it.tariffId}__${days ?? ''}__${iccid ?? ''}`;
      const q      = Math.min(99, Math.max(1, Math.floor(Number(it.quantity) || 1)));
      const prev   = merged.get(key);
      if (prev) prev.quantity += q; else merged.set(key, { tariffId: it.tariffId, days, quantity: q, topUpIccid: iccid });
    }
    const lines = Array.from(merged.values());
    if (lines.length === 0) return NextResponse.json({ error: 'No valid items' }, { status: 400 });

    const service = createServiceClient();
    const ids = Array.from(new Set(lines.map((l) => l.tariffId)));
    const { data: tariffs } = await service
      .from('tariffs')
      .select('id, sale_price_eur, usd_eur_rate, validity_days, tariff_type, is_active')
      .in('id', ids);
    const tMap = new Map((tariffs ?? []).filter((t) => t.is_active).map((t) => [t.id, t]));

    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    const userId = await resolveCustomer(service, user, email);
    const ref = crypto.randomUUID();

    // Build order rows (one per unit) + total base EUR.
    const orderRows: Array<Record<string, unknown>> = [];
    let baseEur = 0;
    for (const line of lines) {
      const t = tMap.get(line.tariffId);
      if (!t) continue;
      const isTopUp = !!line.topUpIccid;
      const isUnlimited = !isTopUp && (t.tariff_type?.startsWith('unlimited') ?? false);
      let unit = t.sale_price_eur;
      let periodNum: number | null = null;
      if (isUnlimited && line.days) {
        periodNum = line.days;
        unit = customUnlimitedPriceEur(t.sale_price_eur, t.validity_days, line.days);
      }
      for (let n = 0; n < line.quantity; n++) {
        baseEur += unit;
        orderRows.push({
          user_id: userId, tariff_id: t.id,
          order_type: isTopUp ? 'top_up' : 'new_esim', status: 'pending',
          customer_email: email, customer_name: user?.user_metadata?.full_name ?? null,
          amount_eur: unit, usd_eur_rate: t.usd_eur_rate, period_num: periodNum,
          top_up_iccid: line.topUpIccid, checkout_ref: ref,
        });
      }
    }
    if (orderRows.length === 0) return NextResponse.json({ error: 'No active tariffs' }, { status: 400 });

    const { data: inserted, error: oErr } = await service
      .from('orders')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .insert(orderRows as any).select('id');
    if (oErr || !inserted) {
      console.error('[crypto/checkout] order insert', oErr?.message);
      return NextResponse.json({ error: 'Could not create orders' }, { status: 500 });
    }
    const orderIds = inserted.map((o) => o.id);

    const session = await createCryptoSession({
      orderIds, email, baseEur: Math.round(baseEur * 100) / 100, coinCode: coin,
    });

    return NextResponse.json({ sessionId: session.id, ref });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[crypto/checkout] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
