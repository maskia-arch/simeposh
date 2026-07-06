'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { CheckoutModal } from '@/components/CheckoutModal';
import { useCart } from '@/components/CartProvider';
import { useTranslation } from '@/lib/i18n';
import type { TranslationKeys } from '@/lib/i18n';
import { displayCountryName, coverageLabel, getTariffOperators, isoName } from '@/lib/tariff-display';
import { PlaneIcon, InfinityIcon, BoltIcon, GlobeIcon, TagIcon, NoPhoneIcon, ShieldIcon, InfoIcon, NetworkIcon } from '@/components/Icons';

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

export default function TariffDetailPageClient({ tariff }: { tariff: Tariff }) {
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
    return <CheckoutModal tariff={tariff} orderType="new_esim" onClose={() => setShowCheckout(false)} />;
  }

  return (
    <div className="relative min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Link href="/" className="hover:text-brand-600 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/tariffs" className="hover:text-brand-600 transition-colors">eSIM Tariffs</Link>
          <span>/</span>
          <span className="text-slate-600 font-bold">{countryLabel}</span>
        </nav>

        {/* Two-Column Grid */}
        <div className="grid gap-8 lg:grid-cols-3 items-start">
          
          {/* Left Column: Product Info & Carrier specs */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Header Card */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-8 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <CountryFlag countryCode={tariff.country_code} countryName={countryLabel} size={64} className="shadow-sm rounded-lg" />
                  <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{countryLabel}</h1>
                    {coverage && (
                      <div className="relative flex items-center gap-1.5 text-sm text-slate-400 mt-1">
                        <GlobeIcon size={14} className="text-slate-400 animate-pulse" />
                        <span>{coverage}</span>
                        <button
                          type="button"
                          onClick={() => setShowCountryList(!showCountryList)}
                          className="inline-flex items-center justify-center rounded-full p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus:outline-none"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </button>

                        {showCountryList && (
                          <div className="absolute left-0 top-full mt-2 z-30 w-64 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl scrollbar-thin cursor-default animate-in fade-in slide-in-from-top-1 duration-100">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                              <span className="text-xs font-extrabold text-slate-800">{t('det_coverage_list')}</span>
                              <button
                                type="button"
                                onClick={() => setShowCountryList(false)}
                                className="text-slate-400 hover:text-slate-600 text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="grid grid-cols-1 gap-1">
                              {tariff.location_codes?.map((code) => {
                                const name = isoName(code, locale);
                                return (
                                  <div key={code} className="flex items-center gap-2 text-xs text-slate-600 hover:bg-slate-50 py-1 px-1.5 rounded-lg transition-colors animate-in fade-in duration-75">
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
                  </div>
                </div>

                {typeInfo && (
                  <div>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${typeInfo.color}`}>
                      {typeInfo.icon} {t(typeInfo.labelKey)}
                    </span>
                  </div>
                )}
              </div>

              <div className="mt-6 border-t border-slate-100 pt-6">
                <p className="text-lg font-bold text-slate-800 mb-2">{tariff.name}</p>
                {tariff.description && (
                  <p className="text-sm text-slate-500 leading-relaxed">{tariff.description}</p>
                )}
                {tariff.label && (
                  <div className="mt-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-sm font-semibold text-amber-800">
                      <TagIcon size={14} className="text-amber-800" />
                      {tariff.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Carrier specs / operators */}
            {ops.length > 0 && (
              <div className="rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-8 shadow-sm">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">{t('det_operators')}</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {ops.map((op, i) => (
                    <div key={i} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <div className="bg-brand-50 p-2 rounded-xl text-brand-600">
                          <NetworkIcon size={18} />
                        </div>
                        <span className="font-semibold text-slate-700">{op.name}</span>
                      </div>
                      {op.networkType && (
                        <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${
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

            {/* Activation Guide */}
            <div className="rounded-3xl border border-slate-200/80 bg-white/70 backdrop-blur-md p-8 shadow-sm">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">{t('det_activation')}</h3>
              <ol className="space-y-3 text-sm text-slate-600 list-decimal list-inside">
                <li className="leading-relaxed"><strong className="text-slate-800">{t('det_act_1')}</strong></li>
                <li className="leading-relaxed" dangerouslySetInnerHTML={{ __html: t('det_act_2') }} />
                <li className="leading-relaxed" dangerouslySetInnerHTML={{ __html: t('det_act_3') }} />
                <li className="leading-relaxed"><strong className="text-slate-800">{t('det_act_4')}</strong></li>
                <li className="leading-relaxed">{t('det_act_5')}</li>
              </ol>
            </div>
          </div>

          {/* Right Column: Checkout Pricing Widget */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-md space-y-6 lg:sticky lg:top-8">
            <h2 className="text-xl font-extrabold text-slate-900 border-b border-slate-100 pb-4">Tariff Details</h2>

            {/* Specs Summary Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-brand-50 p-4 border border-brand-100 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-brand-700 leading-tight">
                  {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{t('card_data')}</p>
                {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
                  <p className="text-[10px] font-semibold text-brand-500 mt-0.5">{formatGb(tariff.data_gb)}/{t('cfg_day')}</p>
                )}
              </div>
              
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200/60 text-center shadow-sm">
                <p className="text-2xl font-extrabold text-slate-700 leading-tight">
                  {tariff.validity_days}
                </p>
                <p className="text-xs font-medium text-slate-500 mt-1">{t('card_validity')} ({t('card_days')})</p>
              </div>
            </div>

            {/* Price section */}
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200/60 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 font-semibold uppercase">{t('det_price')}</p>
                <p className="text-xs text-slate-400 mt-0.5">~ {perDayEur(tariff).toFixed(2)}€ / Tag</p>
              </div>
              <Price eur={tariff.sale_price_eur} className="text-3xl font-black text-slate-900" />
            </div>

            {/* Unlimited notes */}
            {typeInfo && tariff.tariff_type !== 'travel' && (
              <div className={`rounded-2xl border px-4 py-3 text-xs ${typeInfo.color} space-y-1 shadow-sm`}>
                <p className="font-bold flex items-center gap-1">
                  {typeInfo.icon} {t(typeInfo.descKey)}
                </p>
                <p className="opacity-80">{t('det_renew_note')}</p>
              </div>
            )}

            {/* Warnings / Badges */}
            <div className="space-y-3 pt-2 text-xs text-slate-500">
              <div className="flex items-center gap-2.5">
                <NoPhoneIcon size={16} className="text-red-500 shrink-0" />
                <span>{t('det_no_number')}</span>
              </div>
              <div className="flex items-center gap-2.5">
                {isTravel ? (
                  <ShieldIcon size={16} className="text-emerald-500 shrink-0" />
                ) : (
                  <InfoIcon size={16} className="text-slate-400 shrink-0" />
                )}
                <span>{isTravel ? t('det_reloadable') : t('det_not_reloadable')}</span>
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <button
                onClick={() => { addItem(tariff); setAdded(true); setTimeout(() => setAdded(false), 1500); }}
                className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-200 bg-brand-50 py-3.5 text-base font-bold text-brand-700 hover:bg-brand-100 active:scale-[0.98] transition-all cursor-pointer"
              >
                {added ? t('det_added') : t('det_add_cart')}
              </button>
              
              <button
                onClick={() => setShowCheckout(true)}
                className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 active:scale-[0.98] transition-all shadow-md hover:shadow-lg cursor-pointer"
              >
                {t('det_buy_now')}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}

function perDayEur(t: Tariff): number {
  return t.sale_price_eur / (t.validity_days || 1);
}
