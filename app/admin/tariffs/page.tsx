import type { Metadata } from 'next';
import { requireAdmin } from '@/lib/admin/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur } from '@/lib/utils';
import { TariffsAdminTable } from './TariffsAdminTable';

export const metadata: Metadata = { title: 'Tarife' };
export const dynamic = 'force-dynamic';

export default async function AdminTariffsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; type?: string; active?: string }>;
}) {
  await requireAdmin();
  const db = createServiceClient();
  const params = await searchParams;

  const page    = Math.max(1, parseInt(params.page ?? '1', 10));
  const q       = params.q?.trim() ?? '';
  const typeFilter  = params.type ?? '';
  const activeFilter = params.active ?? '';
  const PAGE_SIZE = 200;
  const offset    = (page - 1) * PAGE_SIZE;

  // ── Total counts (exact, server-side) ──────────────────────
  const [
    { count: totalCount },
    { count: activeCount },
    { count: inactiveCount },
  ] = await Promise.all([
    db.from('tariffs').select('*', { count: 'exact', head: true }),
    db.from('tariffs').select('*', { count: 'exact', head: true }).eq('is_active', true),
    db.from('tariffs').select('*', { count: 'exact', head: true }).eq('is_active', false),
  ]);

  // ── Paginated data with optional filters ────────────────────
  let query = db
    .from('tariffs')
    .select('id, name, country_name, country_code, flag_emoji, data_gb, validity_days, sale_price_eur, ek_price_usd, is_active, is_top_up_eligible, tariff_type, last_synced_at, package_code, region')
    .order('country_name', { ascending: true })
    .order('sale_price_eur', { ascending: true })
    .range(offset, offset + PAGE_SIZE - 1);

  if (q) {
    query = query.or(
      `country_name.ilike.%${q}%,name.ilike.%${q}%,package_code.ilike.%${q}%,country_code.ilike.%${q}%`
    );
  }
  if (typeFilter) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('tariff_type', typeFilter);
  }
  if (activeFilter === 'active') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('is_active', true);
  } else if (activeFilter === 'inactive') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query = (query as any).eq('is_active', false);
  }

  const { data: tariffs } = await query;

  const totalPages = Math.ceil((totalCount ?? 0) / PAGE_SIZE);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tarife</h1>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-brand-700">{(activeCount ?? 0).toLocaleString('de-DE')}</span> aktiv ·{' '}
            <span className="text-slate-400">{(inactiveCount ?? 0).toLocaleString('de-DE')}</span> inaktiv ·{' '}
            <span className="text-slate-600">{(totalCount ?? 0).toLocaleString('de-DE')}</span> gesamt
          </p>
        </div>
        <a
          href="/admin/sync"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          🔄 Neu synchronisieren
        </a>
      </div>

      {/* Filters */}
      <form method="GET" className="mb-5 flex flex-wrap gap-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Suche: Land, Name, Package-Code…"
          className="rounded-xl border border-slate-300 px-4 py-2 text-sm w-64 outline-none focus:border-brand-500"
        />
        <select
          name="type"
          defaultValue={typeFilter}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Alle Typen</option>
          <option value="travel">✈️ Travel</option>
          <option value="unlimited_eco">♾️ Unlimited Eco</option>
          <option value="unlimited_pro">⚡ Unlimited Pro</option>
        </select>
        <select
          name="active"
          defaultValue={activeFilter}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="">Alle Status</option>
          <option value="active">✅ Aktiv</option>
          <option value="inactive">❌ Inaktiv</option>
        </select>
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          Filtern
        </button>
        {(q || typeFilter || activeFilter) && (
          <a
            href="/admin/tariffs"
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
          >
            ✕ Zurücksetzen
          </a>
        )}
      </form>

      {!tariffs || tariffs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 p-16 text-center text-slate-400">
          <p className="text-5xl mb-4">📦</p>
          <p className="font-semibold text-lg">
            {q || typeFilter ? 'Keine Treffer für diesen Filter.' : 'Noch keine Tarife'}
          </p>
          {!q && !typeFilter && (
            <>
              <p className="text-sm mt-2">Führe zuerst einen Produkt-Sync durch.</p>
              <a
                href="/admin/sync"
                className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
              >
                🔄 Jetzt synchronisieren
              </a>
            </>
          )}
        </div>
      ) : (
        <>
          <TariffsAdminTable tariffs={tariffs} />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
              <span>
                Seite {page} von {totalPages} · {(tariffs.length).toLocaleString('de-DE')} von {(totalCount ?? 0).toLocaleString('de-DE')} Tarife
              </span>
              <div className="flex gap-2">
                {page > 1 && (
                  <a
                    href={`/admin/tariffs?page=${page - 1}&q=${q}&type=${typeFilter}&active=${activeFilter}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    ← Zurück
                  </a>
                )}
                {page < totalPages && (
                  <a
                    href={`/admin/tariffs?page=${page + 1}&q=${q}&type=${typeFilter}&active=${activeFilter}`}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 hover:bg-slate-50 transition-colors"
                  >
                    Weiter →
                  </a>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
