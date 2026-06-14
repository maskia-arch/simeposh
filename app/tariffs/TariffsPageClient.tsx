'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Database } from '@/lib/supabase/types';
import { TariffsGrid }          from '@/components/TariffsGrid';
import { UnlimitedConfigurator } from '@/components/UnlimitedConfigurator';
import { useTranslation }        from '@/lib/i18n';
import { aliasToCode, aliasToRegion, aliasesToCodes, aliasesToRegions, COUNTRY_ALIASES, REGION_ALIASES } from '@/lib/i18n/countryAliases';

type Tariff = Database['public']['Tables']['tariffs']['Row'];
type Tab = 'travel' | 'unlimited';

/**
 * Score a single tariff against a search query (higher = better match).
 * Returns 0 when the tariff does not match at all.
 *
 * Ranking philosophy (example: user searches "Deutschland"):
 *   100  pure single-country tariff for Germany   (country_code === "DE")
 *    90  exact region search hitting its own region tariff ("Europa" → EU tariff)
 *    70  country name substring match
 *    50  REGION / multi-country tariff that COVERS Germany (location_codes ⊇ DE)
 *    40  region name substring (e.g. searching "euro" matches "Europe")
 *    30  package title substring
 *    10  package code substring
 *
 * → Germany tariffs always rank above "EU eSIM" tariffs that merely include DE.
 */
function scoreTariff(
  t: Tariff,
  qLow: string,
  matchedCountryCodes: Set<string>,
  matchedRegionCodes: Set<string>,
): number {
  const code   = (t.country_code ?? '').toUpperCase();
  const name   = (t.country_name ?? '').toLowerCase();
  const region = (t.region       ?? '').toLowerCase();
  const title  = (t.name         ?? '').toLowerCase();
  const pkg    = (t.package_code ?? '').toLowerCase();
  const locs   = (t.location_codes ?? []).map((c) => c.toUpperCase());

  // ── Strongest: exact country match / alias match ──────────────
  if (matchedCountryCodes.has(code)) {
    const exactMatch = Object.entries(COUNTRY_ALIASES).some(([alias, c]) => alias === qLow && c.toUpperCase() === code);
    return exactMatch ? 100 : 85;
  }
  if (code === qLow.toUpperCase()) return 100;

  // Region match
  if (matchedRegionCodes.has(code)) {
    const exactMatch = Object.entries(REGION_ALIASES).some(([alias, c]) => alias === qLow && c.toUpperCase() === code);
    return exactMatch ? 90 : 80;
  }

  // Country name exact / prefix / substring
  if (name === qLow)       return 95;
  if (name.startsWith(qLow)) return 80;
  if (name.includes(qLow))   return 70;

  // Region / multi-country tariff that COVERS the searched country
  for (const c of Array.from(matchedCountryCodes)) {
    if (locs.includes(c)) return 50;
  }

  // Region name substring
  if (region.includes(qLow))   return 40;
  // Title / package-code substrings
  if (title.includes(qLow))    return 30;
  if (pkg.includes(qLow))      return 10;

  return 0;
}

/**
 * Multi-lingual, coverage-aware, ranked tariff search.
 * Returns tariffs sorted by relevance (best matches first), then price.
 */
function filterTariffs(tariffs: Tariff[], rawQuery: string): Tariff[] {
  const q = rawQuery.trim();
  if (!q) return tariffs;

  const qLow = q.toLowerCase();

  // Find all matched country/region codes from aliases
  const matchedCountryCodes = new Set(aliasesToCodes(qLow).map((c) => c.toUpperCase()));
  const matchedRegionCodes = new Set(aliasesToRegions(qLow).map((c) => c.toUpperCase()));

  // Data-driven fallback: if no alias matched (e.g. English "germany"),
  // derive the ISO code from a single-country tariff whose stored name
  // matches or starts with the query.
  if (matchedCountryCodes.size === 0) {
    for (const t of tariffs) {
      const codes = t.location_codes ?? [];
      const single = codes.length <= 1 && /^[A-Za-z]{2}$/.test(t.country_code ?? '');
      if (single && (t.country_name ?? '').toLowerCase().startsWith(qLow)) {
        matchedCountryCodes.add((t.country_code ?? '').toUpperCase());
      }
    }
  }

  const scored: Array<{ t: Tariff; score: number }> = [];
  for (const t of tariffs) {
    const score = scoreTariff(t, qLow, matchedCountryCodes, matchedRegionCodes);
    if (score > 0) scored.push({ t, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;            // relevance
    return (a.t.sale_price_eur ?? 0) - (b.t.sale_price_eur ?? 0); // then cheapest
  });

  return scored.map((s) => s.t);
}

export function TariffsPageClient({ tariffs, initialQuery = '' }: { tariffs: Tariff[]; initialQuery?: string }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('travel');
  const [q,   setQ]   = useState(initialQuery);
  
  // Sync state `q` with changes to `initialQuery` prop from the URL
  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  const travelTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'travel' || !t.tariff_type?.startsWith('unlimited')),
    [tariffs],
  );

  const unlimitedTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'unlimited_eco' || t.tariff_type === 'unlimited_pro'),
    [tariffs],
  );

  const filteredTravel = useMemo(
    () => filterTariffs(travelTariffs, q),
    [travelTariffs, q],
  );

  // Count helpers
  const travelCount    = travelTariffs.length;
  const unlimitedCount = unlimitedTariffs.length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('tariffs_title')}</h1>
        <p className="mt-2 text-slate-500">{t('tariffs_sub')}</p>
      </div>

      {/* ── Main tab switcher ── */}
      <div className="mb-8 flex gap-3 flex-wrap">
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
            {travelCount.toLocaleString()}
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
            {unlimitedCount.toLocaleString()}
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
              <p className="font-semibold text-sky-800">{t('tp_travel_title')}</p>
              <p className="text-sm text-sky-700 mt-0.5">{t('tp_travel_desc')}</p>
            </div>
          </div>

          {/* Search */}
          <div className="mb-6 relative">
            <div className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center">
              <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t('tariffs_search')}
              className="w-full rounded-xl border border-slate-300 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            )}
          </div>

          {/* Result hint */}
          {q && (
            <p className="mb-4 text-sm text-slate-500">
              {filteredTravel.length === 0
                ? t('tp_no_results', { q })
                : t(filteredTravel.length === 1 ? 'tp_results_one' : 'tp_results', { count: filteredTravel.length, q })}
            </p>
          )}

          {filteredTravel.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-5xl mb-4">🔍</p>
              <p className="text-lg font-semibold text-slate-600">{t('tariffs_empty')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('tariffs_empty_sub')}</p>
              {q && (
                <button
                  onClick={() => setQ('')}
                  className="mt-4 rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  {t('tp_reset')}
                </button>
              )}
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
                  <p className="font-semibold text-slate-800">{t('tp_eco_title')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('tp_eco_desc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚡</span>
                <div>
                  <p className="font-semibold text-slate-800">{t('tp_pro_title')}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('tp_pro_desc')}</p>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_3')}</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_7')}</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_14')}</span>
              <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_30')}</span>
            </div>
          </div>

          {unlimitedTariffs.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-5xl mb-4">♾️</p>
              <p className="text-lg font-semibold text-slate-600">{t('tp_unlimited_empty')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('tp_unlimited_empty_sub')}</p>
            </div>
          ) : (
            <UnlimitedConfigurator tariffs={unlimitedTariffs} initialQuery={q} />
          )}
        </>
      )}
    </div>
  );
}
