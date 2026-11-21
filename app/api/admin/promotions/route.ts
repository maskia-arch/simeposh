import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { rows: promotions } = await query(`
      SELECT * FROM public.promotions
      ORDER BY priority DESC, starts_at ASC
    `);

    let auditLogs: any[] = [];
    try {
      const { rows } = await query(`
        SELECT * FROM public.promotion_audit_logs
        ORDER BY created_at DESC
        LIMIT 50
      `);
      auditLogs = rows;
    } catch {}

    return NextResponse.json({ promotions, auditLogs });
  } catch (err: any) {
    console.error('[Admin Promotions API GET Error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      id,
      internal_name,
      titles = {},
      texts = {},
      badge_texts = {},
      discount_percent = 0,
      rounding_strategy = 'x9_down',
      show_reference_price = false,
      scope = 'new_esim',
      applies_to_topup = false,
      applies_to_cash = false,
      allow_voucher_stacking = false,
      starts_at,
      ends_at,
      priority = 10,
      status = 'draft',
      theme_id = 'standard',
      theme_config = null,
    } = body;

    if (!internal_name || typeof internal_name !== 'string' || !internal_name.trim()) {
      return NextResponse.json({ error: 'Der interne Aktionsname darf nicht leer sein.' }, { status: 400 });
    }

    const numDiscount = Number(discount_percent);
    if (isNaN(numDiscount) || numDiscount < 0 || numDiscount > 90) {
      return NextResponse.json({ error: 'Rabatt muss zwischen 0 % und 90 % liegen.' }, { status: 400 });
    }

    const startDate = starts_at ? new Date(starts_at) : new Date();
    const endDate = ends_at ? new Date(ends_at) : new Date(Date.now() + 86400000 * 7);

    const discountBasisPoints = Math.round(numDiscount * 100);
    const promoId = id || randomUUID();
    const safeSlug = internal_name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || `promo-${Date.now()}`;

    // Upsert promotion into public.promotions
    await query(`
      INSERT INTO public.promotions (
        id, slug, internal_name, titles, texts, badge_texts,
        discount_basis_points, rounding_strategy, show_reference_price,
        scope, applies_to_topup, applies_to_cash, allow_voucher_stacking,
        starts_at, ends_at, priority, status, theme_id, theme_config
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      ON CONFLICT (id) DO UPDATE SET
        internal_name = EXCLUDED.internal_name,
        titles = EXCLUDED.titles,
        texts = EXCLUDED.texts,
        badge_texts = EXCLUDED.badge_texts,
        discount_basis_points = EXCLUDED.discount_basis_points,
        rounding_strategy = EXCLUDED.rounding_strategy,
        show_reference_price = EXCLUDED.show_reference_price,
        starts_at = EXCLUDED.starts_at,
        ends_at = EXCLUDED.ends_at,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        theme_id = EXCLUDED.theme_id,
        theme_config = EXCLUDED.theme_config,
        updated_at = NOW()
    `, [
      promoId,
      safeSlug,
      internal_name.trim(),
      JSON.stringify(titles),
      JSON.stringify(texts),
      JSON.stringify(badge_texts),
      discountBasisPoints,
      rounding_strategy,
      Boolean(show_reference_price),
      scope,
      Boolean(applies_to_topup),
      Boolean(applies_to_cash),
      Boolean(allow_voucher_stacking),
      startDate.toISOString(),
      endDate.toISOString(),
      Number(priority) || 10,
      status,
      theme_id,
      theme_config ? JSON.stringify(theme_config) : null,
    ]);

    // Record audit log
    try {
      await query(`
        INSERT INTO public.promotion_audit_logs (
          promotion_id, action, changed_by, new_state
        ) VALUES ($1, $2, $3, $4)
      `, [
        promoId,
        id ? 'update' : 'create',
        'Theme Studio / Admin',
        JSON.stringify({ internal_name, discount_percent: numDiscount, theme_id, status }),
      ]);
    } catch {}

    return NextResponse.json({
      ok: true,
      message: 'Aktion / Theme-Vorlage erfolgreich gespeichert und im Admin verfügbar.',
      promotionId: promoId,
    });
  } catch (err: any) {
    console.error('[Admin Promotions API POST Error]', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
