'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Database } from '@/lib/supabase/types';
import { TariffsGrid }          from '@/components/TariffsGrid';
import { UnlimitedConfigurator } from '@/components/UnlimitedConfigurator';
import { useTranslation }        from '@/lib/i18n';
import { aliasToCode, aliasToRegion, aliasesToCodes, aliasesToRegions, COUNTRY_ALIASES, REGION_ALIASES } from '@/lib/i18n/countryAliases';
import { PlaneIcon, InfinityIcon, EcoIcon, BoltIcon, SearchIcon, TravelGlobeIcon, TravelPremiumGlobeIcon } from '@/components/Icons';
import { isPremiumTariff } from '@/lib/tariff-display';

type Tariff = Database['public']['Tables']['tariffs']['Row'];
export type ActiveCategory = 'travel' | 'travel_premium' | 'unlimited_eco' | 'unlimited_pro';
export type TravelTier = 'all' | 'standard' | 'premium';

/**
 * Multi-lingual, coverage-aware, ranked tariff search with tier awareness.
 * Returns tariffs sorted by relevance (best matches first), then price.
 */
function filterTariffs(tariffs: Tariff[], rawQuery: string): Tariff[] {
  const q = rawQuery.trim();
  if (!q) return tariffs;

  const qLow = q.toLowerCase();
  const words = qLow.split(/\s+/).filter(Boolean);
  const mentionsPremium = words.some((w) => 'premium'.startsWith(w) || w === 'premium');
  const mentionsStandard = words.some((w) => 'standard'.startsWith(w) || w === 'standard');

  // Find all matched country/region codes from aliases
  const matchedCountryCodes = new Set(aliasesToCodes(qLow).map((c) => c.toUpperCase()));
  const matchedRegionCodes = new Set(aliasesToRegions(qLow).map((c) => c.toUpperCase()));

  // Data-driven fallback: if no alias matched (e.g. English "germany"),
  // derive the ISO code from a single-country tariff whose stored name
  // matches or starts with the query.
  if (matchedCountryCodes.size === 0 && matchedRegionCodes.size === 0) {
    for (const t of tariffs) {
      const codes = t.location_codes ?? [];
      const single = codes.length <= 1 && /^[A-Za-z]{2}$/.test(t.country_code ?? '');
      if (single && (t.country_name ?? '').toLowerCase().startsWith(qLow)) {
        matchedCountryCodes.add((t.country_code ?? '').toUpperCase());
      }
    }
  }

  const hasMatchedCodes = matchedCountryCodes.size > 0 || matchedRegionCodes.size > 0;
  const scored: Array<{ t: Tariff; score: number }> = [];

  for (const t of tariffs) {
    const code   = (t.country_code ?? '').toUpperCase();
    const name   = (t.country_name ?? '').toLowerCase();
    const region = (t.region       ?? '').toLowerCase();
    const title  = (t.name         ?? '').toLowerCase();
    const pkg    = (t.package_code ?? '').toLowerCase();
    const isPrem = isPremiumTariff(t);

    if (hasMatchedCodes) {
      // Strict filter mode: only match exact country/region code
      if (matchedCountryCodes.has(code) || matchedRegionCodes.has(code)) {
        let s = 100;
        if (mentionsPremium) {
          s = isPrem ? 120 : 40;
        } else if (mentionsStandard) {
          s = !isPrem ? 120 : 40;
        }
        scored.push({ t, score: s });
      }
    } else {
      // Free-text fallback mode: match substrings
      let s = 0;
      if (mentionsPremium && isPrem) s += 80;
      if (name === qLow)            s += 95;
      else if (name.startsWith(qLow)) s = 80;
      else if (name.includes(qLow))   s = 70;
      else if (region.includes(qLow)) s = 40;
      else if (title.includes(qLow))  s = 30;
      else if (pkg.includes(qLow))    s = 10;

      if (s > 0) scored.push({ t, score: s });
    }
  }

  // Filter out low scores if user explicitly searched for a tier modifier like 'premium'
  let filteredScored = scored;
  if (mentionsPremium && scored.some((x) => x.score >= 100)) {
    filteredScored = scored.filter((x) => x.score >= 100);
  } else if (mentionsStandard && scored.some((x) => x.score >= 100)) {
    filteredScored = scored.filter((x) => x.score >= 100);
  }

  filteredScored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;            // relevance
    return (a.t.sale_price_eur ?? 0) - (b.t.sale_price_eur ?? 0); // then cheapest
  });

  return filteredScored.map((s) => s.t);
}

