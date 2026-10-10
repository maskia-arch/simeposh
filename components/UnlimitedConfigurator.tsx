'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { roundToX9, getDiscountPct, discountLabel, formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import type { PublicTariff } from '@/lib/tariffs';
import { CheckoutModal } from '@/components/CheckoutModal';
import { CountryFlag } from '@/components/CountryFlag';
import { aliasToCode, aliasToRegion } from '@/lib/i18n/countryAliases';
import { useTranslation } from '@/lib/i18n';
import { useCart } from '@/components/CartProvider';
import { getTariffSpecialFeatures, getTariffOperators, bestNetworkType } from '@/lib/tariff-display';
import { InfinityIcon, EcoIcon, BoltIcon, NetworkIcon, GiftIcon, InfoIcon, SearchIcon } from '@/components/Icons';

type Tariff = PublicTariff;
type TariffType = 'unlimited_eco' | 'unlimited_pro';

// ── helpers ──────────────────────────────────────────────────────────────────

export function perDayEur(t: { sale_price_eur: number; validity_days: number }): number {
  return t.sale_price_eur / (t.validity_days || 1);
}

export function computePrice(baseRate: number, days: number): number {
  const raw = baseRate * days * (1 - getDiscountPct(days));
  return roundToX9(raw);
}

// ── Day slider mapping ──────────────────────────────────────────────────────
export const DAY_MARKS = [1, 3, 7, 14, 30, 90, 180, 365];
export const SEG       = 100;
export const SLIDER_MAX = (DAY_MARKS.length - 1) * SEG;

export function rawToDays(raw: number): number {
  const seg  = Math.min(DAY_MARKS.length - 2, Math.max(0, Math.floor(raw / SEG)));
  const frac = (raw - seg * SEG) / SEG;
  return Math.round(DAY_MARKS[seg] + (DAY_MARKS[seg + 1] - DAY_MARKS[seg]) * frac);
}

export function daysToRaw(days: number): number {
  if (days <= DAY_MARKS[0]) return 0;
  if (days >= DAY_MARKS[DAY_MARKS.length - 1]) return SLIDER_MAX;
  for (let i = 0; i < DAY_MARKS.length - 1; i++) {
    if (days <= DAY_MARKS[i + 1]) {
      const frac = (days - DAY_MARKS[i]) / (DAY_MARKS[i + 1] - DAY_MARKS[i]);
      return Math.round((i + frac) * SEG);
    }
  }
  return SLIDER_MAX;
}

const POPULAR_DESTINATIONS = ['DE', 'EU', 'US', 'JP', 'TH', 'TR', 'CH', 'GB'];

// ── Compact DaySlider Component with Numeric Input Field ────────────────────

