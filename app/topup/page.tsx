'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { formatGb } from '@/lib/utils';
import type { UnlimitedPriceTable } from '@/lib/pricing';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import { countryCodeToSlug } from '@/lib/destinations-shared';
import { SearchIcon, InfinityIcon, BoltIcon, ShieldIcon, TopUpIcon } from '@/components/Icons';
import { DaySlider, perDayEur } from '@/components/UnlimitedConfigurator';
import { useCart } from '@/components/CartProvider';
import { TopUpProgressBar } from '@/components/TopUpProgressBar';
import type { PublicTariff } from '@/lib/tariffs';

type Tariff = PublicTariff;

interface TopUpPackage extends Partial<PublicTariff> {
  id:             string;
  package_code:   string;
  name:           string;
  data_gb:        number | null;
  validity_days:  number;
  sale_price_eur: number;
  flag_emoji:     string | null;
  country_name:   string;
  country_code?:  string;
  description?:   string;
  tariff_type?:   'travel' | 'unlimited_eco' | 'unlimited_pro' | string;
  speed_kbps?:    number | null;
  is_unlimited?:  boolean;
  priceTable?:    UnlimitedPriceTable | null;
}

interface TopUpEligibility {
  allowed: boolean;
  reason: 'ok' | 'limit_reached' | 'not_supported';
  used: number;
  remaining: number;
  mode: 'data_and_validity' | 'validity_only' | 'none';
}

interface OrderInfo {
  id: string;
  tariff: PublicTariff;
}

