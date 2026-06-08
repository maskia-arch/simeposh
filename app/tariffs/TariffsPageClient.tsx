'use client';

import { useState, useMemo } from 'react';
import type { Database } from '@/lib/supabase/types';
import { TariffsGrid } from '@/components/TariffsGrid';
import { UnlimitedConfigurator } from '@/components/UnlimitedConfigurator';
import { useTranslation } from '@/lib/i18n';
import { aliasToCode } from '@/lib/i18n/countryAliases';

type Tariff = Database['public']['Tables']['tariffs']['Row'];
type Tab = 'travel' | 'unlimited';

export function TariffsPageClient({ tariffs }: { tariffs: Tariff[] }) {
  const { t } = useTranslation();
  const [tab, setTab]   = useState<Tab>('travel');
  const [q,   setQ]     = useState('');

  const travelTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'travel' || !t.tariff_type?.startsWith('unlimited')),
    [tariffs],
  );

  const unlimitedTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'unlimited_eco' || t.tariff_type === 'unlimited_pro'),
    [tariffs],
  );

  const filteredTravel = useMemo(() => {
    if (!q.trim()) return travelTariffs;
    const qLow = q.trim().toLowerCase();
    // Resolve local-language alias → ISO code (e.g. "Deutschland" → "DE")
    const resolvedCode = aliasToCode(qLow);
    return travelTariffs.filter(
      (t) =>
        t.country_name.toLowerCase().includes(qLow) ||
        t.name.toLowerCase().includes(qLow) ||
        t.country_code.toLowerCase() === qLow ||
        (resolvedCode ? t.country_code === resolvedCode : false) ||
        (t.region?.toLowerCase().includes(qLow) ?? false),
    );
  }, [travelTariffs, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('tariffs_title')}</h1>
        <p className="mt-2 text-slate-500">{t('tariffs_sub')}</p>
      </div>

      {/* ── Main tab switcher ── */}
      <div className="mb-8 flex gap-3">
        <button
          onClick={() => setTab('travel')}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition-all border ${
            tab === 'travel'
              ? 'bg-brand-600 text-white border-brand-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
          }`}
        >
          ✈️ Travel
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === 'travel' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {travelTariffs.length}
          </span>
        </button>

        <button
          onClick={() => setTab('unlimited')}
          className={`flex items-center gap-2 rounded-2xl px-6 py-3 font-semibold transition-all border ${
            tab === 'unlimited'
              ? 'bg-brand-600 text-white border-brand-600 shadow-md'
              : 'bg-white text-slate-600 border-slate-200 hover:border-brand-300'
          }`}
        >
          ♾️ Unlimited
          <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${tab === 'unlimited' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
            {unlimitedTariffs.length}
          </span>
        </button>
      </div>

      {/* ── TRAVEL TAB ── */}
      {tab === 'travel' && (
        <>
          {/* Info bar */}
          <div className="mb-6 rounded-2xl bg-sky-50 border border-sky-200 px-5 py-4 flex items-start gap-3">
            <span className="text-2xl">✈️</span>
            <div>
              <p className="font-semibold text-sky-800">Travel-Tarife mit festem Datenvolumen</p>
              <p className="text-sm text-sky-700 mt-0.5">
                Einmaliges Datenvolumen, das du flexibel über die gesamte Laufzeit verbrauchst. Ideal für Reisen mit bekanntem Datenverbrauch.
              </p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6">
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('tariffs_search')}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {filteredTravel.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg font-semibold text-slate-600">{t('tariffs_empty')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('tariffs_empty_sub')}</p>
            </div>
          ) : (
            <TariffsGrid tariffs={filteredTravel} />
          )}
        </>
      )}

      {/* ── UNLIMITED TAB ── */}
      {tab === 'unlimited' && (
        <>
          {/* Info bar */}
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50 to-violet-50 border border-slate-200 px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="text-2xl">♾️</span>
                <div>
                  <p className="font-semibold text-slate-800">Unlimited Eco</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tägliches Highspeed-Volumen, danach 512 kbps unbegrenzt weiter. Perfekt für normale Nutzung.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-semibold text-slate-800">Unlimited Pro</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tägliches Highspeed-Volumen, danach ≥ 1 Mbps unbegrenzt. Für Video-Calls, Streaming & mehr.
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">🎉 Ab 3 Tagen −4%</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">🎉 Ab 7 Tagen −8%</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">🎉 Ab 14 Tagen −11%</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">🎉 Ab 30 Tagen −18%</span>
            </div>
          </div>

          {unlimitedTariffs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-lg font-semibold text-slate-600">Keine Unlimited-Tarife gefunden.</p>
              <p className="mt-1 text-sm text-slate-400">Bitte später erneut versuchen oder einen Sync auslösen.</p>
            </div>
          ) : (
            <UnlimitedConfigurator tariffs={unlimitedTariffs} />
          )}
        </>
      )}
    </div>
  );
}
