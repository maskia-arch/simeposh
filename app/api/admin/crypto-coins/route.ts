/**
 * GET  /api/admin/crypto-coins  → list coin configs (+ wallet-present flag)
 * PATCH /api/admin/crypto-coins → update { code, enabled?, surcharge_pct?, surcharge_fixed_eur?, confirmations? }
 */
import { NextResponse } from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { walletForCoin } from '@/lib/crypto/coins';

export const runtime = 'nodejs';

export async function GET() {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const db = createServiceClient();
  const { data } = await db.from('crypto_coins').select('*').order('sort_order', { ascending: true });
  const coins = (data ?? []).map((c) => ({ ...c, walletConfigured: !!walletForCoin(c.code) }));
  return NextResponse.json({ coins });
}

export async function PATCH(request: Request) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const body = await request.json() as {
    code?: string; enabled?: boolean;
    surcharge_pct?: number; surcharge_fixed_eur?: number; confirmations?: number;
  };
  if (!body.code) return NextResponse.json({ error: 'code required' }, { status: 400 });

  const update: Record<string, unknown> = {};
  if (typeof body.enabled === 'boolean')           update.enabled = body.enabled;
  if (typeof body.surcharge_pct === 'number')      update.surcharge_pct = Math.max(0, body.surcharge_pct);
  if (typeof body.surcharge_fixed_eur === 'number')update.surcharge_fixed_eur = Math.max(0, body.surcharge_fixed_eur);
  if (typeof body.confirmations === 'number')      update.confirmations = Math.max(0, Math.floor(body.confirmations));

  const db = createServiceClient();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await db.from('crypto_coins').update(update as any).eq('code', body.code.toUpperCase());
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
