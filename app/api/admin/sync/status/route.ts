/**
 * GET /api/admin/sync/status?syncId=…
 *
 * Polls the sync_logs table for progress of a running or completed sync.
 * Returns structured progress data for the frontend progress bar.
 */
import { NextResponse }   from 'next/server';
import { verifyAdminApi } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const auth = await verifyAdminApi();
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(request.url);
  const syncId = searchParams.get('syncId');

  if (!syncId) {
    return NextResponse.json({ error: 'syncId required' }, { status: 400 });
  }

  const db = createServiceClient();
  const { data: log, error } = await db
    .from('sync_logs')
    .select('*')
    .eq('sync_id', syncId)
    .single();

  if (error || !log) {
    return NextResponse.json({ error: 'Sync not found' }, { status: 404 });
  }

  // Parse encoded progress fields from error_message
  // Format: "fetched:12345|upserted:6789|eta_ms:120000"
  const meta: Record<string, number> = {};
  if (log.error_message && log.status === 'running') {
    for (const part of log.error_message.split('|')) {
      const [k, v] = part.split(':');
      if (k && v) meta[k] = parseInt(v, 10);
    }
  }

  const now        = Date.now();
  const startedAt  = new Date(log.created_at).getTime();
  const elapsedMs  = now - startedAt;
  const etaMs      = meta.eta_ms ?? 120_000;
  const total      = log.total_packages ?? meta.fetched ?? 0;
  const upserted   = log.upserted ?? meta.upserted ?? 0;

  // Estimate progress percentage
  let pct = 0;
  if (log.status === 'completed' || log.status === 'failed') {
    pct = 100;
  } else if (total > 0 && upserted > 0) {
    // Weight: 20% for fetching, 80% for upserting
    pct = Math.min(95, 20 + Math.round((upserted / total) * 80));
  } else if (total > 0 && upserted === 0) {
    // Fetching complete, upsert starting
    pct = Math.min(25, Math.round((elapsedMs / etaMs) * 25));
  } else {
    // Still fetching – estimate from time
    pct = Math.min(18, Math.round((elapsedMs / etaMs) * 18));
  }

  const remainingMs = pct < 100 ? Math.max(0, etaMs - elapsedMs) : 0;

  return NextResponse.json({
    syncId,
    status:        log.status,
    pct,
    elapsed_ms:    elapsedMs,
    remaining_ms:  remainingMs,
    total:         total,
    upserted:      upserted,
    errors:        log.errors ?? 0,
    price_changes: log.price_changes ?? 0,
    usd_eur_rate:  log.usd_eur_rate ?? null,
    duration_ms:   log.duration_ms ?? null,
    error_message: log.status === 'failed' ? log.error_message : null,
    completed_at:  log.completed_at,
  });
}
