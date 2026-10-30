'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { formatCurrencyEuro } from '@/lib/currency';
import { formatDestinationsFound } from '@/lib/i18n/plural';

// Tuple: [0: code, 1: slug, 2: flag, 3: localizedName, 4: minPrice, 5: regionGroup]
export type CompactDestination = [
  code: string,
  slug: string,
  flag: string | null,
  name: string,
  minPrice: number,
  regionGroup: 'europe' | 'asia' | 'americas' | 'middle_east' | 'africa' | 'oceania' | 'global'
];

interface DestinationsOverviewClientProps {
  destinations: CompactDestination[];
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
          d[3].toLowerCase().includes(q) ||
          d[0].toLowerCase() === q ||
          d[1].toLowerCase().includes(q)
      );
    }
    if (activeGroup !== 'all') {
      list = list.filter((d) => d[5] === activeGroup);
    }
    return list;
  }, [destinations, searchQuery, activeGroup]);

  // Group filtered results by region
  const groupedResults = useMemo(() => {
    const map = new Map<string, CompactDestination[]>();
    for (const d of filteredDestinations) {
      const g = d[5];
      const arr = map.get(g) || [];
      arr.push(d);
      map.set(g, arr);
    }
    return map;
  }, [filteredDestinations]);

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24">
      {/* Hero Header */}
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center relative z-10">
          <span className="inline-block rounded-full bg-white/10 px-3.5 py-1 text-xs font-semibold uppercase tracking-wider mb-3 text-brand-200">
            {t('nav_tagline')}
          </span>
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight leading-tight">
            {t('esim_overview_h1' as any) || (isDe ? 'Alle eSIM Reiseziele im Überblick' : 'All eSIM Destinations Worldwide')}
          </h1>
          <p className="mt-3 text-sm md:text-base text-brand-100 max-w-2xl mx-auto leading-relaxed">
            {t('esim_overview_subtitle' as any) || (isDe
              ? `Entdecke ${totalDestinations} Länder und Regionen mit schnellem Roaming und flexiblen Datenpaketen ab 0,59 €.`
              : `Explore ${totalDestinations} countries and regions with fast roaming and flexible data plans starting from €0.59.`)}
          </p>

          {/* Search Box */}
          <div className="mt-6 max-w-lg mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filteredDestinations.length > 0) {
                    e.preventDefault();
                    window.location.href = `${prefix}/esim/${filteredDestinations[0][1]}`;
                  }
                }}
                placeholder={t('search_destinations_placeholder' as any) || (isDe ? 'Reiseziel oder Land suchen...' : 'Search country or region...')}
                aria-label={t('search_destinations_placeholder' as any) || 'Reiseziel suchen'}
                className="w-full rounded-xl bg-white px-4 py-3 pl-11 text-slate-900 placeholder-slate-500 shadow-lg border-0 focus:ring-2 focus:ring-brand-400 text-sm font-medium"
              />
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* CTA Link to Tariffs */}
          <div className="mt-5 flex justify-center">
            <Link
              href={`${prefix}/tariffs`}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white px-4 py-2.5 text-xs md:text-sm font-bold border border-white/20 transition-all"
            >
              <span>{t('btn_compare_all_tariffs' as any) || (isDe ? 'Alle Tarife im Detail vergleichen' : 'Compare All Tariffs in Detail')}</span>
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mt-6">
        {/* Region Filter Bar */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 mb-6">
          {['all', ...groupOrder].map((g) => {
            const isSelected = activeGroup === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => setActiveGroup(g)}
                aria-pressed={isSelected}
                aria-controls="destinations-grid"
                className={`min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs md:text-sm font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {groupLabels[g]}
              </button>
            );
          })}
        </div>

        {/* Results Count & Comparison link */}
        <div className="flex items-center justify-between mb-5 pb-2 border-b border-slate-200">
          <p className="text-sm font-semibold text-slate-700" aria-live="polite">
            {formatDestinationsFound(filteredDestinations.length, locale)}
          </p>
          <Link
            href={`${prefix}/tariffs`}
            className="text-xs md:text-sm font-bold text-brand-600 hover:text-brand-700 min-h-[44px] inline-flex items-center"
          >
            {t('btn_compare_all_tariffs' as any) || (isDe ? 'Alle Tarife vergleichen →' : 'Compare all tariffs →')}
          </Link>
        </div>

        {/* Destination Sections */}
        <div id="destinations-grid" className="space-y-8">
          {groupOrder.map((groupKey) => {
            const list = groupedResults.get(groupKey);
            if (!list || list.length === 0) return null;

            return (
              <section key={groupKey} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg md:text-xl font-black text-slate-900 tracking-tight">
                    {groupLabels[groupKey]}
                  </h2>
                  <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {list.length}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {list.map((d) => (
                    <Link
                      key={d[0]}
                      href={`${prefix}/esim/${d[1]}`}
                      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3 hover:border-brand-300 hover:shadow-sm transition-all min-h-[50px]"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span className="text-xl shrink-0 leading-none select-none">
                          {d[2] || '🌍'}
                        </span>
                        <span className="text-sm font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 break-words leading-snug">
                          {d[3]}
                        </span>
                      </div>

                      <div className="shrink-0 text-right pl-1">
                        {d[4] > 0 ? (
                          <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-black text-slate-800 group-hover:bg-brand-50 group-hover:text-brand-700 transition-colors">
                            {t('price_from' as any) || (isDe ? 'ab ' : 'from ')}
                            {formatCurrencyEuro(d[4], locale)}
                          </span>
                        ) : (
                          <span className="text-xs font-bold text-brand-600">
                            →
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
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200 p-6">
              <span className="text-3xl mb-2 block">🔍</span>
              <h3 className="text-base font-bold text-slate-900">
                {t('no_destinations_found' as any) || (isDe ? 'Keine Reiseziele gefunden' : 'No destinations found')}
              </h3>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                {t('no_destinations_matched' as any, { query: searchQuery }) || (isDe
                  ? `Für "${searchQuery}" wurde kein passendes Land gefunden.`
                  : `No destination matched "${searchQuery}".`)}
              </p>
              <div className="mt-3">
                <Link
                  href={`${prefix}/tariffs`}
                  className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-brand-500 min-h-[44px]"
                >
                  {t('view_all_plans' as any) || (isDe ? 'Alle Tarife ansehen' : 'View all plans')} →
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
