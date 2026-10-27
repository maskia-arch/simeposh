'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { formatCurrencyEuro } from '@/lib/currency';

export interface OverviewDestination {
  code: string;
  name: string;
  localizedName: string;
  slug: string;
  flag: string | null;
  minPrice: number;
  count: number;
  regionGroup: 'europe' | 'asia' | 'americas' | 'middle_east' | 'africa' | 'oceania' | 'global';
}

interface DestinationsOverviewClientProps {
  destinations: OverviewDestination[];
  totalDestinations: number;
}

export function DestinationsOverviewClient({ destinations, totalDestinations }: DestinationsOverviewClientProps) {
  const { t, locale } = useTranslation();
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;

  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('all');

  const groupLabels: Record<string, string> = {
    all: t('filter_all' as any) || (isDe ? 'Alle' : 'All'),
    europe: t('region_europe' as any) || (isDe ? 'Europa' : 'Europe'),
    asia: t('region_asia' as any) || (isDe ? 'Asien' : 'Asia'),
    americas: t('region_americas' as any) || (isDe ? 'Amerika' : 'Americas'),
    middle_east: t('region_middle_east' as any) || (isDe ? 'Naher Osten' : 'Middle East'),
    africa: t('region_africa' as any) || (isDe ? 'Afrika' : 'Africa'),
    oceania: t('region_oceania' as any) || (isDe ? 'Ozeanien' : 'Oceania'),
    global: t('region_global' as any) || (isDe ? 'Regional & Global' : 'Regional & Global'),
  };

  const groupOrder: Array<'europe' | 'asia' | 'americas' | 'middle_east' | 'africa' | 'oceania' | 'global'> = [
    'europe',
    'asia',
    'americas',
    'middle_east',
    'africa',
    'oceania',
    'global',
  ];

  const filteredDestinations = useMemo(() => {
    let list = destinations;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.localizedName.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          d.code.toLowerCase() === q ||
          d.slug.toLowerCase().includes(q)
      );
    }
    if (activeGroup !== 'all') {
      list = list.filter((d) => d.regionGroup === activeGroup);
    }
    return list;
  }, [destinations, searchQuery, activeGroup]);

  // Group filtered results by region
  const groupedResults = useMemo(() => {
    const map = new Map<string, OverviewDestination[]>();
    for (const d of filteredDestinations) {
      const g = d.regionGroup;
      const arr = map.get(g) || [];
      arr.push(d);
      map.set(g, arr);
    }
    return map;
  }, [filteredDestinations]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 text-white py-14 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.08),transparent)] pointer-events-none" />
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <span className="inline-block rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm mb-3 text-brand-200">
            {t('nav_tagline')} · PureSim
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {t('esim_overview_h1' as any) || (isDe ? 'Alle eSIM Reiseziele im Überblick' : 'All eSIM Destinations Worldwide')}
          </h1>
          <p className="mt-3 text-base md:text-lg text-brand-100 max-w-2xl mx-auto leading-relaxed">
            {t('esim_overview_subtitle' as any) || (isDe
              ? `Entdecke ${totalDestinations} Länder und Regionen mit schnellem Roaming und flexiblen Datenpaketen ab 0,59 €.`
              : `Explore ${totalDestinations} countries and regions with fast roaming and flexible data plans starting from €0.59.`)}
          </p>

          {/* Search Box */}
          <div className="mt-8 max-w-xl mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_destinations_placeholder' as any) || (isDe ? 'Reiseziel oder Land suchen...' : 'Search country or region...')}
                aria-label={t('search_destinations_placeholder' as any) || 'Reiseziel suchen'}
                className="w-full rounded-2xl bg-white px-5 py-3.5 pl-12 text-slate-900 placeholder-slate-600 shadow-xl border border-transparent focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-400/30 text-sm md:text-base font-medium"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-800 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* CTA Link to Tariffs */}
          <div className="mt-6 flex justify-center">
            <Link
              href={`${prefix}/tariffs`}
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 text-xs md:text-sm font-bold backdrop-blur-md transition-all border border-white/20 shadow-sm"
            >
              <span>{t('btn_compare_all_tariffs' as any) || (isDe ? 'Alle Tarife im Detail vergleichen' : 'Compare All Tariffs in Detail')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-8">
        {/* Region Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {['all', ...groupOrder].map((g) => {
            const isSelected = activeGroup === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGroup(g)}
                aria-pressed={isSelected}
                aria-controls="destinations-grid"
                className={`min-h-[44px] rounded-full px-4 py-2 text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900 shadow-2xs'
                }`}
              >
                {groupLabels[g]}
              </button>
            );
          })}
        </div>

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700">
            {filteredDestinations.length}{' '}
            {isDe
              ? filteredDestinations.length === 1 ? 'Reiseziel gefunden' : 'Reiseziele gefunden'
              : filteredDestinations.length === 1 ? 'destination found' : 'destinations found'}
          </p>
          <Link
            href={`${prefix}/tariffs`}
            className="text-xs md:text-sm font-bold text-brand-600 hover:text-brand-700 transition-colors"
          >
            {t('btn_compare_all_tariffs' as any) || (isDe ? 'Alle Tarife vergleichen →' : 'Compare all tariffs →')}
          </Link>
        </div>

        {/* Destination Sections */}
        <div id="destinations-grid" className="space-y-12">
          {groupOrder.map((groupKey) => {
            const list = groupedResults.get(groupKey);
            if (!list || list.length === 0) return null;

            return (
              <section key={groupKey} className="space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                    {groupLabels[groupKey]}
                  </h2>
                  <span className="rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                    {list.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
                  {list.map((d) => (
                    <Link
                      key={d.code}
                      href={`${prefix}/esim/${d.slug}`}
                      className="group relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-brand-300 hover:shadow-md transition-all duration-200 min-h-[58px]"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <span className="text-2xl shrink-0 leading-none select-none" role="img" aria-label={d.localizedName}>
                          {d.flag || '🌍'}
                        </span>
                        <div className="min-w-0">
                          <span className="block truncate text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors">
                            {d.localizedName}
                          </span>
                          <span className="block text-[11px] text-slate-600">
                            {d.count} {isDe ? (d.count === 1 ? 'Tarif' : 'Tarife') : (d.count === 1 ? 'plan' : 'plans')}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 text-right pl-2">
                        {d.minPrice > 0 ? (
                          <span className="inline-block rounded-lg bg-slate-100 px-2 py-1 text-xs font-black text-slate-800 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors">
                            {isDe ? 'ab ' : 'from '}
                            {formatCurrencyEuro(d.minPrice, locale)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-brand-600 group-hover:underline">
                            Details →
                          </span>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            );
          })}

          {filteredDestinations.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 shadow-xs">
              <span className="text-4xl mb-3 block">🔍</span>
              <h3 className="text-lg font-bold text-slate-900">
                {isDe ? 'Keine Reiseziele gefunden' : 'No destinations found'}
              </h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                {isDe
                  ? `Für "${searchQuery}" wurde kein passendes Land gefunden. Versuche einen anderen Suchbegriff oder stöbere in der Gesamttarifliste.`
                  : `No destination matched "${searchQuery}". Try a different search term or view the full tariff directory.`}
              </p>
              <div className="mt-4">
                <Link
                  href={`${prefix}/tariffs`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-brand-500 transition-all"
                >
                  {isDe ? 'Alle Tarife ansehen' : 'View all plans'} →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
