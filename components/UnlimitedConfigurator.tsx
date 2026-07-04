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
import { InfinityIcon, BoltIcon, NetworkIcon, GiftIcon, InfoIcon } from '@/components/Icons';

type Tariff = Database['public']['Tables']['tariffs']['Row'];
type TariffType = 'unlimited_eco' | 'unlimited_pro';

// ── helpers ──────────────────────────────────────────────────────────────────

/** Extract operator names from raw_data */
function getOperators(tariff: Tariff): string[] {
  const ops = (tariff.raw_data as Record<string, unknown> | null)?.operatorList;
  if (!Array.isArray(ops)) return [];
  return ops
    .map((o: Record<string, unknown>) => String(o.operatorName ?? ''))
    .filter(Boolean)
    .slice(0, 3);
}

/** Calculate the per-day base price (EUR) for a given package */
function perDayEur(t: Tariff): number {
  return t.sale_price_eur / t.validity_days;
}

/** Compute the final price for a custom day count using the best per-day rate */
function computePrice(baseRate: number, days: number): number {
  const raw = baseRate * days * (1 - getDiscountPct(days));
  return roundToX9(raw);
}

// ── Day slider mapping ──────────────────────────────────────────────────────
// The slider uses an INDEX-based (piecewise-linear) scale so the labelled marks
// are evenly spaced AND the thumb position always matches the displayed value.
// A plain linear 1–365 slider made the thumb land near "3d" while showing 49d.
const DAY_MARKS = [1, 3, 7, 14, 30, 90, 180, 365];
const SEG       = 100;                              // sub-steps between two marks
const SLIDER_MAX = (DAY_MARKS.length - 1) * SEG;    // total raw range

/** raw slider value → number of days */
function rawToDays(raw: number): number {
  const seg  = Math.min(DAY_MARKS.length - 2, Math.max(0, Math.floor(raw / SEG)));
  const frac = (raw - seg * SEG) / SEG;
  return Math.round(DAY_MARKS[seg] + (DAY_MARKS[seg + 1] - DAY_MARKS[seg]) * frac);
}

/** number of days → raw slider value (inverse of rawToDays) */
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

