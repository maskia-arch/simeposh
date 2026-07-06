'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { useCart } from '@/components/CartProvider';
import { displayCountryName, coverageLabel, getTariffOperators, bestNetworkType, isoName } from '@/lib/tariff-display';
import { PlaneIcon, InfinityIcon, BoltIcon, NetworkIcon, TagIcon } from '@/components/Icons';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

const NET_COLOR: Record<string, string> = {
  '5G': 'bg-violet-100 text-violet-700',
  '4G': 'bg-blue-100 text-blue-700',
  '3G': 'bg-slate-100 text-slate-600',
};

const TYPE_BADGE: Record<string, { icon: React.ReactNode; labelKey: 'badge_travel'|'badge_eco'|'badge_pro'; cls: string; descKey: 'type_travel_desc'|'type_eco_desc'|'type_pro_desc' }> = {
  travel:        { icon: <PlaneIcon size={12} className="currentColor" />, labelKey: 'badge_travel', descKey: 'type_travel_desc', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  unlimited_eco: { icon: <InfinityIcon size={12} className="currentColor" />, labelKey: 'badge_eco',    descKey: 'type_eco_desc',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unlimited_pro: { icon: <BoltIcon size={12} className="currentColor" />, labelKey: 'badge_pro',    descKey: 'type_pro_desc',    cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

interface TariffCardProps {
  tariff:      Tariff;
  onBuy:       (tariff: Tariff) => void;
  onDetail?:   (tariff: Tariff) => void;
  loading?:    boolean;
}

export function TariffCard({ tariff, onBuy, onDetail, loading }: TariffCardProps) {
  const { t, locale } = useTranslation();
  const { addItem }   = useCart();
  const [showCountryList, setShowCountryList] = useState(false);
  const badge   = tariff.tariff_type ? TYPE_BADGE[tariff.tariff_type] : null;
  const ops     = getTariffOperators(tariff.raw_data as Record<string, unknown> | null, 3);
  const network = bestNetworkType(ops);
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  const countryLabel = displayCountryName(tariff, locale);
  const coverage     = coverageLabel(tariff, locale);

  return (
    <Link
      href={`/tariffs/${tariff.slug || tariff.package_code}`}
      onClick={(e) => {
        if (onDetail) {
          e.preventDefault();
          onDetail(tariff);
        }
      }}
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md overflow-hidden cursor-pointer"
    >
      {/* ── Type colour strip ── */}
      <div className={`h-1 w-full ${
        tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
        tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
        'bg-gradient-to-r from-brand-500 to-brand-400'
      }`} />

      <div className="p-5 flex flex-col flex-1">

        {/* ── Flag + Country ── */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <CountryFlag countryCode={tariff.country_code} countryName={countryLabel} size={40} />
            <div>
              <p className="font-bold text-slate-800 leading-tight">{countryLabel}</p>
              {coverage && (
                <div className="relative inline-flex items-center gap-1.5 text-xs text-slate-400 mt-0.5">
                  <span>🌍 {coverage}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCountryList(true);
                    }}
                    className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                    title={t('det_show_countries')}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Type badge top-right */}
          {badge && (
            <span
              title={t(badge.descKey)}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
            >
              {badge.icon} {t(badge.labelKey)}
            </span>
          )}
        </div>

        {/* ── Promo label ── */}
        {tariff.label && (
          <div className="mb-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              <TagIcon size={12} className="text-amber-800" />
              {tariff.label}
            </span>
          </div>
        )}

        {/* ── Specs ── */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-brand-700 leading-tight">
              {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t('card_data')}</p>
            {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
              <p className="text-[10px] text-brand-500">{formatGb(tariff.data_gb)}/{t('cfg_day')}</p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-slate-700 leading-tight">
              {tariff.validity_days}<span className="text-sm">{t('card_days')}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t('card_validity')}</p>
          </div>
        </div>

        {/* ── Speed note ── */}
        {tariff.tariff_type === 'unlimited_eco' && (
          <p className="mb-2 flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 leading-tight">
            <InfinityIcon size={12} className="text-emerald-700" />
            <span>Nach Limit: 512 kbps</span>
          </p>
        )}
        {tariff.tariff_type === 'unlimited_pro' && (
          <p className="mb-2 flex items-center gap-1 text-xs text-violet-700 bg-violet-50 rounded-lg px-2.5 py-1 leading-tight">
            <BoltIcon size={12} className="text-violet-700" />
            <span>Nach Limit: ≥ 1 Mbps</span>
          </p>
        )}

        {/* ── Network operators ── */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 min-h-[22px]">
          {network && (
            <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${NET_COLOR[network] ?? ''}`}>
              {network}
            </span>
          )}
          {ops.length > 0 ? (
            <span className="flex items-center gap-1 text-[11px] text-slate-500 truncate">
              <NetworkIcon size={12} className="text-slate-500" />
              <span className="truncate">{ops.map((o) => o.name).join(' · ')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1 text-[11px] text-slate-400">
              <NetworkIcon size={12} className="text-slate-400" />
              <span>{t('card_best_network')}</span>
            </span>
          )}
        </div>

        {/* ── Price ── */}
        <div className="mt-auto flex items-baseline justify-between pt-3 border-t border-slate-100">
          <Price eur={tariff.sale_price_eur} className="text-xl font-extrabold text-slate-900" />
          {onDetail && (
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(tariff); }}
              className="text-xs font-medium text-slate-400 hover:text-brand-600 transition-colors"
              title={t('card_details')}
            >
              {t('card_details')} ℹ️
            </button>
          )}
        </div>

        {/* ── CTAs: Add to cart + Buy now ── */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); addItem(tariff); }}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 active:scale-95"
            title={t('det_add_cart')}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .96-.343 1.087-.835l1.823-6.844a.75.75 0 00-.726-.94H6.106M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="hidden sm:inline">{t('card_add_cart')}</span>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onBuy(tariff); }}
            disabled={loading}
            className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-95 disabled:opacity-60"
          >
            {loading ? t('card_loading') : t('card_buy_now')}
          </button>
        </div>
      </div>
      {showCountryList && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 bg-white/95 backdrop-blur-sm z-30 p-5 flex flex-col animate-in fade-in zoom-in-95 duration-100 cursor-default"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
            <span className="text-sm font-extrabold text-slate-800">{t('det_coverage_list')}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowCountryList(false);
              }}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
            >
              ✕
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1 scrollbar-thin">
            {tariff.location_codes?.map((code) => {
              const name = isoName(code, locale);
              return (
                <div key={code} className="flex items-center gap-2 text-xs text-slate-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors">
                  <CountryFlag countryCode={code} countryName={name} size={16} className="shrink-0 rounded-sm" />
                  <span className="shrink-0 font-mono text-[9px] font-semibold text-slate-400 uppercase w-4">{code}</span>
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Link>
  );
}
