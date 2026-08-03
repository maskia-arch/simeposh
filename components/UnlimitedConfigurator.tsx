'use client';

import { useState, useMemo, useEffect } from 'react';
import { roundToX9, getDiscountPct, discountLabel, formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import type { Database } from '@/lib/supabase/types';
import { CheckoutModal } from '@/components/CheckoutModal';
import { CountryFlag } from '@/components/CountryFlag';
import { aliasToCode, aliasToRegion } from '@/lib/i18n/countryAliases';
import { useTranslation } from '@/lib/i18n';
import { useCart } from '@/components/CartProvider';
import { getTariffSpecialFeatures, getTariffOperators, bestNetworkType } from '@/lib/tariff-display';
import { InfinityIcon, BoltIcon, NetworkIcon, GiftIcon, InfoIcon, SearchIcon } from '@/components/Icons';

type Tariff = Database['public']['Tables']['tariffs']['Row'];
type TariffType = 'unlimited_eco' | 'unlimited_pro';

// ── helpers ──────────────────────────────────────────────────────────────────

function perDayEur(t: Tariff): number {
  return t.sale_price_eur / t.validity_days;
}

function computePrice(baseRate: number, days: number): number {
  const raw = baseRate * days * (1 - getDiscountPct(days));
  return roundToX9(raw);
}

// ── Day slider mapping ──────────────────────────────────────────────────────
const DAY_MARKS = [1, 3, 7, 14, 30, 90, 180, 365];
const SEG       = 100;
const SLIDER_MAX = (DAY_MARKS.length - 1) * SEG;

function rawToDays(raw: number): number {
  const seg  = Math.min(DAY_MARKS.length - 2, Math.max(0, Math.floor(raw / SEG)));
  const frac = (raw - seg * SEG) / SEG;
  return Math.round(DAY_MARKS[seg] + (DAY_MARKS[seg + 1] - DAY_MARKS[seg]) * frac);
}

function daysToRaw(days: number): number {
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

// ── DaySlider Component ─────────────────────────────────────────────────────

function DaySlider({
  days,
  onChange,
}: {
  days: number;
  onChange: (d: number) => void;
}) {
  const { t } = useTranslation();
  const { pct, nextAt, nextPct } = discountLabel(days);
  const lastIdx = DAY_MARKS.length - 1;
  const presets = [1, 3, 7, 14, 30, 90];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {t('cfg_duration')}
        </label>
        <span className="text-base font-extrabold text-brand-700 bg-brand-50 border border-brand-200 px-3 py-1 rounded-xl">
          {days} {days === 1 ? t('cfg_day') : t('cfg_days')}
        </span>
      </div>

      {/* Quick Day Presets */}
      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
              days === p
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {p} {t('cfg_days')}
          </button>
        ))}
      </div>

      {/* Slider */}
      <div className="pt-2">
        <input
          type="range"
          min={0}
          max={SLIDER_MAX}
          step={1}
          value={daysToRaw(days)}
          onChange={(e) => onChange(rawToDays(Number(e.target.value)))}
          aria-label={t('cfg_duration')}
          className="w-full h-2.5 rounded-full appearance-none bg-slate-200 accent-brand-600 cursor-pointer touch-none"
        />

        <div className="relative mt-1.5 h-4">
          {DAY_MARKS.map((m, i) => {
            const transform = i === 0 ? 'translateX(0)' : i === lastIdx ? 'translateX(-100%)' : 'translateX(-50%)';
            return (
              <button
                key={m}
                type="button"
                onClick={() => onChange(m)}
                style={{ left: `${(i / lastIdx) * 100}%`, transform }}
                className={`absolute top-0 text-[10px] sm:text-xs leading-none transition-colors hover:text-brand-600 ${
                  days === m ? 'text-brand-600 font-semibold' : 'text-slate-400'
                }`}
              >
                {m}d
              </button>
            );
          })}
        </div>
      </div>

      {/* Discount Hint */}
      <div className="min-h-[22px]">
        {pct > 0 ? (
          <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
            <GiftIcon size={14} className="text-emerald-700" />
            <span>{t('cfg_disc_incl', { pct })}</span>
            {nextAt && <span className="text-emerald-600 opacity-90"> {t('cfg_disc_next', { days: nextAt, pct: nextPct })}</span>}
          </p>
        ) : nextAt ? (
          <p className="text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
            <InfoIcon size={14} className="text-slate-400" />
            <span>{t('cfg_disc_hint', { days: nextAt, pct: nextPct })}</span>
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
}

export function UnlimitedConfigurator({ tariffs, initialQuery = '' }: Props) {
  const [countrySearch, setCountrySearch]     = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>('DE');
  const [isChangingCountry, setIsChangingCountry] = useState(false);
  const [tariffType, setTariffType]           = useState<TariffType>('unlimited_eco');
  const [selectedGb, setSelectedGb]           = useState<number | null>(null);
  const [days, setDays]                       = useState(7);
  const [checkoutTariff, setCheckoutTariff]   = useState<Tariff | null>(null);
  const [added, setAdded]                     = useState(false);
  const { addItem, open }                     = useCart();
  const { t }                                 = useTranslation();

  // ── Step 1: Extract all available countries from DB ───────────────────────
  type CountryEntry = {
    name:   string;
    flag:   string;
    code:   string;
    covers: Set<string>;
  };

  const countries = useMemo(() => {
    const map = new Map<string, CountryEntry>();
    tariffs.forEach((t) => {
      let entry = map.get(t.country_code);
      if (!entry) {
        entry = {
          name:   t.country_name,
          flag:   t.flag_emoji ?? '',
          code:   t.country_code,
          covers: new Set<string>(),
        };
        map.set(t.country_code, entry);
      }
      const locs = t.location_codes ?? [t.country_code];
      for (const l of locs) entry.covers.add(l.toUpperCase());
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tariffs]);

  // Ensure selected country is valid
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

  // Query resolution on mount/change
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

  // ── Step 2: Strict filtering of AVAILABLE speed tiers for selected country ──
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

  // Auto-switch tariffType if current is not available
  useEffect(() => {
    if (availableSpeedTypes.length > 0 && !availableSpeedTypes.includes(tariffType)) {
      setTariffType(availableSpeedTypes[0]);
    }
  }, [availableSpeedTypes, tariffType]);

  // ── Step 3: Strict filtering of AVAILABLE packages & daily GB ────────────
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

  // Auto-select valid GB option
  useEffect(() => {
    if (gbOptions.length > 0 && (selectedGb === null || !gbOptions.includes(selectedGb))) {
      setSelectedGb(gbOptions[0]);
    }
  }, [gbOptions, selectedGb]);

  // ── Step 4: Resolve exact supplier product (best package) ──────────────────
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

  // Synthetic tariff for shopping cart
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
  const ops                 = bestPackage ? getTariffOperators(bestPackage.raw_data as Record<string, unknown> | null, 4) : [];
  const network             = bestNetworkType(ops);

  // ── Render Configurator UI ──────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Top Header / Search Destination Bar ── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        {!isChangingCountry && selectedCountryData ? (
          /* Collapsed Selected Destination Chip Header */
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <CountryFlag countryCode={selectedCountryData.code} countryName={selectedCountryData.name} size={40} className="shrink-0 rounded-lg shadow-sm" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Reiseziel</p>
                <h2 className="text-xl font-extrabold text-slate-900 leading-tight flex items-center gap-2">
                  <span>{selectedCountryData.name}</span>
                  <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                    {availablePackages.length} Unlimited Tarife verfügbar
                  </span>
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsChangingCountry(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-brand-50 hover:border-brand-300 hover:text-brand-700 transition-all cursor-pointer"
            >
              <span>🔍 Zielgebiet ändern</span>
            </button>
          </div>
        ) : (
          /* Expanded Destination Search & Selector */
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                <SearchIcon size={16} className="text-brand-600" />
                <span>Reiseziel auswählen</span>
              </h3>
              {selectedCountryData && (
                <button
                  type="button"
                  onClick={() => setIsChangingCountry(false)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600"
                >
                  Abbrechen ✕
                </button>
              )}
            </div>

            <input
              type="search"
              value={countrySearch}
              onChange={(e) => setCountrySearch(e.target.value)}
              placeholder={t('cfg_search_country')}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              autoFocus
            />

            {/* Popular Destination Quick Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-slate-400 mr-1">Beliebt:</span>
              {POPULAR_DESTINATIONS.map((code) => {
                const item = countries.find((c) => c.code === code);
                if (!item) return null;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => {
                      setSelectedCountry(item.code);
                      setCountrySearch('');
                      setIsChangingCountry(false);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                      selectedCountry === item.code
                        ? 'border-brand-500 bg-brand-50 text-brand-700 font-bold'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <CountryFlag countryCode={item.code} countryName={item.name} size={16} />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Full Country Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pr-1 pt-2 scrollbar-thin">
              {filteredCountries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedCountry(c.code);
                    setCountrySearch('');
                    setIsChangingCountry(false);
                  }}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left text-xs transition-all cursor-pointer ${
                    selectedCountry === c.code
                      ? 'border-brand-500 bg-brand-50 font-bold text-brand-700 shadow-sm'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                  }`}
                >
                  <CountryFlag countryCode={c.code} countryName={c.name} size={20} className="shrink-0" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── 2-Column Main Split Layout (Left: Controls | Right: Sticky Live Summary) ── */}
      {selectedCountryData && (
        <div className="grid gap-8 lg:grid-cols-12 items-start">

          {/* ── LEFT COLUMN: Interactive Configurator Controls (7 Cols) ── */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. Speed & Quality Tier (Eco vs Pro) - ONLY AVAILABLE OPTIONS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                1. Geschwindigkeit & Qualität
              </label>

              {availableSpeedTypes.length === 0 ? (
                <p className="text-xs text-red-500 font-medium">Für dieses Zielgebiet stehen aktuell keine Unlimited-Tarife bereit.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Eco Option */}
                  {availableSpeedTypes.includes('unlimited_eco') && (
                    <button
                      type="button"
                      onClick={() => setTariffType('unlimited_eco')}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        tariffType === 'unlimited_eco'
                          ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-400 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-emerald-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                            <InfinityIcon size={18} className="text-emerald-600" />
                            <span>Unlimited Eco</span>
                          </span>
                          {tariffType === 'unlimited_eco' && (
                            <span className="h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Highspeed pro Tag, danach 512 kbps unbegrenzt weiter nutzen.</p>
                      </div>
                      <span className="mt-3 inline-flex text-[10px] font-bold text-emerald-800 bg-emerald-100/70 border border-emerald-200 px-2 py-0.5 rounded-md w-fit">
                        Spartipp · Ideal für Chat & Maps
                      </span>
                    </button>
                  )}

                  {/* Pro Option */}
                  {availableSpeedTypes.includes('unlimited_pro') && (
                    <button
                      type="button"
                      onClick={() => setTariffType('unlimited_pro')}
                      className={`rounded-2xl border p-4 text-left transition-all cursor-pointer flex flex-col justify-between ${
                        tariffType === 'unlimited_pro'
                          ? 'border-violet-500 bg-violet-50/60 ring-2 ring-violet-400 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-violet-300'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="flex items-center gap-1.5 font-extrabold text-slate-900 text-sm">
                            <BoltIcon size={18} className="text-violet-600" />
                            <span>Unlimited Pro</span>
                          </span>
                          {tariffType === 'unlimited_pro' && (
                            <span className="h-2 w-2 rounded-full bg-violet-500 ring-4 ring-violet-100" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 leading-relaxed">Highspeed pro Tag, danach ≥ 1 Mbps unbegrenzt weiter nutzen.</p>
                      </div>
                      <span className="mt-3 inline-flex text-[10px] font-bold text-violet-800 bg-violet-100/70 border border-violet-200 px-2 py-0.5 rounded-md w-fit">
                        Premium · Für Videos & HD Stream
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 2. Daily Data Volume Options - ONLY AVAILABLE GB OPTIONS */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  2. Tägliches Highspeed-Volumen
                </label>
                <span className="text-xs text-slate-400">Jeden Tag erneuert</span>
              </div>

              {gbOptions.length === 0 ? (
                <p className="text-xs text-slate-400">Keine spezifischen Optionen verfügbar.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {gbOptions.map((gb) => (
                    <button
                      key={gb}
                      type="button"
                      onClick={() => setSelectedGb(gb)}
                      className={`rounded-2xl border px-5 py-3 font-extrabold text-sm transition-all cursor-pointer ${
                        selectedGb === gb
                          ? 'border-brand-600 bg-brand-600 text-white shadow-md scale-[1.02]'
                          : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                      }`}
                    >
                      {formatGb(gb)} / {t('cfg_day')}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 3. Duration Controls (Slider + Presets) */}
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <DaySlider days={days} onChange={setDays} />
            </div>

          </div>

          {/* ── RIGHT COLUMN: Sticky Live Summary & Purchase Card (5 Cols) ── */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-4">
            <div className="rounded-3xl border-2 border-brand-200 bg-white p-6 shadow-xl relative overflow-hidden">

              {/* Decorative Brand Accent Line */}
              <div className="absolute top-0 inset-x-0 h-2 bg-gradient-to-r from-brand-500 via-sky-400 to-indigo-500" />

              <div className="mb-4 pb-3 border-b border-slate-100 flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Tarif-Zusammenstellung</span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Sofort einsatzbereit
                </span>
              </div>

              {/* Destination & Specs */}
              <div className="space-y-3 mb-5">
                <div className="flex items-center gap-3">
                  <CountryFlag countryCode={selectedCountryData.code} countryName={selectedCountryData.name} size={36} className="shrink-0 rounded-md shadow-sm" />
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-lg leading-tight">{selectedCountryData.name}</h4>
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{tariffType === 'unlimited_eco' ? '♾️ Unlimited Eco' : '⚡ Unlimited Pro'}</span>
                      <span>·</span>
                      <span className="font-bold text-slate-700">{selectedGb ? formatGb(selectedGb) : '–'} / Tag</span>
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-3 text-xs space-y-1.5">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Gewählte Laufzeit:</span>
                    <span className="font-bold text-slate-900">{days} {days === 1 ? 'Tag' : 'Tage'}</span>
                  </div>
                  {network && (
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Netzwerk-Standard:</span>
                      <span className="font-bold text-violet-700">{network} Highspeed</span>
                    </div>
                  )}
                  {ops.length > 0 && (
                    <div className="flex items-center justify-between text-slate-600 pt-1 border-t border-slate-200/60">
                      <span className="flex items-center gap-1"><NetworkIcon size={12} className="text-slate-400" /> Mobilfunknetz:</span>
                      <span className="font-medium text-slate-800 truncate max-w-[140px]">{ops.map((o) => o.name).join(' · ')}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Special Features Badges */}
              {specialFeatures.length > 0 && (
                <div className="mb-5 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Enthaltene Merkmale:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {specialFeatures.map((feat) => (
                      <span
                        key={feat.id}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${feat.cls}`}
                      >
                        <span>{feat.icon}</span>
                        <span>{t(feat.badgeKey as any)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Live Price Display */}
              <div className="mb-6 pt-4 border-t border-slate-100 flex items-baseline justify-between">
                <div>
                  <span className="text-xs text-slate-400 block font-medium">Gesamtpreis</span>
                  {discount > 0 && priceBeforeDiscount !== null && (
                    <Price eur={priceBeforeDiscount} className="text-sm text-slate-400 line-through block" />
                  )}
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-900 tracking-tight">
                    {finalPrice !== null ? <Price eur={finalPrice} /> : '–'}
                  </p>
                  {discount > 0 && (
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md inline-block mt-0.5">
                      {t('cfg_disc_label', { pct: Math.round(discount * 100) })}
                    </span>
                  )}
                </div>
              </div>

              {/* Action CTAs */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    if (!syntheticTariff) return;
                    addItem(syntheticTariff, 1, { periodDays: days });
                    setAdded(true);
                    setTimeout(() => setAdded(false), 1500);
                  }}
                  disabled={!syntheticTariff}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-brand-200 bg-brand-50 py-3.5 text-sm font-bold text-brand-700 hover:bg-brand-100 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
                >
                  {added ? t('cfg_added') : t('cfg_add_cart')}
                </button>
                <button
                  type="button"
                  onClick={() => syntheticTariff && setCheckoutTariff(syntheticTariff)}
                  disabled={!syntheticTariff}
                  className="w-full rounded-2xl bg-brand-600 py-4 text-sm font-extrabold text-white shadow-lg hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer text-center"
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
        <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-2xl flex items-center justify-between gap-4">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Gesamt ({days}d)</span>
            <Price eur={finalPrice} className="text-xl font-extrabold text-slate-900" />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                addItem(syntheticTariff, 1, { periodDays: days });
                setAdded(true);
                setTimeout(() => setAdded(false), 1500);
              }}
              className="rounded-xl border border-brand-200 bg-brand-50 px-3 py-2.5 text-xs font-bold text-brand-700"
            >
              {added ? '✓' : '+ Warenkorb'}
            </button>
            <button
              type="button"
              onClick={() => setCheckoutTariff(syntheticTariff)}
              className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white shadow-md"
            >
              Jetzt kaufen
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