// ── sub-components ────────────────────────────────────────────────────────────

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

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">{t('cfg_duration')}</span>
        <span className="text-lg font-bold text-brand-700">{days} {days === 1 ? t('cfg_day') : t('cfg_days')}</span>
      </div>

      {/* Piecewise-linear slider (marks evenly spaced, thumb stays in sync) */}
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

      {/* Mark labels – absolutely positioned so each sits exactly under its notch */}
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

      {/* Discount hint */}
      <div className="mt-4 min-h-[24px]">
        {pct > 0 ? (
          <p className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <GiftIcon size={14} className="text-green-700" />
            <span>{t('cfg_disc_incl', { pct })}</span>
            {nextAt && <span className="text-green-600"> {t('cfg_disc_next', { days: nextAt, pct: nextPct })}</span>}
          </p>
        ) : nextAt ? (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            <InfoIcon size={14} className="text-slate-400" />
            <span>{t('cfg_disc_hint', { days: nextAt, pct: nextPct })}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  tariffs: Tariff[]; // all unlimited tariffs (eco + pro)
  /** Search query carried over from the travel tab / hero search. */
  initialQuery?: string;
}

export function UnlimitedConfigurator({ tariffs, initialQuery = '' }: Props) {
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tariffType, setTariffType]           = useState<TariffType>('unlimited_eco');
  const [selectedGb, setSelectedGb]           = useState<number | null>(null);
  const [days, setDays]                       = useState(7);
  const [checkoutTariff, setCheckoutTariff]   = useState<Tariff | null>(null);
  const [added, setAdded]                     = useState(false);
  const { addItem }                           = useCart();
  const { t }                                 = useTranslation();

  // ── Step 1: country list (with coverage info for ranked search) ───────────
  type CountryEntry = {
    name:   string;
    flag:   string;
    code:   string;
    covers: Set<string>; // ISO codes this entry covers (for region tariffs)
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
      // Accumulate coverage from every package sharing this code
      const locs = t.location_codes ?? [t.country_code];
      for (const l of locs) entry.covers.add(l.toUpperCase());
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tariffs]);

  /**
   * Ranked country search:
   *   100 exact country / alias match  ("Deutschland" → DE)
   *    90 exact region match           ("Europa" → EU)
   *    70 name substring
   *    50 region entry that COVERS the searched country (EU covers DE)
   */
  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q  = countrySearch.trim().toLowerCase();
    const rc = aliasToCode(q);    // "deutschland" → "DE"
    const rr = aliasToRegion(q);  // "europa"      → "EU"

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
      else if (rc && c.covers.has(rc.toUpperCase())) score = 50; // region covers DE
      else if (code.includes(q))                score = 20;

      if (score > 0) scored.push({ c, score });
    }

    scored.sort((a, b) => (b.score - a.score) || a.c.name.localeCompare(b.c.name));
    return scored.map((s) => s.c);
  }, [countries, countrySearch]);

  /** Resolve a free-text query to the single best matching country/region entry. */
  function resolveBestCountry(query: string): CountryEntry | null {
    const qLow = query.trim().toLowerCase();
    if (!qLow) return null;
    const rc = aliasToCode(qLow);
    const rr = aliasToRegion(qLow);
    let best: CountryEntry | null = null;
    let bestScore = 0;
    for (const c of countries) {
      const code = c.code.toLowerCase();
      const name = c.name.toLowerCase();
      let s = 0;
      if (rc && code === rc.toLowerCase())      s = 100;
      else if (rr && code === rr.toLowerCase()) s = 95;
      else if (code === qLow)                   s = 90;
      else if (name === qLow)                   s = 88;
      else if (name.startsWith(qLow))           s = 70;
      else if (name.includes(qLow))             s = 50;
      if (s > bestScore) { best = c; bestScore = s; }
    }
    // Only auto-select on a confident match; otherwise the search box is pre-filled.
    return bestScore >= 50 ? best : null;
  }

  // Carry the travel-tab / hero search over to the Unlimited builder: when the
  // tab is opened with an active query, pre-select the same destination so the
  // customer sees the same results (e.g. "Deutschland" → Germany Unlimited).
  useEffect(() => {
    const query = (initialQuery ?? '').trim();
    if (!query) return;
    const best = resolveBestCountry(query);
    if (best) {
      setSelectedCountry(best.code);
      setSelectedGb(null);
      setCountrySearch('');
    } else {
      // No exact destination (e.g. covered only by a region) → pre-fill the
      // search so the filtered list surfaces the matching options.
      setCountrySearch(query);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery]);

  // ── Step 2: packages for selected country + type ──────────────────────────
  const availablePackages = useMemo(() => {
    if (!selectedCountry) return [];
    return tariffs.filter(
      (t) => t.country_code === selectedCountry && t.tariff_type === tariffType,
    );
  }, [tariffs, selectedCountry, tariffType]);

  // ── Step 3: available daily GB options ───────────────────────────────────
  const gbOptions = useMemo(() => {
    const set = new Set<number>();
    availablePackages.forEach((t) => {
      if (t.data_gb !== null) set.add(Number(t.data_gb));
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [availablePackages]);

  // Reset selectedGb when country/type changes
  useMemo(() => {
    if (gbOptions.length > 0 && (selectedGb === null || !gbOptions.includes(selectedGb))) {
      setSelectedGb(gbOptions[0]);
    }
  }, [gbOptions]);

  // ── Step 4: pick the BEST base package for the chosen GB ──────────────────
  // We must use the actual package (its packageCode) that yields the lowest
  // per-day rate — not just availablePackages[0] — so checkout & provisioning
  // reference the correct supplier product.
  const bestPackage = useMemo<Tariff | null>(() => {
    if (selectedGb === null) return null;
    const matching = availablePackages.filter((t) => Number(t.data_gb) === selectedGb);
    if (matching.length === 0) return null;
    return matching.reduce((best, t) => (perDayEur(t) < perDayEur(best) ? t : best));
  }, [availablePackages, selectedGb]);

  const bestPerDay = useMemo(() => {
    return bestPackage ? perDayEur(bestPackage) : null;
  }, [bestPackage]);

  // ── Step 5: price ─────────────────────────────────────────────────────────
  const finalPrice = useMemo(() => {
    if (!bestPerDay) return null;
    return computePrice(bestPerDay, days);
  }, [bestPerDay, days]);

  const priceBeforeDiscount = useMemo(() => {
    if (!bestPerDay) return null;
    return roundToX9(bestPerDay * days);
  }, [bestPerDay, days]);

  const discount = getDiscountPct(days);

  // ── Step 6: synthetic tariff for checkout ────────────────────────────────
  const syntheticTariff = useMemo((): Tariff | null => {
    if (!finalPrice || selectedGb === null || !selectedCountry) return null;
    const base = bestPackage;
    if (!base) return null;
    return {
      ...base,
      id:             base.id,
      validity_days:  days,
      data_gb:        selectedGb,
      sale_price_eur: finalPrice,
      tariff_type:    tariffType,
    };
  }, [finalPrice, selectedGb, selectedCountry, days, availablePackages, tariffType]);

  const selectedCountryData = countries.find((c) => c.code === selectedCountry);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* ── Country picker ── */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <h3 className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">1</span>
          {t('cfg_step1')}
        </h3>

        <input
          type="search"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          placeholder={t('cfg_search_country')}
          className="mb-3 w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4 max-h-52 overflow-y-auto pr-1">
          {filteredCountries.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => { setSelectedCountry(c.code); setCountrySearch(''); setSelectedGb(null); }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition-all ${
                selectedCountry === c.code
                  ? 'border-brand-500 bg-brand-50 font-semibold text-brand-700 shadow-sm'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:bg-brand-50'
              }`}
            >
              <CountryFlag countryCode={c.code} countryName={c.name} size={24} className="shrink-0" />
              <span className="truncate text-xs font-medium">{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Type + GB + Days (only when country selected) ── */}
      {selectedCountry && (
        <>
          {/* ── Tariff type ── */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <h3 className="mb-4 font-semibold text-slate-800 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">2</span>
              {t('cfg_step2')}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { type: 'unlimited_eco' as TariffType, icon: <InfinityIcon size={24} className="text-emerald-600" />, label: t('cfg_eco'), sub: t('cfg_eco_sub') },
                  { type: 'unlimited_pro' as TariffType, icon: <BoltIcon size={24} className="text-violet-600" />, label: t('cfg_pro'), sub: t('cfg_pro_sub') },
                ] as const
              ).map(({ type, icon, label, sub }) => {
                const hasPackages = tariffs.some(
                  (t) => t.country_code === selectedCountry && t.tariff_type === type,
                );
                return (
                  <button
                    key={type}
                    type="button"
                    disabled={!hasPackages}
                    onClick={() => { setTariffType(type); setSelectedGb(null); }}
                    className={`rounded-xl border p-4 text-left transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                      tariffType === type
                        ? 'border-brand-500 bg-brand-50 shadow-sm'
                        : 'border-slate-200 hover:border-brand-300'
                    }`}
                  >
                    <div className="mb-2">{icon}</div>
                    <p className="font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    {!hasPackages && <p className="text-xs text-red-400 mt-1">{t('cfg_unavailable')}</p>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Daily GB ── */}
          {gbOptions.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="mb-1 font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">3</span>
                {t('cfg_step3')}
              </h3>
              <p className="mb-4 text-xs text-slate-500 flex items-center gap-1.5 ml-8">
                {t('cfg_gb_hint')}
              </p>
              <div className="flex flex-wrap gap-2">
                {gbOptions.map((gb) => (
                  <button
                    key={gb}
                    type="button"
                    onClick={() => setSelectedGb(gb)}
                    className={`rounded-xl border px-5 py-3 font-semibold text-sm transition-all ${
                      selectedGb === gb
                        ? 'border-brand-500 bg-brand-600 text-white shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-brand-300 hover:bg-brand-50'
                    }`}
                  >
                    {formatGb(gb)} / {t('cfg_day')}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Days + Price ── */}
          {selectedGb !== null && bestPerDay !== null && (
            <div className="rounded-2xl border border-brand-200 bg-white p-6 shadow-sm">
              <h3 className="mb-5 font-semibold text-slate-800 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">4</span>
                {t('cfg_step4')}
              </h3>

              <DaySlider days={days} onChange={setDays} />

              {/* Summary */}
              <div className="mt-6 rounded-xl bg-slate-50 p-4 border border-slate-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 text-sm">
                    <div className="flex items-center gap-2">
                      {selectedCountryData && (
                        <CountryFlag countryCode={selectedCountryData.code} countryName={selectedCountryData.name} size={28} className="shrink-0" />
                      )}
                      <span className="font-semibold text-slate-800">{selectedCountryData?.name}</span>
                    </div>
                    <div className="text-slate-500 flex flex-wrap items-center gap-x-2">
                      <span className="inline-flex items-center gap-1">
                        {tariffType === 'unlimited_eco' ? (
                          <>
                            <InfinityIcon size={14} className="text-emerald-600" />
                            <span>{t('cfg_eco')}</span>
                          </>
                        ) : (
                          <>
                            <BoltIcon size={14} className="text-violet-600" />
                            <span>{t('cfg_pro')}</span>
                          </>
                        )}
                      </span>
                      <span>·</span>
                      <span>{formatGb(selectedGb)} / {t('cfg_day')}</span>
                      <span>·</span>
                      <span>{days} {days === 1 ? t('cfg_day') : t('cfg_days')}</span>
                    </div>
                    {/* Operator info */}
                    {availablePackages[0] && getOperators(availablePackages[0]).length > 0 && (
                      <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-1">
                        <NetworkIcon size={13} className="text-slate-400" />
                        <span>{getOperators(availablePackages[0]).join(' · ')}</span>
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {discount > 0 && priceBeforeDiscount !== null && (
                      <Price eur={priceBeforeDiscount} className="block text-sm text-slate-400 line-through" />
                    )}
                    <p className="text-3xl font-extrabold text-brand-700">
                      {finalPrice !== null ? <Price eur={finalPrice} /> : '–'}
                    </p>
                    {discount > 0 && (
                      <p className="text-xs font-semibold text-green-700">{t('cfg_disc_label', { pct: Math.round(discount * 100) })}</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      if (!syntheticTariff) return;
                      addItem(syntheticTariff, 1, { periodDays: days });
                      setAdded(true);
                      setTimeout(() => setAdded(false), 1500);
                    }}
                    disabled={!syntheticTariff}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-brand-200 bg-brand-50 py-3 font-semibold text-brand-700 hover:bg-brand-100 disabled:opacity-50 transition-colors"
                  >
                    {added ? t('cfg_added') : t('cfg_add_cart')}
                  </button>
                  <button
                    type="button"
                    onClick={() => syntheticTariff && setCheckoutTariff(syntheticTariff)}
                    disabled={!syntheticTariff}
                    className="flex-1 rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                  >
                    {t('cfg_buy_now')}{finalPrice !== null ? <> · <Price eur={finalPrice} /></> : ''}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
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