export function DaySlider({
  days,
  onChange,
  label,
}: {
  days: number;
  onChange: (d: number) => void;
  label?: string;
}) {
  const { t } = useTranslation();
  const { pct, nextAt, nextPct } = discountLabel(days);
  const lastIdx = DAY_MARKS.length - 1;
  const presets = [1, 3, 7, 14, 30, 90];

  const [inputValue, setInputValue] = useState<string>(String(days));

  useEffect(() => {
    setInputValue(String(days));
  }, [days]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    setInputValue(rawVal);
    const parsed = parseInt(rawVal, 10);
    if (!isNaN(parsed) && parsed >= 1) {
      const clamped = Math.min(365, Math.max(1, parsed));
      onChange(clamped);
    }
  };

  const handleInputBlur = () => {
    const parsed = parseInt(inputValue, 10);
    if (isNaN(parsed) || parsed < 1) {
      setInputValue(String(days));
      onChange(days);
    } else {
      const clamped = Math.min(365, Math.max(1, parsed));
      setInputValue(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
          {label ?? (t('cfg_step3_duration' as any) || '3. Laufzeit (Tage)')}
        </label>
        
        {/* Interactive Direct Numeric Input */}
        <div className="flex items-center gap-1 bg-brand-50 border border-brand-200 rounded-xl px-2.5 py-1 focus-within:ring-2 focus-within:ring-brand-400 focus-within:border-brand-500 transition-all shadow-2xs">
          <input
            type="number"
            min={1}
            max={365}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                (e.target as HTMLInputElement).blur();
              }
            }}
            aria-label={t('cfg_duration')}
            title="Tage manuell eingeben"
            className="w-10 text-center text-sm font-black text-brand-700 bg-transparent border-none outline-none p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text"
          />
          <span className="text-xs font-extrabold text-brand-700 select-none">
            {days === 1 ? t('cfg_day') : t('cfg_days')}
          </span>
        </div>
      </div>

      {/* Quick Day Presets */}
      <div role="radiogroup" aria-label={t('cfg_duration')} className="flex flex-wrap gap-1">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={days === p}
            onClick={() => onChange(p)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              days === p
                ? 'bg-brand-600 text-white shadow-xs ring-2 ring-brand-600 ring-offset-1'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p}d
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="pt-1">
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={1}
          value={daysToRaw(days)}
          onChange={(e) => onChange(rawToDays(Number(e.target.value)))}
          aria-label={t('cfg_duration')}
          className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-brand-600 cursor-pointer touch-none"
        />

        <div className="relative mt-1 h-3.5">
          {DAY_MARKS.map((m, i) => {
            const transform = i === 0 ? 'translateX(0)' : i === lastIdx ? 'translateX(-100%)' : 'translateX(-50%)';
            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                style={{ left: `${(i / lastIdx) * 100}%`, transform }}
                className={`absolute top-0 text-[10px] leading-none transition-colors hover:text-brand-600 ${
                  days === m ? 'text-brand-600 font-extrabold' : 'text-slate-400'
                }`}
              >
                {m}d
              </button>
            );
          })}
        </div>
      </div>

      {/* Discount Hint */}
      <div className="min-h-[18px]">
        {pct > 0 ? (
          <p className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1">
            <span>🎁 {t('cfg_disc_incl', { pct })}</span>
            {nextAt && <span className="text-emerald-600 font-normal"> · {t('cfg_disc_next', { days: nextAt, pct: nextPct })}</span>}
          </p>
        ) : nextAt ? (
          <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 inline-flex items-center gap-1">
            <span>💡 {t('cfg_disc_hint', { days: nextAt, pct: nextPct })}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── Main UnlimitedConfigurator Component ─────────────────────────────────────

interface Props {
  tariffs: Tariff[];
  initialQuery?: string;
  initialTariffType?: TariffType;
  onTariffTypeChange?: (type: TariffType) => void;
  initialCountryCode?: string;
  allDestinations?: Array<{ code: string; name: string; flag?: string | null; slug: string }>;
  isStandaloneRoute?: boolean;
}

export function UnlimitedConfigurator({
  tariffs,
  initialQuery = '',
  initialTariffType,
  onTariffTypeChange,
  initialCountryCode,
  allDestinations,
  isStandaloneRoute = false,
}: Props) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const changeCountryBtnRef = useRef<HTMLButtonElement>(null);

  const [countrySearch, setCountrySearch]     = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(initialCountryCode ?? 'DE');
  const [isChangingCountry, setIsChangingCountry] = useState(false);
  const [tariffType, setTariffType]           = useState<TariffType>(initialTariffType ?? 'unlimited_eco');

  useEffect(() => {
    if (initialCountryCode) {
      setSelectedCountry(initialCountryCode);
    }
  }, [initialCountryCode]);

  useEffect(() => {
    if (initialTariffType) {
      setTariffType(initialTariffType);
    }
  }, [initialTariffType]);

  // Focus search input when country changer opens
  useEffect(() => {
    if (isChangingCountry) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isChangingCountry]);

  // Escape listener for country selector panel
  useEffect(() => {
    if (!isChangingCountry) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsChangingCountry(false);
        changeCountryBtnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isChangingCountry]);

  const [selectedGb, setSelectedGb]           = useState<number | null>(null);
  const [days, setDays]                       = useState(7);
  const [checkoutTariff, setCheckoutTariff]   = useState<Tariff | null>(null);
  const [added, setAdded]                     = useState(false);
  const { addItem, open }                     = useCart();
  const { t, locale }                         = useTranslation();

  // ── Step 1: Extract available countries ──────────────────────────────────
  type CountryEntry = {
    name:   string;
    flag:   string;
    code:   string;
    slug?:  string;
    covers: Set<string>;
  };

  const countries = useMemo(() => {
    if (allDestinations && allDestinations.length > 0) {
      return allDestinations.map((d) => ({
        name:   d.name,
        flag:   d.flag ?? '',
        code:   d.code,
        slug:   d.slug,
        covers: new Set<string>([d.code.toUpperCase()]),
      })).sort((a, b) => a.name.localeCompare(b.name));
    }
    const map = new Map<string, CountryEntry>();
    tariffs.forEach((t) => {
      let entry = map.get(t.country_code);
      if (!entry) {
        entry = {
          name:   t.country_name,
          flag:   t.flag_emoji ?? '',
          code:   t.country_code,
          slug:   t.slug,
          covers: new Set<string>(),
        };
        map.set(t.country_code, entry);
      }
      const locs = t.location_codes ?? [t.country_code];
      for (const l of locs) entry.covers.add(l.toUpperCase());
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tariffs, allDestinations]);

  const handleSelectCountry = (code: string) => {
    if (isStandaloneRoute) {
      const match = countries.find((c) => c.code === code);
      const slug = match?.slug || code.toLowerCase();
      const isDe = locale === 'de';
      router.push(`${isDe ? '' : '/en'}/unlimited/${slug}`);
      setIsChangingCountry(false);
      return;
    }
    setSelectedCountry(code);
    setCountrySearch('');
    setIsChangingCountry(false);
    changeCountryBtnRef.current?.focus();
  };

  useEffect(() => {
    if (countries.length > 0 && (!selectedCountry || !countries.some(c => c.code === selectedCountry))) {
      setSelectedCountry(countries[0].code);
    }
  }, [countries, selectedCountry]);

  // Search filter
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q  = countrySearch.trim().toLowerCase();
    const rc = aliasToCode(q);
    const rr = aliasToRegion(q);

    const scored: Array<{ c: CountryEntry; score: number }> = [];
    for (const c of countries) {
      const code = c.code.toLowerCase();
      const name = c.name.toLowerCase();
      let score = 0;

      if (rc && code === rc.toLowerCase())      score = 100;
      else if (code === q)                      score = 100;
      else if (name === q)                      score = 95;
      else if (rr && code === rr.toLowerCase()) score = 90;
      else if (name.startsWith(q))              score = 80;
      else if (name.includes(q))                score = 70;
      else if (rc && c.covers.has(rc.toUpperCase())) score = 50;
      else if (code.includes(q))                score = 20;

      if (score > 0) scored.push({ c, score });
    }

    scored.sort((a, b) => (b.score - a.score) || a.c.name.localeCompare(b.c.name));
    return scored.map((s) => s.c);
  }, [countries, countrySearch]);

  useEffect(() => {
    const query = (initialQuery ?? '').trim();
    if (!query) return;
    const qLow = query.toLowerCase();
    const rc = aliasToCode(qLow);
    const rr = aliasToRegion(qLow);
    const match = countries.find(
      (c) =>
        (rc && c.code.toLowerCase() === rc.toLowerCase()) ||
        (rr && c.code.toLowerCase() === rr.toLowerCase()) ||
        c.code.toLowerCase() === qLow ||
        c.name.toLowerCase().includes(qLow)
    );
    if (match) {
      setSelectedCountry(match.code);
      setIsChangingCountry(false);
    }
  }, [initialQuery, countries]);

  // ── Step 2: Available speed tiers ─────────────────────────────────────────
  const availableSpeedTypes = useMemo(() => {
    if (!selectedCountry) return [];
    const countryTariffs = tariffs.filter((t) => t.country_code === selectedCountry);
    const hasEco = countryTariffs.some((t) => t.tariff_type === 'unlimited_eco');
    const hasPro = countryTariffs.some((t) => t.tariff_type === 'unlimited_pro');
    const types: TariffType[] = [];
    if (hasEco) types.push('unlimited_eco');
    if (hasPro) types.push('unlimited_pro');
    return types;
  }, [tariffs, selectedCountry]);

  useEffect(() => {
    if (availableSpeedTypes.length > 0 && !availableSpeedTypes.includes(tariffType)) {
      setTariffType(availableSpeedTypes[0]);
    }
  }, [availableSpeedTypes, tariffType]);

  // ── Step 3: Available GB options ──────────────────────────────────────────
  const availablePackages = useMemo(() => {
    if (!selectedCountry) return [];
    return tariffs.filter(
      (t) => t.country_code === selectedCountry && t.tariff_type === tariffType
    );
  }, [tariffs, selectedCountry, tariffType]);

  const gbOptions = useMemo(() => {
    const set = new Set<number>();
    availablePackages.forEach((t) => {
      if (t.data_gb !== null && Number(t.data_gb) > 0) {
        set.add(Number(t.data_gb));
      }
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [availablePackages]);

  useEffect(() => {
    if (gbOptions.length > 0 && (selectedGb === null || !gbOptions.includes(selectedGb))) {
      setSelectedGb(gbOptions[0]);
    }
  }, [gbOptions, selectedGb]);

  // ── Step 4: Price & supplier product resolution ───────────────────────────
  const bestPackage = useMemo<Tariff | null>(() => {
    if (selectedGb === null || availablePackages.length === 0) return null;
    const matching = availablePackages.filter((t) => Number(t.data_gb) === selectedGb);
    if (matching.length === 0) return availablePackages[0];
    return matching.reduce((best, t) => (perDayEur(t) < perDayEur(best) ? t : best));
  }, [availablePackages, selectedGb]);

  const bestPerDay = useMemo(() => {
    return bestPackage ? perDayEur(bestPackage) : null;
  }, [bestPackage]);

  const finalPrice = useMemo(() => {
    if (!bestPerDay) return null;
    return computePrice(bestPerDay, days);
  }, [bestPerDay, days]);

  const priceBeforeDiscount = useMemo(() => {
    if (!bestPerDay) return null;
    return roundToX9(bestPerDay * days);
  }, [bestPerDay, days]);

  const discount = getDiscountPct(days);

  const syntheticTariff = useMemo((): Tariff | null => {
    if (!finalPrice || selectedGb === null || !selectedCountry || !bestPackage) return null;
    return {
      ...bestPackage,
      id:             bestPackage.id,
      validity_days:  days,
      data_gb:        selectedGb,
      sale_price_eur: finalPrice,
      tariff_type:    tariffType,
    };
  }, [finalPrice, selectedGb, selectedCountry, days, bestPackage, tariffType]);

  const selectedCountryData = countries.find((c) => c.code === selectedCountry);
  const specialFeatures     = bestPackage ? getTariffSpecialFeatures(bestPackage) : [];
  const ops                 = bestPackage ? getTariffOperators(bestPackage, 4) : [];
  const network             = bestNetworkType(ops);

  // ── Render Unified Configurator Studio ────────────────────────────────────
  return (
    <div className="space-y-4 max-w-5xl mx-auto">
      {/* ── Compact Header & Destination Bar ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        {!isChangingCountry && selectedCountryData ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CountryFlag countryCode={selectedCountryData.code} countryName={selectedCountryData.name} size={32} className="shrink-0 rounded-md shadow-xs" />
              <div>
                <h2 className="text-base font-extrabold text-slate-900 leading-tight flex items-center gap-2">
                  <span>{selectedCountryData.name}</span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {t('cfg_plans_count' as any, { count: availablePackages.length }) || `${availablePackages.length} plans`}
                  </span>
                </h2>
              </div>
            </div>
            <button
              ref={changeCountryBtnRef}
              type="button"
              onClick={() => setIsChangingCountry(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all cursor-pointer"
            >
              <span>🔍 Zielgebiet ändern</span>
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <SearchIcon size={14} className="text-brand-600" />
                <span>Reiseziel auswählen</span>
              </h3>
              {selectedCountryData && (
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingCountry(false);
                    changeCountryBtnRef.current?.focus();
                  }}
                  className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Abbrechen ✕
                </button>
              )}
            </div>

            <input
              ref={searchInputRef}
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={t('cfg_search_country')}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />

            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              <span className="text-[10px] font-bold text-slate-400 mr-1">Beliebt:</span>
              {POPULAR_DESTINATIONS.map((code) => {
                const item = countries.find((c) => c.code === code);
                if (!item) return null;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => handleSelectCountry(item.code)}
                    className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all cursor-pointer ${
                      selectedCountry === item.code
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CountryFlag countryCode={item.code} countryName={item.name} size={14} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 max-h-48 overflow-y-auto pr-1 pt-1 scrollbar-thin">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => handleSelectCountry(c.code)}
                  className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left text-xs transition-all cursor-pointer ${
                    selectedCountry === c.code
                      ? 'border-brand-500 bg-brand-50 font-bold text-brand-700 shadow-xs'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  <CountryFlag countryCode={c.code} countryName={c.name} size={18} className="shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Unified Grid (No Redundancy) ── */}
      {selectedCountryData && (
        <div className="grid gap-6 lg:grid-cols-12 items-start">

          {/* ── LEFT COLUMN: Compact Controls (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-4">

            {/* 1. Speed & Quality (Segmented Switch) */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <label id="cfg-speed-label" className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
                {t('cfg_step1_speed' as any) || (isStandaloneRoute ? '1. Speed & Quality' : '1. Geschwindigkeit & Qualität')}
              </label>

              {availableSpeedTypes.length === 0 ? (
                <p className="text-xs text-red-500 font-medium">Keine Unlimited-Tarife verfügbar.</p>
              ) : (
                <div role="radiogroup" aria-labelledby="cfg-speed-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {availableSpeedTypes.includes('unlimited_eco') && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={tariffType === 'unlimited_eco'}
                      onClick={() => {
                        setTariffType('unlimited_eco');
                        onTariffTypeChange?.('unlimited_eco');
                      }}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer flex items-center justify-between ${
                        tariffType === 'unlimited_eco'
                          ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-300 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-emerald-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <EcoIcon size={20} className="shrink-0" />
                        <div>
                          <span className="block font-extrabold text-slate-900 text-xs">Unlimited Eco</span>
                          <span className="block text-[10px] text-slate-500">{t('cfg_after_limit_eco' as any) || 'Nach Limit: 512 kbps'}</span>
                        </div>
                      </div>
                      {tariffType === 'unlimited_eco' && <span className="h-2 w-2 rounded-full bg-emerald-500" />}
                    </button>
                  )}

                  {availableSpeedTypes.includes('unlimited_pro') && (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={tariffType === 'unlimited_pro'}
                      onClick={() => {
                        setTariffType('unlimited_pro');
                        onTariffTypeChange?.('unlimited_pro');
                      }}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer flex items-center justify-between ${
                        tariffType === 'unlimited_pro'
                          ? 'border-violet-500 bg-violet-50/70 ring-2 ring-violet-300 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-violet-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <BoltIcon size={20} className="text-violet-600 shrink-0" />
                        <div>
                          <span className="block font-extrabold text-slate-900 text-xs">Unlimited Pro</span>
                          <span className="block text-[10px] text-slate-500">{t('cfg_after_limit_pro' as any) || 'Nach Limit: ≥ 1 Mbps'}</span>
                        </div>
                      </div>
                      {tariffType === 'unlimited_pro' && <span className="h-2 w-2 rounded-full bg-violet-500" />}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Daily Data Volume Pills */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label id="cfg-volume-label" className="text-xs font-extrabold uppercase tracking-wider text-slate-500">
                  {t('cfg_step2_volume' as any) || '2. Tägliches Highspeed-Volumen'}
                </label>
                <span className="text-[10px] text-slate-400">{t('cfg_renew_daily' as any) || 'Renews every day'}</span>
              </div>

              {gbOptions.length === 0 ? (
                <p className="text-xs text-slate-400">Keine spezifischen Optionen verfügbar.</p>
              ) : (
                <div role="radiogroup" aria-labelledby="cfg-volume-label" className="flex flex-wrap gap-1.5">
                  {gbOptions.map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      role="radio"
                      aria-checked={selectedGb === gb}
                      onClick={() => setSelectedGb(gb)}
                      className={`rounded-xl border px-3.5 py-2 font-extrabold text-xs transition-all cursor-pointer ${
                        selectedGb === gb
                          ? 'border-brand-600 bg-brand-600 text-white shadow-xs ring-2 ring-brand-600 ring-offset-1'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                      }`}
                    >
                      {formatGb(gb)} / {t('cfg_day')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Duration Controls */}
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <DaySlider days={days} onChange={setDays} />
            </div>

          </div>

          {/* ── RIGHT COLUMN: High-Converting Crisp Live Price Card (5 Cols) ── */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-3">
            <div className="rounded-2xl border-2 border-brand-200 bg-white p-5 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-500" />

              {/* Crisp Selected Specs Header */}
              <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                <CountryFlag countryCode={selectedCountryData.code} countryName={selectedCountryData.name} size={32} className="shrink-0 rounded-md shadow-xs" />
                <div>
                  <h4 className="font-extrabold text-slate-900 text-base leading-tight">{selectedCountryData.name}</h4>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                    {tariffType === 'unlimited_eco' ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><EcoIcon size={14} /> Eco</span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-violet-700"><BoltIcon size={14} className="text-violet-600" /> Pro</span>
                    )} · <span className="font-bold text-slate-700">{selectedGb ? `${formatGb(selectedGb)} ${t('unit_per_day')}` : '–'}</span> · {days} {days === 1 ? t('cfg_day') : t('cfg_days')}
                  </p>
                </div>
              </div>

              {/* Network Specs & Features Chips */}
              <div className="py-3 border-b border-slate-100 space-y-2">
                {ops.length > 0 && (
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center gap-1"><NetworkIcon size={12} className="text-slate-400" /> {t('cfg_network' as any) || (isStandaloneRoute ? 'Network:' : 'Mobilfunknetz:')}</span>
                    <span className="font-bold text-slate-800 truncate max-w-[150px]">{ops.map((o) => o.name).join(' · ')}</span>
                  </div>
                )}

                {specialFeatures.length > 0 && (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {specialFeatures.map((feat) => (
                      <span
                        key={feat.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${feat.cls}`}
                      >
                        <span>{feat.icon}</span>
                        <span>{t(feat.badgeKey as any)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Price & Per-Day Rate */}
              <div className="py-3 flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">{t('cfg_total' as any) || (isStandaloneRoute ? 'Total Price' : 'Gesamtpreis')}</span>
                  {discount > 0 && priceBeforeDiscount !== null && (
                    <Price eur={priceBeforeDiscount} className="text-xs text-slate-400 line-through block" />
                  )}
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-slate-900 tracking-tight">
                    {finalPrice !== null ? <Price eur={finalPrice} /> : '–'}
                  </p>
                  {finalPrice !== null && (
                    <span className="text-[11px] text-slate-500 font-semibold block mt-0.5">
                      (<Price eur={finalPrice / days} /> {t('unit_per_day')})
                    </span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (!syntheticTariff) return;
                    addItem(syntheticTariff, 1, { periodDays: days });
                    setAdded(true);
                    setTimeout(() => setAdded(false), 1500);
                  }}
                  disabled={!syntheticTariff}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-brand-200 bg-brand-50 py-3 text-xs font-extrabold text-brand-700 hover:bg-brand-100 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {added ? t('cfg_added') : t('cfg_add_cart')}
                </button>
                <button
                  type="button"
                  onClick={() => syntheticTariff && setCheckoutTariff(syntheticTariff)}
                  disabled={!syntheticTariff}
                  className="w-full btn-primary active:scale-[0.98] shadow-md"
                >
                  {t('cfg_buy_now')} {finalPrice !== null ? <> · <Price eur={finalPrice} /></> : ''}
                </button>
              </div>

            </div>
          </div>

        </div>
      )}

      {/* ── Mobile Floating Bottom Sticky Bar ── */}
      {syntheticTariff && finalPrice !== null && (
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-2xl flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">{t('cfg_total' as any) || (isStandaloneRoute ? 'Total' : 'Gesamt')} ({days}{days === 1 ? (t('cfg_day') || 'd') : (t('cfg_days') || 'd')})</span>
            <Price eur={finalPrice} className="text-lg font-black text-slate-900" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                addItem(syntheticTariff, 1, { periodDays: days });
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
              className="h-12 rounded-xl border border-brand-200 bg-brand-50 px-3.5 text-xs font-bold text-brand-700 cursor-pointer"
            >
              {added ? t('cfg_added') : t('cfg_add_cart')}
            </button>
            <button
              type="button"
              onClick={() => setCheckoutTariff(syntheticTariff)}
              className="btn-primary h-12 px-5 text-sm font-extrabold shadow-sm active:scale-[0.98]"
            >
              {t('cfg_buy_now')}
            </button>
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {checkoutTariff && (
        <CheckoutModal
          tariff={checkoutTariff}
          orderType="new_esim"
          days={days}
          onClose={() => setCheckoutTariff(null)}
        />
      )}
    </div>
  );
}
