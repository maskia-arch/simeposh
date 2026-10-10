'use client';

import { useState } from 'react';
import { formatGb } from '@/lib/utils';
import type { PublicTariff } from '@/lib/tariffs';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { useCart } from '@/components/CartProvider';
import { displayCountryName, coverageLabel, getTariffOperators, bestNetworkType, isoName, cleanTariffName, getTariffSpecialFeatures, isPremiumTariff, isNonHkIpTariff, getTariffBreakoutIp, isTurkeyTariff, type TariffSpecialFeature } from '@/lib/tariff-display';
import { PlaneIcon, InfinityIcon, EcoIcon, BoltIcon, NetworkIcon, TagIcon, InfoIcon, TravelGlobeIcon, TravelPremiumGlobeIcon } from '@/components/Icons';

type Tariff = PublicTariff;

const NET_COLOR: Record<string, string> = {
  '5G': 'bg-violet-100 text-violet-700',
  '4G': 'bg-blue-100 text-blue-700',
  '3G': 'bg-slate-100 text-slate-600',
};

const TYPE_BADGE: Record<string, { icon: React.ReactNode; labelKey: 'badge_travel'|'badge_eco'|'badge_pro'; cls: string; descKey: 'type_travel_desc'|'type_eco_desc'|'type_pro_desc' }> = {
  travel:        { icon: <TravelGlobeIcon size={13} className="currentColor" />, labelKey: 'badge_travel', descKey: 'type_travel_desc', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  unlimited_eco: { icon: <EcoIcon size={12} />, labelKey: 'badge_eco',    descKey: 'type_eco_desc',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unlimited_pro: { icon: <BoltIcon size={12} className="currentColor" />, labelKey: 'badge_pro',    descKey: 'type_pro_desc',    cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

interface TariffCardProps {
  tariff:         Tariff;
  onBuy:          (tariff: Tariff) => void;
  onDetail?:      (tariff: Tariff) => void;
  loading?:       boolean;
  isRecommended?: boolean;
}

export function TariffCard({ tariff, onBuy, onDetail, loading, isRecommended }: TariffCardProps) {
  const { t, locale } = useTranslation();
  const { addItem, open } = useCart();
  const [showCountryList, setShowCountryList] = useState(false);
  const [activeFeature, setActiveFeature] = useState<TariffSpecialFeature | null>(null);
  const [activeAbbr, setActiveAbbr] = useState<{ label: string; text: string } | null>(null);

  const isPremium   = isPremiumTariff(tariff);
  const breakoutIp  = getTariffBreakoutIp(tariff);
  const isTravel    = (tariff.tariff_type ?? 'travel') === 'travel';
  const badge       = tariff.tariff_type ? TYPE_BADGE[tariff.tariff_type] : null;
  const ops         = getTariffOperators(tariff, 4);
  const network     = bestNetworkType(ops);
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  const countryLabel = displayCountryName(tariff, locale);
  const coverage     = coverageLabel(tariff, locale);
  const features     = getTariffSpecialFeatures(tariff);
  const cleanedTitle = cleanTariffName(tariff.name);

  // Determine abbreviations
  const isNonHk = isNonHkIpTariff(tariff);
  const isDualNet = ops.length > 1;
  const isHk = !isNonHk && !isPremium && (!breakoutIp || breakoutIp === 'HK');

  // Limit badges shown directly on card face to at most 2
  const visibleFeatures = features.slice(0, 2);
  const hiddenCount = features.length - visibleFeatures.length;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl bg-white shadow-sm transition-all duration-200 hover:shadow-md overflow-hidden ${
        isRecommended
          ? 'border-2 border-brand-500 shadow-md ring-2 ring-brand-100/80 hover:border-brand-600'
          : isPremium && isTravel
            ? 'border border-amber-300/80 hover:border-amber-400'
            : 'border border-slate-200 hover:border-brand-300'
      }`}
    >
      {/* ── Type colour strip ── */}
      <div className={`h-1.5 w-full ${
        isRecommended ? 'bg-gradient-to-r from-brand-600 via-sky-500 to-brand-500' :
        tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
        tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
        isPremium ? 'bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600' :
        'bg-gradient-to-r from-brand-500 to-brand-400'
      }`} />

      <div className="p-5 flex flex-col flex-1">

        {/* ── Flag + Country + Badges ── */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <CountryFlag countryCode={tariff.country_code} countryName={countryLabel} size={40} />
            <div>
              <p className="font-bold text-slate-800 leading-tight">{countryLabel}</p>
              {coverage && (
                <div className="relative inline-flex items-center gap-1.5 text-xs text-slate-500 mt-0.5">
                  <span>🌍 {coverage}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCountryList(true);
                    }}
                    className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors focus:outline-none"
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

          {/* Badges top-right: Recommended takes priority, or type badge */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isRecommended && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-600 text-white px-2.5 py-0.5 text-xs font-bold shadow-xs">
                ★ {t('badge_recommended')}
              </span>
            )}
            {isPremium && isTravel ? (
              <span
                title={t('type_travel_premium_desc' as any)}
                className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-2 py-0.5 text-xs font-extrabold text-amber-900 shadow-2xs"
              >
                <TravelPremiumGlobeIcon size={14} className="text-amber-800" /> {t('badge_travel_premium' as any)}
              </span>
            ) : badge && !isRecommended ? (
              <span
                title={t(badge.descKey)}
                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
              >
                {badge.icon} {t(badge.labelKey)}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Special Feature Badges (At most 2 on card face, font-size at least 12px / text-xs) ── */}
        {visibleFeatures.length > 0 && (
          <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
            {visibleFeatures.map((feat) => {
              const isSelected = activeFeature?.id === feat.id;
              return (
                <button
                  key={feat.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveAbbr(null);
                    setActiveFeature(isSelected ? null : feat);
                  }}
                  className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-all cursor-pointer ${feat.cls} ${
                    isSelected ? 'ring-2 ring-indigo-400 font-bold shadow-xs' : ''
                  }`}
                  title={`${t(feat.titleKey as any)} – Details anzeigen`}
                >
                  {feat.id === 'travel_premium' ? (
                    <TravelPremiumGlobeIcon size={13} className="text-amber-800" />
                  ) : (
                    <span>{feat.icon}</span>
                  )}
                  <span>{t(feat.badgeKey as any)}</span>
                  <span className="opacity-60 text-xs">ⓘ</span>
                </button>
              );
            })}
            {hiddenCount > 0 && onDetail && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDetail(tariff);
                }}
                className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                +{hiddenCount}
              </button>
            )}
          </div>
        )}

        {/* ── Interactive Expandable Feature Info Accordion Box ── */}
        {activeFeature && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-2.5 rounded-xl border border-indigo-200 bg-indigo-50/90 p-3 text-xs text-indigo-950 animate-in fade-in slide-in-from-top-1 duration-150 relative cursor-default shadow-xs"
          >
            <div className="flex items-center justify-between border-b border-indigo-200/70 pb-1 mb-1">
              <span className="font-extrabold flex items-center gap-1 text-indigo-900 text-xs">
                {activeFeature.id === 'travel_premium' ? (
                  <TravelPremiumGlobeIcon size={14} className="text-amber-800" />
                ) : (
                  <span>{activeFeature.icon}</span>
                )}
                <span>{t(activeFeature.titleKey as any)}</span>
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveFeature(null);
                }}
                className="text-indigo-400 hover:text-indigo-700 text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-indigo-100 transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="leading-relaxed text-xs font-medium">{t(activeFeature.descKey as any)}</p>
            {activeFeature.priceNoteKey && (
              <p className="mt-1 text-xs text-indigo-800 bg-indigo-100/70 rounded-md p-1.5 font-semibold leading-tight">
                💡 {t(activeFeature.priceNoteKey as any)}
              </p>
            )}
            {activeFeature.extra && (
              <p className="mt-0.5 text-xs font-mono text-indigo-600 font-semibold">{activeFeature.extra}</p>
            )}
          </div>
        )}

        {/* ── Interactive Abbreviation Explanations Popover (HK IP, Non-HK IP, Dual-Netz) ── */}
        {activeAbbr && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="mb-2.5 rounded-xl border border-slate-300 bg-slate-50 p-2.5 text-xs text-slate-800 animate-in fade-in slide-in-from-top-1 duration-150 relative shadow-sm"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-1 mb-1">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <span>ℹ️</span> {activeAbbr.label}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveAbbr(null);
                }}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold w-4 h-4 flex items-center justify-center rounded-full hover:bg-slate-200 transition-colors"
              >
                ✕
              </button>
            </div>
            <p className="leading-relaxed text-xs font-medium text-slate-700">{activeAbbr.text}</p>
          </div>
        )}

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
              <p className="text-xs text-brand-500">{formatGb(tariff.data_gb)}/{t('cfg_day')}</p>
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
          <p className="mb-2 flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 leading-tight">
            <EcoIcon size={14} />
            <span>Nach Limit: 512 kbps</span>
          </p>
        )}
        {tariff.tariff_type === 'unlimited_pro' && (
          <p className="mb-2 flex items-center gap-1 text-xs text-violet-700 bg-violet-50 rounded-lg px-2.5 py-1 leading-tight">
            <BoltIcon size={12} className="text-violet-700" />
            <span>Nach Limit: ≥ 1 Mbps</span>
          </p>
        )}

        {/* ── Network operators & Routing Line (Differentiates same-price cards) ── */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5 min-h-[24px]">
          {network && (
            <span className={`rounded-md px-1.5 py-0.5 text-xs font-bold ${NET_COLOR[network] ?? ''}`}>
              {network}
            </span>
          )}
          {ops.length > 0 ? (
            <span className="flex items-center gap-1 text-xs text-slate-700 truncate font-medium">
              <NetworkIcon size={13} className="text-slate-500 shrink-0" />
              <span className="truncate">{ops.map((o) => o.name).join(' · ')}</span>
              {ops.length > 1 && (
                <span className="text-slate-400 font-normal">({ops.length} Netze)</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <NetworkIcon size={13} className="text-slate-400" />
              <span>{t('card_best_network')}</span>
            </span>
          )}

          {/* Interactive Dual-Netz Pill */}
          {isDualNet && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFeature(null);
                setActiveAbbr(activeAbbr?.label === t('card_dual_net_pill') ? null : {
                  label: t('card_dual_net_pill'),
                  text: t('feat_dual_net_desc'),
                });
              }}
              className="rounded-md bg-emerald-50 border border-emerald-300 px-1.5 py-0.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer transition-colors"
              title={t('feat_dual_net_desc')}
            >
              {t('card_dual_net_pill')} ⓘ
            </button>
          )}

          {/* Interactive Routing Pill (HK IP / Non-HK IP / Specific Breakout IP) */}
          {isNonHk ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFeature(null);
                setActiveAbbr(activeAbbr?.label === 'Non-HK IP' ? null : {
                  label: 'Non-HK IP',
                  text: t('feat_non_hk_ip_desc'),
                });
              }}
              className="rounded-md bg-indigo-50 border border-indigo-300 px-1.5 py-0.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-colors"
              title="Klicken für Erklärung: Ohne Umweg über Hongkong"
            >
              Non-HK IP ⓘ
            </button>
          ) : isHk ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveFeature(null);
                setActiveAbbr(activeAbbr?.label === 'HK IP' ? null : {
                  label: 'HK IP',
                  text: t('feat_hk_ip_desc'),
                });
              }}
              className="rounded-md bg-slate-100 border border-slate-300 px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:bg-slate-200 cursor-pointer transition-colors"
              title="Klicken für Erklärung: Internet läuft über Hongkong"
            >
              HK IP ⓘ
            </button>
          ) : breakoutIp ? (
            <span
              className="rounded-md bg-slate-100 border border-slate-200 px-1.5 py-0.5 text-xs font-mono font-medium text-slate-700"
            >
              {breakoutIp === 'UK' ? '🇬🇧 UK IP' : breakoutIp === 'NL' ? '🇳🇱 NL IP' : `${breakoutIp} IP`}
            </span>
          ) : null}
        </div>

        {/* ── Price ── */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
          <Price
            eur={tariff.sale_price_eur}
            className={`${isRecommended ? 'text-2xl font-black text-brand-700' : 'text-xl font-extrabold text-slate-900'}`}
          />
          {onDetail && (
            <button
              onClick={(e) => { e.stopPropagation(); onDetail(tariff); }}
              className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center px-2 py-2 text-xs font-semibold text-[#475569] hover:text-brand-600 transition-colors cursor-pointer rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              title={t('card_details')}
            >
              {t('card_details')} ℹ️
            </button>
          )}
        </div>

        {/* ── CTAs: Add to cart + Buy now ── */}
        <div className="mt-3 flex gap-2 items-center">
          <button
            onClick={(e) => { e.stopPropagation(); addItem(tariff); }}
            className="flex flex-1 h-12 items-center justify-center gap-1.5 rounded-xl border-[1.5px] border-brand-200 bg-brand-50 px-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-100 hover:border-brand-300 active:scale-95 cursor-pointer"
            title={t('det_add_cart')}
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c.51 0 .96-.343 1.087-.835l1.823-6.844a.75.75 0 00-.726-.94H6.106M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
            </svg>
            <span className="hidden sm:inline">{t('card_add_cart')}</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              addItem(tariff);
              open();
            }}
            className="flex-1 btn-primary !h-12 !text-sm !px-4 active:scale-95 text-center"
          >
            {t('card_buy_now')}
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
              className="text-slate-500 hover:text-slate-700 text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
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
                  <span className="shrink-0 font-mono text-xs font-semibold text-slate-600 uppercase w-5">{code}</span>
                  <span className="truncate">{name}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
