'use client';

import { useState } from 'react';
import { formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { CheckoutModal } from '@/components/CheckoutModal';
import { useCart } from '@/components/CartProvider';
import { useTranslation } from '@/lib/i18n';
import type { TranslationKeys } from '@/lib/i18n';
import { displayCountryName, coverageLabel, getTariffOperators, isoName, cleanTariffName, getTariffSpecialFeatures } from '@/lib/tariff-display';
import { PlaneIcon, InfinityIcon, BoltIcon, GlobeIcon, TagIcon, NoPhoneIcon, ShieldIcon, InfoIcon } from '@/components/Icons';
import { PriceChart } from '@/components/PriceChart';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

const NETWORK_COLORS: Record<string, string> = {
  '5G':  'bg-violet-100 text-violet-700 border-violet-200',
  '4G':  'bg-blue-100 text-blue-700 border-blue-200',
  'LTE': 'bg-blue-100 text-blue-700 border-blue-200',
  '3G':  'bg-slate-100 text-slate-600 border-slate-200',
  '2G':  'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_INFO: Record<string, { icon: React.ReactNode; color: string; labelKey: TranslationKeys; descKey: TranslationKeys }> = {
  travel:        { icon: <PlaneIcon size={14} className="currentColor" />, color: 'bg-sky-50 text-sky-700 border-sky-200',            labelKey: 'badge_travel', descKey: 'tp_travel_desc' },
  unlimited_eco: { icon: <InfinityIcon size={14} className="currentColor" />, color: 'bg-emerald-50 text-emerald-700 border-emerald-200', labelKey: 'cfg_eco',      descKey: 'tp_eco_desc' },
  unlimited_pro: { icon: <BoltIcon size={14} className="currentColor" />, color: 'bg-violet-50 text-violet-700 border-violet-200',    labelKey: 'cfg_pro',      descKey: 'tp_pro_desc' },
};

interface Props {
  tariff:  Tariff;
  onClose: () => void;
}

export function TariffDetailModal({ tariff, onClose }: Props) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [added, setAdded] = useState(false);
  const [showCountryList, setShowCountryList] = useState(false);
  const { locale, t } = useTranslation();
  const { addItem, open } = useCart();

  const ops          = getTariffOperators(tariff.raw_data as Record<string, unknown> | null, 8);
  const typeInfo     = tariff.tariff_type ? TYPE_INFO[tariff.tariff_type] : null;
  const isTravel     = (tariff.tariff_type ?? 'travel') === 'travel';
  const isUnlimited  = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  const countryLabel = displayCountryName(tariff, locale);
  const coverage     = coverageLabel(tariff, locale);
  const features     = getTariffSpecialFeatures(tariff);
  const cleanedTitle = cleanTariffName(tariff.name);

  if (showCheckout) {
    return <CheckoutModal tariff={tariff} orderType="new_esim" onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 sm:p-6"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative flex flex-col w-full max-w-lg max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">

        {/* ── Top Gradient Accent Bar ── */}
        <div className={`h-2 w-full shrink-0 ${
          tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500' :
          tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500' :
          'bg-gradient-to-r from-brand-500 via-blue-500 to-indigo-600'
        }`} />

        {/* ── Fixed Header ── */}
        <div className="relative shrink-0 p-5 sm:p-6 border-b border-slate-100 bg-white">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors z-10 cursor-pointer"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>

          <div className="flex items-center gap-4">
            <CountryFlag countryCode={tariff.country_code} countryName={countryLabel} size={52} className="shrink-0 rounded-xl shadow-xs" />
            <div className="min-w-0 pr-6">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 truncate">{countryLabel}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                {coverage && (
                  <div className="relative inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                    <GlobeIcon size={12} className="text-slate-400 shrink-0" />
                    <span>{coverage}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowCountryList(!showCountryList);
                      }}
                      className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors focus:outline-none ml-0.5"
                      title={t('det_show_countries')}
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                    {showCountryList && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-2 z-30 w-64 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl scrollbar-thin cursor-default animate-in fade-in slide-in-from-top-1 duration-100"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                          <span className="text-xs font-extrabold text-slate-800">{t('det_coverage_list')}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowCountryList(false);
                            }}
                            className="text-slate-400 hover:text-slate-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                          >
                            ✕
                          </button>
                        </div>
                        <div className="grid grid-cols-1 gap-1">
                          {tariff.location_codes?.map((code) => {
                            const name = isoName(code, locale);
                            return (
                              <div key={code} className="flex items-center gap-2 text-xs text-slate-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors">
                                <CountryFlag countryCode={code} countryName={name} size={16} className="shrink-0 rounded-sm" />
                                <span className="shrink-0 font-mono text-[10px] font-semibold text-slate-400 uppercase w-5">{code}</span>
                                <span className="truncate">{name}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {typeInfo && (
                  <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold ${typeInfo.color}`}>
                    {typeInfo.icon} {t(typeInfo.labelKey)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500 leading-snug">{cleanedTitle}</p>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 scrollbar-thin">

          {/* ── Key Specs Hero Bar ── */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="rounded-2xl bg-brand-50/70 p-3 text-center border border-brand-100 shadow-2xs">
              <p className="text-lg sm:text-xl font-extrabold text-brand-700 leading-tight">
                {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
              </p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">{t('card_data')}</p>
              {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
                <p className="text-[9px] font-semibold text-brand-600 mt-0.5">{formatGb(tariff.data_gb)}/{t('cfg_day')}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3 text-center border border-slate-200/80 shadow-2xs">
              <p className="text-lg sm:text-xl font-extrabold text-slate-800 leading-tight">{tariff.validity_days}{t('card_days')}</p>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">{t('card_validity')}</p>
            </div>
            <div className="rounded-2xl bg-emerald-50/80 p-3 text-center border border-emerald-100 shadow-2xs">
              <Price eur={tariff.sale_price_eur} className="text-lg sm:text-xl font-extrabold text-emerald-700 leading-tight" />
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">{t('det_price')}</p>
            </div>
          </div>

          {/* ── Special Features Callout Section ── */}
          {features.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('det_special_features')}</p>
              <div className="space-y-2">
                {features.map((feat) => (
                  <div key={feat.id} className="rounded-2xl border border-indigo-200/80 bg-indigo-50/60 p-3.5 text-xs text-indigo-950 shadow-2xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-indigo-900 mb-1">
                      <span className="text-sm">{feat.icon}</span>
                      <span>{t(feat.titleKey as any)}</span>
                    </div>
                    <p className="leading-relaxed text-indigo-900/90 text-[11px]">{t(feat.descKey as any)}</p>
                    {feat.priceNoteKey && (
                      <p className="mt-2 text-[10px] text-indigo-900 font-semibold bg-indigo-100/80 rounded-xl p-2 leading-tight">
                        💡 {t(feat.priceNoteKey as any)}
                      </p>
                    )}
                    {feat.extra && (
                      <p className="mt-1 font-mono text-[10px] text-indigo-700 font-semibold">{feat.extra}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Promo Tag Label ── */}
          {tariff.label && (
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-800">
                <TagIcon size={14} className="text-amber-800" />
                {tariff.label}
              </span>
            </div>
          )}

          {/* ── Unlimited Speed Info Note ── */}
          {typeInfo && tariff.tariff_type !== 'travel' && (
            <div className={`rounded-2xl border px-4 py-3 text-xs ${typeInfo.color}`}>
              <p className="font-bold flex items-center gap-1.5">{typeInfo.icon} {t(typeInfo.descKey)}</p>
              <p className="mt-1 text-[11px] opacity-85 leading-relaxed">{t('det_renew_note')}</p>
            </div>
          )}

          {/* ── Price Chart ── */}
          <div>
            <PriceChart tariffId={tariff.id} currentPrice={Number(tariff.sale_price_eur)} />
          </div>

          {/* ── Covered Network Operators ── */}
          {ops.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('det_operators')}</p>
              <div className="flex flex-wrap gap-1.5">
                {ops.map((op, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5">
                    <span className="text-xs font-semibold text-slate-700">{op.name}</span>
                    {op.networkType && (
                      <span className={`rounded-md border px-1.5 py-0.5 text-[9px] font-extrabold ${
                        NETWORK_COLORS[op.networkType.toUpperCase()] ?? NETWORK_COLORS['3G']
                      }`}>
                        {op.networkType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Data-only & Reloadability Badges ── */}
          <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <NoPhoneIcon size={14} className="text-red-500 shrink-0" />
              <span className="font-semibold">{t('det_no_number')}</span>
            </div>
            <div className="flex items-center gap-2">
              {isTravel ? (
                <ShieldIcon size={14} className="text-emerald-600 shrink-0" />
              ) : (
                <InfoIcon size={14} className="text-slate-400 shrink-0" />
              )}
              <span className="font-semibold">{isTravel ? t('det_reloadable') : t('det_not_reloadable')}</span>
            </div>
          </div>

          {/* ── Activation & Setup Guide ── */}
          <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-4 space-y-2">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{t('det_activation')}</p>
            <ol className="space-y-1.5 text-xs text-slate-600 list-decimal list-inside leading-relaxed font-medium">
              <li>{t('det_act_1')}</li>
              <li dangerouslySetInnerHTML={{ __html: t('det_act_2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('det_act_3') }} />
              <li>{t('det_act_4')}</li>
              <li>{t('det_act_5')}</li>
            </ol>
          </div>
        </div>

        {/* ── Fixed Footer CTA Bar ── */}
        <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 bg-white shadow-md space-y-2">
          <div className="flex gap-2.5">
            <button
              onClick={() => { addItem(tariff); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border-2 border-brand-200 bg-brand-50 py-3 text-xs sm:text-sm font-extrabold text-brand-700 hover:bg-brand-100 active:scale-[0.98] transition-all cursor-pointer"
            >
              {added ? t('det_added') : t('det_add_cart')}
            </button>
            <button
              onClick={() => {
                addItem(tariff);
                open();
                onClose();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl bg-brand-600 py-3 text-xs sm:text-sm font-extrabold text-white hover:bg-brand-700 active:scale-[0.98] transition-all shadow-md cursor-pointer"
            >
              {t('det_buy_now')}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
