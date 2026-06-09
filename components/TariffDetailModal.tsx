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
import { displayCountryName, coverageLabel, getTariffOperators, isoName } from '@/lib/tariff-display';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

const NETWORK_COLORS: Record<string, string> = {
  '5G':  'bg-violet-100 text-violet-700 border-violet-200',
  '4G':  'bg-blue-100 text-blue-700 border-blue-200',
  'LTE': 'bg-blue-100 text-blue-700 border-blue-200',
  '3G':  'bg-slate-100 text-slate-600 border-slate-200',
  '2G':  'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_INFO: Record<string, { icon: string; color: string; labelKey: TranslationKeys; descKey: TranslationKeys }> = {
  travel:        { icon: '✈️', color: 'bg-sky-50 text-sky-700 border-sky-200',            labelKey: 'badge_travel', descKey: 'tp_travel_desc' },
  unlimited_eco: { icon: '♾️', color: 'bg-emerald-50 text-emerald-700 border-emerald-200', labelKey: 'cfg_eco',      descKey: 'tp_eco_desc' },
  unlimited_pro: { icon: '⚡', color: 'bg-violet-50 text-violet-700 border-violet-200',    labelKey: 'cfg_pro',      descKey: 'tp_pro_desc' },
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
  const { addItem } = useCart();

  const ops     = getTariffOperators(tariff.raw_data as Record<string, unknown> | null, 8);
  const typeInfo = tariff.tariff_type ? TYPE_INFO[tariff.tariff_type] : null;
  const isTravel = (tariff.tariff_type ?? 'travel') === 'travel';
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  const countryLabel = displayCountryName(tariff, locale);
  const coverage     = coverageLabel(tariff, locale);

  if (showCheckout) {
    return <CheckoutModal tariff={tariff} orderType="new_esim" onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* ── Top colour bar ── */}
        <div className={`h-1.5 w-full rounded-t-3xl ${
          tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
          tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
          'bg-gradient-to-r from-brand-500 to-brand-400'
        }`} />

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="p-6">

          {/* ── Country header ── */}
          <div className="mb-5 flex items-center gap-4">
            <CountryFlag countryCode={tariff.country_code} countryName={countryLabel} size={56} />
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">{countryLabel}</h2>
              {coverage && (
                <div className="relative inline-flex items-center gap-1.5 text-sm text-slate-400">
                  <span>🌍 {coverage}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowCountryList(!showCountryList);
                    }}
                    className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                    title={t('det_show_countries')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeInfo.color}`}>
                  {typeInfo.icon} {t(typeInfo.labelKey)}
                </span>
              )}
            </div>
          </div>

          {/* ── Plan name ── */}
          <p className="mb-4 text-sm text-slate-600 leading-relaxed">{tariff.name}</p>

          {/* ── Promo label ── */}
          {tariff.label && (
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-sm font-semibold text-amber-800">
                🏷️ {tariff.label}
              </span>
            </div>
          )}

          {/* ── Key specs grid ── */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-brand-50 p-3.5 text-center border border-brand-100">
              <p className="text-xl font-bold text-brand-700">
                {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t('card_data')}</p>
              {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
                <p className="text-[10px] text-brand-500 mt-0.5">{tariff.data_gb} {t('cfg_gb_per_day')}</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3.5 text-center border border-slate-200">
              <p className="text-xl font-bold text-slate-700">{tariff.validity_days}{t('card_days')}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('card_validity')}</p>
            </div>
            <div className="rounded-2xl bg-green-50 p-3.5 text-center border border-green-100">
              <Price eur={tariff.sale_price_eur} className="text-xl font-bold text-green-700" />
              <p className="text-xs text-slate-500 mt-0.5">{t('det_price')}</p>
            </div>
          </div>

          {/* ── Unlimited note ── */}
          {typeInfo && tariff.tariff_type !== 'travel' && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${typeInfo.color}`}>
              <p className="font-medium">{typeInfo.icon} {t(typeInfo.descKey)}</p>
              <p className="mt-1 text-xs opacity-80">{t('det_renew_note')}</p>
            </div>
          )}

          {/* ── Operators / network ── */}
          {ops.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('det_operators')}</p>
              <div className="flex flex-wrap gap-2">
                {ops.map((op, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{op.name}</span>
                    {op.networkType && (
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
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

          {/* ── Data-only note (no phone number) ── */}
          <div className="mb-3 flex items-center gap-2 text-sm text-slate-600">
            <span>📵</span>
            <span>{t('det_no_number')}</span>
          </div>

          {/* ── Reloadability (travel = reloadable, day-pass = not) ── */}
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-600">
            <span>{isTravel ? '✅' : 'ℹ️'}</span>
            <span>{isTravel ? t('det_reloadable') : t('det_not_reloadable')}</span>
          </div>

          {/* ── Activation guide ── */}
          <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">{t('det_activation')}</p>
            <ol className="space-y-1 text-xs text-slate-600 list-decimal list-inside">
              <li>{t('det_act_1')}</li>
              <li dangerouslySetInnerHTML={{ __html: t('det_act_2') }} />
              <li dangerouslySetInnerHTML={{ __html: t('det_act_3') }} />
              <li>{t('det_act_4')}</li>
              <li>{t('det_act_5')}</li>
            </ol>
          </div>

          {/* ── CTAs ── */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={() => { addItem(tariff); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border-2 border-brand-200 bg-brand-50 py-3.5 text-base font-bold text-brand-700 hover:bg-brand-100 active:scale-[0.98] transition-all"
            >
              {added ? t('det_added') : t('det_add_cart')}
            </button>
            <button
              onClick={() => setShowCheckout(true)}
              className="flex-1 rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg"
            >
              {t('det_buy_now')}
            </button>
          </div>
          <p className="mt-3 text-center text-sm text-slate-400">
            {t('det_price')}: <Price eur={tariff.sale_price_eur} className="font-semibold text-slate-700" />
          </p>
        </div>
      </div>
    </div>
  );
}
