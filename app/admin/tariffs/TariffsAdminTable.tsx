'use client';

import { useState, useMemo } from 'react';
import { formatEur } from '@/lib/utils';

interface Tariff {
  id:                 string;
  name:               string;
  country_name:       string;
  flag_emoji:         string | null;
  data_gb:            number | null;
  validity_days:      number;
  sale_price_eur:     number;
  ek_price_usd:       number;
  is_active:          boolean;
  is_top_up_eligible?: boolean;
  tariff_type?:       string | null;
  last_synced_at:     string;
  package_code:       string;
}

export function TariffsAdminTable({ tariffs: initial }: { tariffs: Tariff[] }) {
  const [tariffs,   setTariffs]   = useState(initial);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<'all' | 'active' | 'inactive'>('all');
  const [toggling,  setToggling]  = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tariffs.filter((t) => {
      const matchSearch = search === '' ||
        t.country_name.toLowerCase().includes(search.toLowerCase()) ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.package_code.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === 'all' ? true :
        filter === 'active' ? t.is_active :
        !t.is_active;
      return matchSearch && matchFilter;
    });
  }, [tariffs, search, filter]);

  async function toggleActive(id: string, current: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/admin/tariffs/${id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ is_active: !current }),
      });
      if (res.ok) {
        setTariffs((prev) =>
          prev.map((t) => t.id === id ? { ...t, is_active: !current } : t)
        );
      }
    } finally {
      setToggling(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="Land, Name oder Package Code suchen…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <div className="flex gap-2">
          {(['all', 'active', 'inactive'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                filter === f
                  ? 'bg-brand-600 text-white'
                  : 'border border-slate-300 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {f === 'all' ? 'Alle' : f === 'active' ? '✅ Aktiv' : '⛔ Inaktiv'}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} Ergebnisse</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Land</th>
              <th className="px-4 py-3 text-left">Paket</th>
              <th className="px-4 py-3 text-center">Daten</th>
              <th className="px-4 py-3 text-center">Tage</th>
              <th className="px-4 py-3 text-right">EK (USD)</th>
              <th className="px-4 py-3 text-right">VK (EUR)</th>
              <th className="px-4 py-3 text-center">Aktiv</th>
              <th className="px-4 py-3 text-center">Aufladbar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((t) => (
              <tr key={t.id} className={`hover:bg-slate-50 ${!t.is_active ? 'opacity-50' : ''}`}>
                <td className="px-4 py-3 font-medium">
                  {t.flag_emoji ?? '🌐'} {t.country_name}
                </td>
                <td className="px-4 py-3 text-slate-500 max-w-[180px] truncate" title={t.name}>
                  {t.name}
                </td>
                <td className="px-4 py-3 text-center text-slate-700">
                  {t.data_gb != null ? `${t.data_gb} GB` : '–'}
                </td>
                <td className="px-4 py-3 text-center text-slate-700">{t.validity_days}d</td>
                <td className="px-4 py-3 text-right text-slate-500">${t.ek_price_usd}</td>
                <td className="px-4 py-3 text-right font-semibold">{formatEur(t.sale_price_eur)}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggleActive(t.id, t.is_active)}
                    disabled={toggling === t.id}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${
                      t.is_active ? 'bg-brand-600' : 'bg-slate-300'
                    }`}
                    title={t.is_active ? 'Deaktivieren' : 'Aktivieren'}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                        t.is_active ? 'translate-x-4' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  {(t.tariff_type ?? 'travel') === 'travel' ? (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                      ✓ Ja
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      –
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Keine Tarife gefunden.</p>
        )}
      </div>
    </div>
  );
}
