/**
 * POST /api/admin/sync/review-prices
 * Approve or reject pending price change proposals.
 *
 * Body: { decisions: Array<{ id: string; action: 'approve'|'reject'; label?: string }> }
 */
import { NextResponse }      from 'next/server';
import { verifyAdminApi }    from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const { decisions } = await request.json() as {
    decisions: Array<{ id: string; action: 'approve' | 'reject'; label?: string }>;
  };

  if (!Array.isArray(decisions) || decisions.length === 0) {
    return NextResponse.json({ error: 'decisions array required' }, { status: 400 });
  }

  const db = createServiceClient();
  const now = new Date().toISOString();
  let approved = 0, rejected = 0;

  for (const d of decisions) {
    // Update the proposal status
    await db.from('tariff_price_proposals').update({
      status:      d.action === 'approve' ? 'approved' : 'rejected',
      reviewed_at: now,
      label:       d.label ?? null,
    }).eq('id', d.id);

    if (d.action === 'approve') {
      // Fetch the proposal to get new price + tariff_id
      const { data: proposal } = await db
        .from('tariff_price_proposals').select('*').eq('id', d.id).single();

      if (proposal) {
        // Apply the new price to the tariff
        await db.from('tariffs').update({
          sale_price_eur: proposal.new_price_eur,
          label:          d.label ?? null,
        }).eq('id', proposal.tariff_id);
        approved++;
      }
    } else {
      rejected++;
    }
  }

  return NextResponse.json({ ok: true, approved, rejected });
}

// GET: return pending proposals (grouped by sync run)
export async function GET() {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const db = createServiceClient();

  const { data: proposals } = await db
    .from('tariff_price_proposals')
    .select(`
      id, sync_id, package_code, old_price_eur, new_price_eur,
      change_pct, status, label, created_at,
      tariffs(name, country_name, flag_emoji, tariff_type)
    `)
    .eq('status', 'pending')
    .order('change_pct', { ascending: false })
    .limit(500);

  return NextResponse.json({ proposals: proposals ?? [] });
}
