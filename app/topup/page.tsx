'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckoutModal } from '@/components/CheckoutModal';
import { formatGb, roundToX9, getDiscountPct } from '@/lib/utils';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import type { Database } from '@/lib/supabase/types';
import { NetworkIcon, SearchIcon, InfinityIcon, BoltIcon, ShieldIcon, TopUpIcon } from '@/components/Icons';
import { DaySlider, computePrice, perDayEur } from '@/components/UnlimitedConfigurator';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface TopUpPackage {
  id:             string;
  package_code:   string;
  name:           string;
  data_gb:        number | null;
  validity_days:  number;
  sale_price_eur: number;
  ek_price_usd?:  number;
  flag_emoji:     string | null;
  country_name:   string;
  country_code?:  string;
  description?:   string;
  tariff_type?:   'travel' | 'unlimited_eco' | 'unlimited_pro';
  speed_kbps?:    number | null;
  is_unlimited?:  boolean;
  raw_data?:      Record<string, unknown>;
}

export default function TopUpPage() {
  const { t } = useTranslation();
  const [iccid,        setIccid]        = useState('');
  const [packages,     setPackages]     = useState<TopUpPackage[]>([]);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [searched,     setSearched]     = useState(false);
  const [selected,     setSelected]     = useState<Tariff | null>(null);
  const [checkoutDays, setCheckoutDays] = useState<number | undefined>(undefined);

  // Unlimited Configurator state
  const [unlimitedDays, setUnlimitedDays]   = useState(7);
  const [selectedPkgCode, setSelectedPkgCode] = useState<string | null>(null);

  const doSearch = useCallback(async (code: string) => {
    const value = code.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setPackages([]);
    setSearched(false);
    setSelectedPkgCode(null);

    try {
      const res  = await fetch(`/api/topup/packages?iccid=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Abrufen der Pakete');

      const pkgs: TopUpPackage[] = data.packages ?? [];
      setPackages(pkgs);
      setSearched(true);

      // Auto-select first unlimited package if available
      const unlim = pkgs.find(p => p.is_unlimited || p.tariff_type?.startsWith('unlimited') || p.data_gb === 0);
      if (unlim) {
        setSelectedPkgCode(unlim.package_code);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
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

  // Price calculations for active unlimited package
  const unlimitedPerDay = useMemo(() => {
    if (!activeUnlimitedPkg) return 0;
    return perDayEur({
      sale_price_eur: activeUnlimitedPkg.sale_price_eur,
      validity_days:  activeUnlimitedPkg.validity_days || 1,
    });
  }, [activeUnlimitedPkg]);

  const unlimitedTotalPrice = useMemo(() => {
    if (!unlimitedPerDay) return 0;
    return computePrice(unlimitedPerDay, unlimitedDays);
  }, [unlimitedPerDay, unlimitedDays]);

  const unlimitedBeforeDiscount = useMemo(() => {
    if (!unlimitedPerDay) return 0;
    return roundToX9(unlimitedPerDay * unlimitedDays);
  }, [unlimitedPerDay, unlimitedDays]);

  const unlimitedDiscount = getDiscountPct(unlimitedDays);

  const handleOpenUnlimitedCheckout = () => {
    if (!activeUnlimitedPkg) return;
    const synthetic: Partial<Tariff> = {
      ...activeUnlimitedPkg,
      id:             activeUnlimitedPkg.id,
      package_code:   activeUnlimitedPkg.package_code,
      name:           activeUnlimitedPkg.name,
      validity_days:  unlimitedDays,
      data_gb:        activeUnlimitedPkg.data_gb,
      sale_price_eur: unlimitedTotalPrice,
      tariff_type:    activeUnlimitedPkg.tariff_type || 'unlimited_eco',
    };
    setCheckoutDays(unlimitedDays);
    setSelected(synthetic as Tariff);
  };

  const handleOpenTravelCheckout = (pkg: TopUpPackage) => {
    setCheckoutDays(pkg.validity_days);
    setSelected(pkg as unknown as Tariff);
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
        <div className="flex gap-3">
          <input
            id="iccid"
            type="text"
            placeholder={t('topup_iccid_ph')}
            value={iccid}
            onChange={(e) => setIccid(e.target.value)}
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all bg-white shadow-2xs"
          />
          <button
            type="submit"
            disabled={loading || !iccid.trim()}
            className="rounded-2xl bg-brand-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-brand-700 disabled:opacity-60 transition-all shadow-sm active:scale-[0.98] cursor-pointer"
          >
            {loading ? '…' : t('topup_search')}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          {t('topup_iccid_hint')}
        </p>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-2xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
          {t(error as any)}
        </div>
      )}

      {/* No Results */}
      {searched && packages.length === 0 && !loading && (
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
            <span className="text-xs font-semibold text-slate-400">
              {packages.length} {packages.length === 1 ? 'Tarif gefunden' : 'Tarife verfügbar'}
            </span>
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

                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shrink-0">
                  <InfinityIcon size={14} className="text-emerald-600" />
                  <span>Unlimited Tarif</span>
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
                />
              </div>

              {/* Live Pricing & Action Area */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    Gesamtpreis Verlängerung
                  </span>
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-black text-slate-900 tracking-tight">
                      <Price eur={unlimitedTotalPrice} />
                    </p>
                    {unlimitedDiscount > 0 && (
                      <Price eur={unlimitedBeforeDiscount} className="text-xs text-slate-400 line-through" />
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                    ({(unlimitedTotalPrice / unlimitedDays).toFixed(2)} € / Tag)
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleOpenUnlimitedCheckout}
                  className="rounded-2xl bg-brand-600 px-6 py-3.5 text-sm font-black text-white hover:bg-brand-700 shadow-md active:scale-[0.98] transition-all cursor-pointer flex items-center gap-2"
                >
                  <span>eSIM um {unlimitedDays} {unlimitedDays === 1 ? 'Tag' : 'Tage'} verlängern</span>
                  <span>·</span>
                  <Price eur={unlimitedTotalPrice} />
                </button>
              </div>

            </div>
          )}

          {/* ── TRAVEL FIXED-VOLUME TOP-UP PACKAGES ── */}
          {travelPackages.length > 0 && (
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
                        <p className="font-extrabold text-slate-800 text-sm">{pkg.name}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">
                          {formatGb(pkg.data_gb)} · {pkg.validity_days} {t('cfg_days')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Price eur={pkg.sale_price_eur} className="text-lg font-bold text-slate-900" />
                      <button
                        onClick={() => handleOpenTravelCheckout(pkg)}
                        className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-extrabold text-white hover:bg-brand-700 transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      >
                        {t('topup_btn')}
                      </button>
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

      {/* Checkout modal */}
      {selected && (
        <CheckoutModal
          tariff={selected}
          orderType="top_up"
          topUpIccid={iccid}
          days={checkoutDays}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
