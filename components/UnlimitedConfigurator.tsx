'use client';

import { useState, useMemo } from 'react';
import { formatEur, roundToX9, getDiscountPct, discountLabel } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { CheckoutModal } from '@/components/CheckoutModal';
import { CountryFlag } from '@/components/CountryFlag';
import { aliasToCode } from '@/lib/i18n/countryAliases';

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

// ── sub-components ────────────────────────────────────────────────────────────

function DaySlider({
  days,
  onChange,
}: {
  days: number;
  onChange: (d: number) => void;
}) {
  const marks = [1, 3, 7, 14, 30, 90, 180, 365];
  const { pct, nextAt, nextPct } = discountLabel(days);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-slate-700">Laufzeit</span>
        <span className="text-lg font-bold text-brand-700">{days} {days === 1 ? 'Tag' : 'Tage'}</span>
      </div>

      {/* Custom slider */}
      <input
        type="range"
        min={1}
        max={365}
        value={days}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none bg-slate-200 accent-brand-600 cursor-pointer"
      />

      {/* Mark labels */}
      <div className="flex justify-between mt-1 text-xs text-slate-400">
        {marks.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className={`transition-colors hover:text-brand-600 ${days === m ? 'text-brand-600 font-semibold' : ''}`}
          >
            {m}d
          </button>
        ))}
      </div>

      {/* Discount hint */}
      <div className="mt-3 min-h-[24px]">
        {pct > 0 ? (
          <p className="text-xs font-medium text-green-700 bg-green-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            🎉 <span><strong>{pct}% Rabatt</strong> inklusive</span>
            {nextAt && <span className="text-green-600"> · ab {nextAt} Tagen sogar {nextPct}%</span>}
          </p>
        ) : nextAt ? (
          <p className="text-xs text-slate-400 bg-slate-50 rounded-lg px-3 py-1.5 inline-flex items-center gap-1.5">
            💡 Ab <strong className="text-slate-600">{nextAt} Tagen</strong> sparst du {nextPct}%
          </p>
        ) : null}
      </div>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────

interface Props {
  tariffs: Tariff[]; // all unlimited tariffs (eco + pro)
}

export function UnlimitedConfigurator({ tariffs }: Props) {
  const [countrySearch, setCountrySearch] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [tariffType, setTariffType]           = useState<TariffType>('unlimited_eco');
  const [selectedGb, setSelectedGb]           = useState<number | null>(null);
  const [days, setDays]                       = useState(7);
  const [checkoutTariff, setCheckoutTariff]   = useState<Tariff | null>(null);

  // ── Step 1: country list ──────────────────────────────────────────────────
  const countries = useMemo(() => {
    const map = new Map<string, { name: string; flag: string; code: string }>();
    tariffs.forEach((t) => {
      if (!map.has(t.country_code)) {
        map.set(t.country_code, {
          name: t.country_name,
          flag: t.flag_emoji ?? '🌐',
          code: t.country_code,
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [tariffs]);

  const filteredCountries = useMemo(() => {
    if (!countrySearch.trim()) return countries;
    const q = countrySearch.trim().toLowerCase();
    const resolved = aliasToCode(q);
    return countries.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase() === q ||
        (resolved ? c.code === resolved : false),
    );
  }, [countries, countrySearch]);

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

  // ── Step 4: best per-day rate for chosen GB ───────────────────────────────
  const bestPerDay = useMemo(() => {
    if (selectedGb === null) return null;
    const matching = availablePackages.filter((t) => Number(t.data_gb) === selectedGb);
    if (matching.length === 0) return null;
    // Use the minimum per-day price as the base rate
    return Math.min(...matching.map(perDayEur));
  }, [availablePackages, selectedGb]);

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
    const base = availablePackages[0];
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
          Land auswählen
        </h3>

        <input
          type="search"
          value={countrySearch}
          onChange={(e) => setCountrySearch(e.target.value)}
          placeholder="Land suchen…"
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
              Geschwindigkeit nach Datenlimit
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {(
                [
                  { type: 'unlimited_eco' as TariffType, icon: '♾️', label: 'Unlimited Eco', sub: 'Nach Datenlimit: 512 kbps' },
                  { type: 'unlimited_pro' as TariffType, icon: '⚡', label: 'Unlimited Pro', sub: 'Nach Datenlimit: ≥ 1 Mbps' },
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
                    <p className="text-2xl mb-1">{icon}</p>
                    <p className="font-semibold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
                    {!hasPackages && <p className="text-xs text-red-400 mt-1">Nicht verfügbar</p>}
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
                Tägliches Highspeed-Volumen
              </h3>
              <p className="mb-4 text-xs text-slate-500 flex items-center gap-1.5 ml-8">
                🔄 Das Highspeed-Volumen erneuert sich täglich um Mitternacht (UTC). Danach unbegrenzt mit reduzierter Geschwindigkeit.
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
                    {gb} GB / Tag
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
                Laufzeit & Preis
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
                    <p className="text-slate-500">
                      {tariffType === 'unlimited_eco' ? '♾️ Unlimited Eco' : '⚡ Unlimited Pro'}
                      &ensp;·&ensp;{selectedGb} GB/Tag
                      &ensp;·&ensp;{days} {days === 1 ? 'Tag' : 'Tage'}
                    </p>
                    {/* Operator info */}
                    {availablePackages[0] && getOperators(availablePackages[0]).length > 0 && (
                      <p className="text-xs text-slate-400">
                        📡 {getOperators(availablePackages[0]).join(' · ')}
                      </p>
                    )}
                  </div>

                  <div className="text-right shrink-0">
                    {discount > 0 && priceBeforeDiscount !== null && (
                      <p className="text-sm text-slate-400 line-through">{formatEur(priceBeforeDiscount)}</p>
                    )}
                    <p className="text-3xl font-extrabold text-brand-700">
                      {finalPrice !== null ? formatEur(finalPrice) : '–'}
                    </p>
                    {discount > 0 && (
                      <p className="text-xs font-semibold text-green-700">−{Math.round(discount * 100)}% Rabatt</p>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => syntheticTariff && setCheckoutTariff(syntheticTariff)}
                  disabled={!syntheticTariff}
                  className="mt-4 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  Jetzt kaufen · {finalPrice !== null ? formatEur(finalPrice) : '–'}
                </button>
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
          onClose={() => setCheckoutTariff(null)}
        />
      )}
    </div>
  );
}