export default function TopUpPage() {
  const { t, locale } = useTranslation();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const { addItem, open } = useCart();
  const [iccid,        setIccid]        = useState('');
  const [packages,     setPackages]     = useState<TopUpPackage[]>([]);
  const [eligibility,  setEligibility]  = useState<TopUpEligibility | null>(null);
  const [orderInfo,    setOrderInfo]    = useState<OrderInfo | null>(null);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [searched,     setSearched]     = useState(false);
  const [addedCode,    setAddedCode]    = useState<string | null>(null);

  // Unlimited Configurator state
  const [unlimitedDays, setUnlimitedDays]     = useState(7);
  const [selectedPkgCode, setSelectedPkgCode] = useState<string | null>(null);

  const doSearch = useCallback(async (code: string) => {
    const value = code.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setPackages([]);
    setEligibility(null);
    setOrderInfo(null);
    setSearched(false);
    setSelectedPkgCode(null);

    try {
      const res  = await fetch(`/api/topup/packages?iccid=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (data.eligibility) {
        setEligibility(data.eligibility);
      }
      if (data.orderInfo) {
        setOrderInfo(data.orderInfo);
      }

      if (!res.ok) {
        if (data.eligibility?.reason === 'limit_reached' || data.error === 'topup_error_limit_reached') {
          setSearched(true);
          return;
        }
        if (data.eligibility?.reason === 'not_supported' || data.error === 'topup_error_not_supported') {
          setSearched(true);
          return;
        }
        throw new Error(data.error ?? 'topup_error_general');
      }

      const pkgs: TopUpPackage[] = data.packages ?? [];
      setPackages(pkgs);
      setSearched(true);

      // Auto-select first unlimited package if available
      const unlim = pkgs.find(p => p.is_unlimited || p.tariff_type?.startsWith('unlimited') || p.data_gb === 0);
      if (unlim) {
        setSelectedPkgCode(unlim.package_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'topup_error_general');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await doSearch(iccid);
  }

  // Prefill the ICCID from the dashboard "Aufladen" link (?iccid=…) and auto-search.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('iccid');
    if (param) {
      setIccid(param);
      doSearch(param);
    }
  }, [doSearch]);

  const originCountrySlug = useMemo(() => {
    const code = orderInfo?.tariff?.country_code;
    if (!code) return null;
    return countryCodeToSlug(code) || code.toLowerCase();
  }, [orderInfo]);

  const originCountryUrl = originCountrySlug
    ? `${prefix}/esim/${originCountrySlug}`
    : `${prefix}/tariffs`;

  // Separate packages into Unlimited and Travel
  const { unlimitedPackages, travelPackages } = useMemo(() => {
    const unlim: TopUpPackage[] = [];
    const travel: TopUpPackage[] = [];

    packages.forEach((p) => {
      if (p.is_unlimited || p.tariff_type?.startsWith('unlimited') || p.data_gb === 0) {
        unlim.push(p);
      } else {
        travel.push(p);
      }
    });

    return { unlimitedPackages: unlim, travelPackages: travel };
  }, [packages]);

  // Active unlimited package
  const activeUnlimitedPkg = useMemo(() => {
    if (unlimitedPackages.length === 0) return null;
    return (
      unlimitedPackages.find(p => p.package_code === selectedPkgCode) ||
      unlimitedPackages[0]
    );
  }, [unlimitedPackages, selectedPkgCode]);

  // Price calculations from precomputed priceTable
  const currentPriceTable = activeUnlimitedPkg?.priceTable;
  const dayInfo = currentPriceTable?.days?.[unlimitedDays];

  const unlimitedPerDay = currentPriceTable?.frontPricePerDay ?? (activeUnlimitedPkg ? perDayEur({
    sale_price_eur: activeUnlimitedPkg.sale_price_eur,
    validity_days:  activeUnlimitedPkg.validity_days || 1,
  }) : 0);
  const frontPricePerDay = unlimitedPerDay;

  const unlimitedTotalPrice = dayInfo?.priceEur ?? activeUnlimitedPkg?.sale_price_eur ?? 0;
  const unlimitedBeforeDiscount = dayInfo?.subtotalEur ?? null;
  const unlimitedDiscount = dayInfo?.discountPct ?? 0;

  const betterDealDays = dayInfo?.betterDealDays;
  const betterDealPriceEur = dayInfo?.betterDealPriceEur;
  const compareDays = dayInfo?.compareDays ?? unlimitedDays;

  const isLimitReached = Boolean(eligibility?.reason === 'limit_reached' || (eligibility && eligibility.used >= 9));
  const isNotSupported = Boolean(eligibility?.reason === 'not_supported');
  const isValidityOnly = Boolean(eligibility?.mode === 'validity_only');

  const handleOpenUnlimitedCheckout = () => {
    if (!activeUnlimitedPkg || isLimitReached || isNotSupported) return;
    const synthetic: Partial<Tariff> = {
      ...activeUnlimitedPkg,
      id:             activeUnlimitedPkg.id,
      package_code:   activeUnlimitedPkg.package_code,
      name:           activeUnlimitedPkg.name,
      country_name:   activeUnlimitedPkg.country_name,
      country_code:   activeUnlimitedPkg.country_code || 'XX',
      flag_emoji:     activeUnlimitedPkg.flag_emoji || '🌐',
      validity_days:  unlimitedDays,
      data_gb:        activeUnlimitedPkg.data_gb,
      sale_price_eur: unlimitedTotalPrice,
      tariff_type:    activeUnlimitedPkg.tariff_type || 'unlimited_eco',
      speed_kbps:     activeUnlimitedPkg.speed_kbps,
    };
    addItem(synthetic as Tariff, 1, { periodDays: unlimitedDays, topUpIccid: iccid });
    open();
  };

  const handleOpenTravelCheckout = (pkg: TopUpPackage) => {
    if (isLimitReached || isNotSupported) return;
    addItem(pkg as unknown as Tariff, 1, { periodDays: pkg.validity_days, topUpIccid: iccid });
    open();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="flex justify-center mb-3">
          <TopUpIcon size={48} />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t('topup_page_title')}</h1>
        <p className="mt-2 text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
          {t('topup_page_sub')}
        </p>
      </div>

      {/* ICCID form */}
      <form onSubmit={handleSearch} className="mb-8">
        <label htmlFor="iccid" className="block mb-2 text-xs font-extrabold uppercase tracking-wider text-slate-600">
          {t('topup_iccid_label')}
        </label>
        <div className="flex gap-3 items-center">
          <input
            id="iccid"
            type="text"
            inputMode="numeric"
            aria-invalid={!!error}
            aria-describedby={error ? 'iccid-error' : 'iccid-hint'}
            placeholder={t('topup_iccid_ph')}
            value={iccid}
            onChange={(e) => setIccid(e.target.value)}
            className="flex-1 h-12 rounded-xl border border-slate-300 px-4 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all bg-white shadow-2xs"
          />
          <button
            type="submit"
            disabled={loading || !iccid.trim()}
            className="btn-primary shadow-sm active:scale-[0.98]"
          >
            {loading ? '…' : t('topup_search')}
          </button>
        </div>
        <p id="iccid-hint" className="mt-2 text-xs text-slate-400">
          {t('topup_iccid_hint')}
        </p>
      </form>

      {/* Error Banner */}
      {error && !eligibility && (
        <div id="iccid-error" role="alert" className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          {t(error as any) || error}
        </div>
      )}

      {/* Eligibility status counter / progressbar (when ICCID searched) */}
      {eligibility && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <TopUpProgressBar used={eligibility.used} />
        </div>
      )}

      {/* 9/9 Limit Reached Banner & Action */}
      {isLimitReached && (
        <div className="mb-8 rounded-2xl bg-amber-50 border border-amber-300/80 p-5 shadow-xs space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden="true">⚠️</span>
            <div className="space-y-1">
              <h3 className="text-sm font-black text-amber-950">
                {t('topup_limit_used', { used: 9 })}
              </h3>
              <p className="text-xs text-amber-900 leading-relaxed font-medium">
                {t('topup_limit_reached_box')}
              </p>
            </div>
          </div>
          <div className="pt-1">
            <Link
              href={originCountryUrl}
              className="btn-primary min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center font-bold px-6 py-2.5 rounded-xl shadow-sm text-sm text-center"
            >
              {t('topup_order_new_esim')}
            </Link>
          </div>
        </div>
      )}

      {/* Non-Reloadable / Single-Use Notice */}
      {isNotSupported && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs text-center space-y-3">
          <div className="inline-flex items-center gap-3">
            <span className="rounded-full bg-slate-100 border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600">
              {t('topup_not_supported_badge')}
            </span>
            <Link
              href={originCountryUrl}
              className="text-xs font-bold text-brand-600 hover:text-brand-800 underline underline-offset-2"
            >
              {t('topup_buy_new_esim')} →
            </Link>
          </div>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t('topup_error_not_supported')}
          </p>
        </div>
      )}

      {/* No Results */}
      {searched && !isLimitReached && !isNotSupported && packages.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400 bg-white">
          <div className="flex justify-center mb-2">
            <SearchIcon size={32} className="text-slate-300" />
          </div>
          <p className="font-bold text-slate-700">{t('topup_no_results')}</p>
          <p className="text-xs text-slate-400 mt-1">{t('topup_no_results_sub')}</p>
        </div>
      )}

      {/* Results Section */}
      {packages.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h2 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              <span>{t('topup_results_for')}</span>
              <span className="font-mono text-xs text-brand-700 bg-brand-50 border border-brand-200 px-2.5 py-0.5 rounded-lg">
                {iccid}
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {isValidityOnly && (
                <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                  {t('topup_validity_only_badge')}
                </span>
              )}
              <span className="text-xs font-semibold text-slate-400">
                {packages.length} {packages.length === 1 ? 'Tarif gefunden' : 'Tarife verfügbar'}
              </span>
            </div>
          </div>

          {/* ── UNLIMITED TARIFF EXTENSION SLIDER STUDIO ── */}
          {unlimitedPackages.length > 0 && activeUnlimitedPkg && (
            <div className="rounded-3xl border-2 border-brand-200 bg-white p-6 shadow-lg relative overflow-hidden space-y-5">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-500" />

              {/* Destination & Plan Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{activeUnlimitedPkg.flag_emoji ?? '🌐'}</span>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 leading-tight">
                      {activeUnlimitedPkg.country_name || activeUnlimitedPkg.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5 font-medium">
                      {activeUnlimitedPkg.name}
                    </p>
                  </div>
                </div>

                <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 border border-indigo-200 px-3 py-1 text-xs font-bold text-indigo-700 shrink-0">
                  <InfinityIcon size={14} className="text-indigo-600" />
                  <span>{isValidityOnly ? t('topup_validity_only_badge') : t('topup_data_validity_badge')}</span>
                </span>
              </div>

              {/* Daily Highspeed Tier Selection (if multiple) */}
              {unlimitedPackages.length > 1 && (
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500 block">
                    Tägliches Highspeed-Volumen wählen
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {unlimitedPackages.map((p) => (
                      <button
                        key={p.package_code}
                        type="button"
                        onClick={() => setSelectedPkgCode(p.package_code)}
                        className={`rounded-xl border px-3 py-2 text-xs font-extrabold transition-all cursor-pointer ${
                          activeUnlimitedPkg.package_code === p.package_code
                            ? 'border-brand-600 bg-brand-600 text-white shadow-xs'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                        }`}
                      >
                        {p.data_gb && p.data_gb > 0 ? `${formatGb(p.data_gb)} / Tag` : 'Unlimited'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 24h Reset & FUP Info Banner */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3.5 space-y-1 text-xs text-slate-600">
                <div className="flex items-center gap-2 font-bold text-slate-800">
                  <BoltIcon size={16} className="text-brand-600 shrink-0" />
                  <span>
                    {activeUnlimitedPkg.data_gb && activeUnlimitedPkg.data_gb > 0
                      ? `${formatGb(activeUnlimitedPkg.data_gb)} Highspeed-Volumen pro Tag`
                      : 'Unbegrenztes Highspeed-Volumen'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal pl-6">
                  🔄 Das Highspeed-Guthaben erneuert sich alle 24 Stunden automatisch. Danach unbegrenzt mit bis zu{' '}
                  {activeUnlimitedPkg.speed_kbps
                    ? activeUnlimitedPkg.speed_kbps >= 1000
                      ? `${(activeUnlimitedPkg.speed_kbps / 1000).toFixed(0)} Mbps`
                      : `${activeUnlimitedPkg.speed_kbps} kbps`
                    : activeUnlimitedPkg.tariff_type === 'unlimited_pro' ? '1 Mbps' : '512 kbps'}{' '}
                  weitersurfen (kein Datenstopp).
                </p>
              </div>

              {/* Interactive Day Slider with Direct Numeric Input */}
              <div className="pt-2">
                <DaySlider
                  days={unlimitedDays}
                  onChange={setUnlimitedDays}
                  label="Laufzeit-Verlängerung (Tage)"
                  tiers={currentPriceTable?.tiers}
                  currentDiscountPct={unlimitedDiscount}
                />
              </div>

              {/* Better Deal Tip */}
              {betterDealDays && betterDealPriceEur !== undefined && (
                <button
                  type="button"
                  onClick={() => setUnlimitedDays(betterDealDays)}
                  className="w-full text-left rounded-xl bg-amber-50 border border-amber-200 p-2.5 text-xs text-amber-900 hover:bg-amber-100/80 transition-all cursor-pointer flex items-center justify-between group mt-2"
                >
                  <span className="font-medium">
                    💡 {t('cfg_duration_better_deal', {
                      dealDays: betterDealDays,
                      dealPrice: `${betterDealPriceEur.toFixed(2)} €`,
                      compareDays,
                    }) || `Tipp: ${betterDealDays} Tage kosten nur ${betterDealPriceEur.toFixed(2)} € (günstiger als ${compareDays} Tage)`}
                  </span>
                  <span className="text-[11px] font-bold text-amber-700 underline group-hover:text-amber-900 shrink-0 ml-2">
                    {betterDealDays}d wählen →
                  </span>
                </button>
              )}

              {/* Live Pricing & Action Area */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Gesamtpreis Verlängerung
                    </span>
                    {unlimitedDiscount > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-xs font-bold text-emerald-700">
                        Staffelrabatt −{unlimitedDiscount}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      <Price eur={unlimitedTotalPrice} />
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                    ({(unlimitedTotalPrice / unlimitedDays).toFixed(2)} € / Tag)
                  </span>
                  {unlimitedBeforeDiscount !== null && frontPricePerDay > 0 && (
                    <span className="text-xs text-slate-400 block mt-1">
                      {unlimitedDays} Tage × {frontPricePerDay.toFixed(2)} € = {unlimitedBeforeDiscount.toFixed(2)} €
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isLimitReached}
                    aria-disabled={isLimitReached}
                    onClick={() => {
                      if (!activeUnlimitedPkg || isLimitReached) return;
                      const synthetic: Partial<Tariff> = {
                        ...activeUnlimitedPkg,
                        id:             activeUnlimitedPkg.id,
                        package_code:   activeUnlimitedPkg.package_code,
                        name:           activeUnlimitedPkg.name,
                        country_name:   activeUnlimitedPkg.country_name,
                        country_code:   activeUnlimitedPkg.country_code || 'XX',
                        flag_emoji:     activeUnlimitedPkg.flag_emoji || '🌐',
                        validity_days:  unlimitedDays,
                        data_gb:        activeUnlimitedPkg.data_gb,
                        sale_price_eur: unlimitedTotalPrice,
                        tariff_type:    activeUnlimitedPkg.tariff_type || 'unlimited_eco',
                        speed_kbps:     activeUnlimitedPkg.speed_kbps,
                      };
                      addItem(synthetic as Tariff, 1, { periodDays: unlimitedDays, topUpIccid: iccid });
                      setAddedCode('unlimited');
                      setTimeout(() => setAddedCode(null), 2000);
                    }}
                    className={`h-12 rounded-xl border-[1.5px] px-5 text-sm font-semibold shadow-xs transition-all ${
                      isLimitReached
                        ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 cursor-pointer active:scale-[0.98]'
                    }`}
                  >
                    {isLimitReached ? t('topup_btn') : (addedCode === 'unlimited' ? '✓ Im Warenkorb' : '+ In den Warenkorb')}
                  </button>

                  <button
                    type="button"
                    disabled={isLimitReached}
                    aria-disabled={isLimitReached}
                    onClick={handleOpenUnlimitedCheckout}
                    className={`btn-primary shadow-md flex items-center gap-2 ${
                      isLimitReached ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : 'active:scale-[0.98]'
                    }`}
                  >
                    <span>eSIM um {unlimitedDays} {unlimitedDays === 1 ? 'Tag' : 'Tage'} verlängern</span>
                    <span>·</span>
                    <Price eur={unlimitedTotalPrice} />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* ── TRAVEL FIXED-VOLUME TOP-UP PACKAGES (only if not validity_only) ── */}
          {!isValidityOnly && travelPackages.length > 0 && (
            <div className="space-y-3">
              {unlimitedPackages.length > 0 && (
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 pt-2">
                  Oder Travel Datenpakete (Festes Volumen)
                </h3>
              )}
              <div className="space-y-3">
                {travelPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 transition-all shadow-2xs hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{pkg.flag_emoji ?? '🌐'}</span>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-extrabold text-slate-800 text-sm">{pkg.name}</p>
                          <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                            🔄 Data Reloadable
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {formatGb(pkg.data_gb)} · {pkg.validity_days} {t('cfg_days')} · Selbes Gebiet
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Price eur={pkg.sale_price_eur} className="text-lg font-bold text-slate-900" />
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isLimitReached}
                          aria-disabled={isLimitReached}
                          onClick={() => {
                            if (isLimitReached) return;
                            addItem(pkg as unknown as Tariff, 1, { periodDays: pkg.validity_days, topUpIccid: iccid });
                            setAddedCode(pkg.package_code);
                            setTimeout(() => setAddedCode(null), 2000);
                          }}
                          className={`h-10 rounded-xl border-[1.5px] px-3.5 text-xs font-semibold transition-all ${
                            isLimitReached
                              ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 hover:border-brand-300 cursor-pointer active:scale-[0.98]'
                          }`}
                        >
                          {addedCode === pkg.package_code ? '✓' : '+ Warenkorb'}
                        </button>
                        <button
                          disabled={isLimitReached}
                          aria-disabled={isLimitReached}
                          onClick={() => handleOpenTravelCheckout(pkg)}
                          className={`btn-primary !h-10 !px-4 !text-xs shadow-xs ${
                            isLimitReached ? 'opacity-50 cursor-not-allowed bg-slate-400 hover:bg-slate-400' : 'active:scale-[0.98]'
                          }`}
                        >
                          {t('topup_btn')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reloadability Guarantee Banner */}
          <div className="rounded-2xl bg-brand-50/50 border border-brand-200/60 p-4 flex items-center gap-3 text-xs text-brand-900 font-medium">
            <ShieldIcon size={20} className="text-brand-600 shrink-0" />
            <span>
              Alle Verlängerungen und Aufladungen werden ohne erneuten QR-Code Scan direkt auf deiner bestehenden eSIM aktiviert.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