export function TariffsPageClient({
  tariffs,
  initialQuery = '',
  initialCategory,
}: {
  tariffs: Tariff[];
  initialQuery?: string;
  initialCategory?: string;
}) {
  const { t } = useTranslation();
  
  const validCategories: ActiveCategory[] = ['travel', 'travel_premium', 'unlimited_eco', 'unlimited_pro'];
  const startCat: ActiveCategory = validCategories.includes(initialCategory as ActiveCategory)
    ? (initialCategory as ActiveCategory)
    : 'travel';

  const [activeCategory, setActiveCategory] = useState<ActiveCategory>(startCat);
  const [travelTier, setTravelTier] = useState<TravelTier>(startCat === 'travel_premium' ? 'premium' : 'all');
  const [q,   setQ]   = useState(initialQuery);
  
  // Sync state `q` with changes to `initialQuery` prop from the URL
  useEffect(() => {
    setQ(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    if (initialCategory && validCategories.includes(initialCategory as ActiveCategory)) {
      setActiveCategory(initialCategory as ActiveCategory);
      if (initialCategory === 'travel_premium') {
        setTravelTier('premium');
      }
    }
  }, [initialCategory]);

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

  const travelPremiumCount = useMemo(
    () => filteredTravel.filter((t) => isPremiumTariff(t)).length,
    [filteredTravel]
  );
  const travelStandardCount = filteredTravel.length - travelPremiumCount;
  const hasPremiumAvailable = travelPremiumCount > 0;

  // Auto fallback if travel_premium is active but no premium tariffs exist for the destination/search
  useEffect(() => {
    if (activeCategory === 'travel_premium' && !hasPremiumAvailable) {
      setActiveCategory('travel');
      setTravelTier('all');
    }
  }, [activeCategory, hasPremiumAvailable]);

  const displayedTravel = useMemo(() => {
    if (activeCategory === 'travel_premium' || travelTier === 'premium') {
      return filteredTravel.filter((t) => isPremiumTariff(t));
    }
    if (travelTier === 'standard') {
      return filteredTravel.filter((t) => !isPremiumTariff(t));
    }
    return filteredTravel;
  }, [filteredTravel, activeCategory, travelTier]);

  // Count helpers
  const allTravelTotalCount = travelTariffs.filter((t) => !isPremiumTariff(t)).length;

  const isTravelView = activeCategory === 'travel' || activeCategory === 'travel_premium';
  const isUnlimitedView = activeCategory === 'unlimited_eco' || activeCategory === 'unlimited_pro';

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">

      {/* ── Header ── */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900">{t('tariffs_title')}</h1>
        <p className="mt-2 text-slate-500">{t('tariffs_sub')}</p>
      </div>

      {/* ── Main Category Switcher (4 Categories: Travel, Travel Premium, Unlimited Eco, Unlimited Pro) ── */}
      <div className="mb-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Travel */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory('travel');
            setTravelTier('all');
          }}
          className={`flex items-center justify-between rounded-2xl p-4 font-semibold transition-all border cursor-pointer ${
            activeCategory === 'travel'
              ? 'bg-sky-600 text-white border-sky-600 shadow-md ring-2 ring-sky-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-sky-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeCategory === 'travel' ? 'bg-white/20 text-white' : 'bg-sky-50 text-sky-600'
            }`}>
              <TravelGlobeIcon size={20} className={activeCategory === 'travel' ? 'text-white' : 'text-sky-600'} />
            </div>
            <div className="text-left min-w-0">
              <span className="block text-sm font-extrabold truncate">{t('cat_travel')}</span>
              <span className={`block text-[11px] truncate ${
                activeCategory === 'travel' ? 'text-sky-100' : 'text-slate-400'
              }`}>
                {t('cat_travel_desc')}
              </span>
            </div>
          </div>
          <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            activeCategory === 'travel' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {q ? travelStandardCount : allTravelTotalCount}
          </span>
        </button>

        {/* 2. Travel Premium */}
        <button
          type="button"
          disabled={!hasPremiumAvailable}
          onClick={() => {
            if (hasPremiumAvailable) {
              setActiveCategory('travel_premium');
              setTravelTier('premium');
            }
          }}
          title={
            !hasPremiumAvailable
              ? t('premium_unavailable_hint')
              : t('cat_travel_premium_desc')
          }
          className={`relative flex items-center justify-between rounded-2xl p-4 font-semibold transition-all border ${
            !hasPremiumAvailable
              ? 'opacity-45 bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed select-none'
              : activeCategory === 'travel_premium'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow-md ring-2 ring-amber-300 cursor-pointer'
                : 'bg-amber-50/70 text-amber-950 border-amber-300 hover:border-amber-400 hover:bg-amber-100/60 cursor-pointer'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              !hasPremiumAvailable
                ? 'bg-slate-200/60 text-slate-400'
                : activeCategory === 'travel_premium'
                  ? 'bg-white/20 text-white'
                  : 'bg-amber-200/80 text-amber-900'
            }`}>
              <TravelPremiumGlobeIcon size={20} className={!hasPremiumAvailable ? 'text-slate-400' : activeCategory === 'travel_premium' ? 'text-white' : 'text-amber-800'} />
            </div>
            <div className="text-left min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black truncate">{t('cat_travel_premium')}</span>
              </div>
              <span className={`block text-[11px] truncate ${
                !hasPremiumAvailable
                  ? 'text-slate-400'
                  : activeCategory === 'travel_premium'
                    ? 'text-amber-100'
                    : 'text-amber-800/80'
              }`}>
                {!hasPremiumAvailable ? t('premium_not_available_for_destination') : 'Dual-Netz • UK IP'}
              </span>
            </div>
          </div>
          <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-black ${
            !hasPremiumAvailable
              ? 'bg-slate-200 text-slate-400'
              : activeCategory === 'travel_premium'
                ? 'bg-white/20 text-white'
                : 'bg-amber-200 text-amber-950'
          }`}>
            {hasPremiumAvailable ? travelPremiumCount : 0}
          </span>
        </button>

        {/* 3. Unlimited Eco */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory('unlimited_eco');
          }}
          className={`flex items-center justify-between rounded-2xl p-4 font-semibold transition-all border cursor-pointer ${
            activeCategory === 'unlimited_eco'
              ? 'bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeCategory === 'unlimited_eco' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <EcoIcon size={18} />
            </div>
            <div className="text-left min-w-0">
              <span className="block text-sm font-extrabold truncate">{t('cat_unlimited_eco')}</span>
              <span className={`block text-[11px] truncate ${
                activeCategory === 'unlimited_eco' ? 'text-emerald-100' : 'text-slate-400'
              }`}>
                512 kbps Drosselung
              </span>
            </div>
          </div>
          <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            activeCategory === 'unlimited_eco' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            Eco
          </span>
        </button>

        {/* 4. Unlimited Pro */}
        <button
          type="button"
          onClick={() => {
            setActiveCategory('unlimited_pro');
          }}
          className={`flex items-center justify-between rounded-2xl p-4 font-semibold transition-all border cursor-pointer ${
            activeCategory === 'unlimited_pro'
              ? 'bg-violet-600 text-white border-violet-600 shadow-md ring-2 ring-violet-200'
              : 'bg-white text-slate-700 border-slate-200 hover:border-violet-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
              activeCategory === 'unlimited_pro' ? 'bg-white/20 text-white' : 'bg-violet-50 text-violet-600'
            }`}>
              <BoltIcon size={18} />
            </div>
            <div className="text-left min-w-0">
              <span className="block text-sm font-extrabold truncate">{t('cat_unlimited_pro')}</span>
              <span className={`block text-[11px] truncate ${
                activeCategory === 'unlimited_pro' ? 'text-violet-100' : 'text-slate-400'
              }`}>
                ≥ 1 Mbps Drosselung
              </span>
            </div>
          </div>
          <span className={`ml-2 shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${
            activeCategory === 'unlimited_pro' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            Pro
          </span>
        </button>
      </div>

      {/* ── TRAVEL & TRAVEL PREMIUM VIEW ── */}
      {isTravelView && (
        <>
          {/* Info bar */}
          <div className={`mb-6 rounded-2xl border px-5 py-4 flex items-start gap-3 ${
            activeCategory === 'travel_premium'
              ? 'bg-amber-50/80 border-amber-200 text-amber-950'
              : 'bg-sky-50 border-sky-200 text-sky-950'
          }`}>
            <div className="shrink-0 mt-0.5">
              {activeCategory === 'travel_premium' ? (
                <TravelPremiumGlobeIcon size={26} className="text-amber-700" />
              ) : (
                <TravelGlobeIcon size={26} className="text-sky-700" />
              )}
            </div>
            <div>
              <p className={`font-semibold ${activeCategory === 'travel_premium' ? 'text-amber-900' : 'text-sky-800'}`}>
                {activeCategory === 'travel_premium' ? t('cat_travel_premium') : t('tp_travel_title')}
              </p>
              <p className={`text-sm mt-0.5 ${activeCategory === 'travel_premium' ? 'text-amber-800' : 'text-sky-700'}`}>
                {activeCategory === 'travel_premium' ? t('cat_travel_premium_desc') : t('tp_travel_desc')}
              </p>
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

          {/* ── Sub-Filter: Standard vs Premium Tiers ── */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 mr-1">
              Filter:
            </span>
            <button
              onClick={() => {
                setTravelTier('all');
                if (activeCategory === 'travel_premium') setActiveCategory('travel');
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer ${
                travelTier === 'all' && activeCategory !== 'travel_premium'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {t('filter_tier_all')} ({filteredTravel.length})
            </button>
            <button
              onClick={() => {
                setTravelTier('standard');
                if (activeCategory === 'travel_premium') setActiveCategory('travel');
              }}
              className={`rounded-xl px-4 py-2 text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                travelTier === 'standard' && activeCategory !== 'travel_premium'
                  ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300'
              }`}
            >
              <TravelGlobeIcon
                size={15}
                className={travelTier === 'standard' && activeCategory !== 'travel_premium' ? 'text-white' : 'text-sky-600'}
              />
              <span>{t('filter_tier_standard')} ({travelStandardCount})</span>
            </button>
            {hasPremiumAvailable ? (
              <button
                onClick={() => {
                  setTravelTier('premium');
                  setActiveCategory('travel_premium');
                }}
                className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-all border cursor-pointer flex items-center gap-1.5 ${
                  travelTier === 'premium' || activeCategory === 'travel_premium'
                    ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white border-amber-500 shadow-xs'
                    : 'bg-amber-50/80 text-amber-900 border-amber-300/80 hover:border-amber-400'
                }`}
              >
                <TravelPremiumGlobeIcon
                  size={15}
                  className={travelTier === 'premium' || activeCategory === 'travel_premium' ? 'text-white' : 'text-amber-800'}
                />
                <span>{t('cat_travel_premium')}</span>
                <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  travelTier === 'premium' || activeCategory === 'travel_premium' ? 'bg-white/20 text-white' : 'bg-amber-200 text-amber-950'
                }`}>
                  {travelPremiumCount}
                </span>
              </button>
            ) : (
              <button
                type="button"
                disabled
                title={t('premium_unavailable_hint')}
                className="rounded-xl px-4 py-2 text-xs font-bold border border-slate-200 bg-slate-100/70 text-slate-400 cursor-not-allowed flex items-center gap-1.5 opacity-50 select-none"
              >
                <TravelPremiumGlobeIcon size={15} className="text-slate-400" />
                <span>{t('cat_travel_premium')}</span>
                <span className="rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-slate-200 text-slate-500">
                  0
                </span>
              </button>
            )}
          </div>

          {/* Result hint */}
          {q && (
            <p className="mb-4 text-sm text-slate-500">
              {displayedTravel.length === 0
                ? t('tp_no_results', { q })
                : t(displayedTravel.length === 1 ? 'tp_results_one' : 'tp_results', { count: displayedTravel.length, q })}
            </p>
          )}

          {displayedTravel.length === 0 ? (
            <div className="py-20 text-center">
              <div className="flex justify-center mb-4">
                <SearchIcon size={48} className="text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600">{t('tariffs_empty')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('tariffs_empty_sub')}</p>
              {(q || travelTier !== 'all' || activeCategory === 'travel_premium') && (
                <div className="mt-4 flex justify-center gap-2">
                  {(travelTier !== 'all' || activeCategory === 'travel_premium') && (
                    <button
                      onClick={() => {
                        setActiveCategory('travel');
                        setTravelTier('all');
                      }}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {t('filter_tier_all')}
                    </button>
                  )}
                  {q && (
                    <button
                      onClick={() => setQ('')}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                      {t('tp_reset')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <TariffsGrid tariffs={displayedTravel} />
          )}
        </>
      )}

      {/* ── UNLIMITED (ECO & PRO) VIEW ── */}
      {isUnlimitedView && (
        <>
          {/* Info bar */}
          <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-violet-50 border border-slate-200 px-5 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div
                onClick={() => setActiveCategory('unlimited_eco')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  activeCategory === 'unlimited_eco'
                    ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300 shadow-xs'
                    : 'border-slate-200/80 bg-white/80 hover:border-emerald-300'
                }`}
              >
                <span className="text-2xl shrink-0 mt-0.5"><EcoIcon size={24} /></span>
                <div>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{t('tp_eco_title')}</span>
                    {activeCategory === 'unlimited_eco' && (
                      <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.2 rounded-full">Aktiv</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">{t('tp_eco_desc')}</p>
                </div>
              </div>
              <div
                onClick={() => setActiveCategory('unlimited_pro')}
                className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                  activeCategory === 'unlimited_pro'
                    ? 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-300 shadow-xs'
                    : 'border-slate-200/80 bg-white/80 hover:border-violet-300'
                }`}
              >
                <span className="text-2xl shrink-0 mt-0.5"><BoltIcon size={24} className="text-violet-600" /></span>
                <div>
                  <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{t('tp_pro_title')}</span>
                    {activeCategory === 'unlimited_pro' && (
                      <span className="text-[10px] font-bold bg-violet-100 text-violet-800 px-2 py-0.2 rounded-full">Aktiv</span>
                    )}
                  </p>
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
              <div className="flex justify-center mb-4">
                <InfinityIcon size={48} className="text-slate-300" />
              </div>
              <p className="text-lg font-semibold text-slate-600">{t('tp_unlimited_empty')}</p>
              <p className="mt-1 text-sm text-slate-400">{t('tp_unlimited_empty_sub')}</p>
            </div>
          ) : (
            <UnlimitedConfigurator
              tariffs={unlimitedTariffs}
              initialQuery={q}
              initialTariffType={activeCategory === 'unlimited_pro' ? 'unlimited_pro' : 'unlimited_eco'}
              onTariffTypeChange={(type) => setActiveCategory(type)}
            />
          )}
        </>
      )}
    </div>
  );
}
