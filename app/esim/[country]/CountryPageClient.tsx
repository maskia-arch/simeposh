'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { PublicTariff } from '@/lib/tariffs';
import type { Destination } from '@/lib/destinations';
import { TariffsGrid } from '@/components/TariffsGrid';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import { formatGb } from '@/lib/utils';
import { displayCountryName, getTariffOperators, bestNetworkType } from '@/lib/tariff-display';
import { TravelGlobeIcon, InfinityIcon, EcoIcon, BoltIcon, NetworkIcon } from '@/components/Icons';

interface CountryPageClientProps {
  destination: Destination;
  tariffs: PublicTariff[];
  countryLabel: string;
}

export function CountryPageClient({
  destination,
  tariffs,
  countryLabel,
}: CountryPageClientProps) {
  const { t, locale } = useTranslation();
  const isDe = locale === 'de';
  const prefix = isDe ? '' : '/en';

  type CategoryTab = 'all' | 'travel' | 'unlimited';
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');

  const travelTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'travel' || !t.tariff_type?.startsWith('unlimited')),
    [tariffs]
  );

  const unlimitedTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0),
    [tariffs]
  );

  const displayedTariffs = useMemo(() => {
    if (activeTab === 'travel') return travelTariffs;
    if (activeTab === 'unlimited') return unlimitedTariffs;
    return tariffs;
  }, [activeTab, tariffs, travelTariffs, unlimitedTariffs]);

  // Dynamic pricing metrics
  const minPrice = tariffs.length > 0
    ? Math.min(...tariffs.map((t) => t.sale_price_eur))
    : 0;

  const minTravelTariff = travelTariffs.length > 0
    ? travelTariffs.reduce((prev, curr) => (curr.sale_price_eur < prev.sale_price_eur ? curr : prev))
    : null;

  const minUnlimitedPerDay = unlimitedTariffs.length > 0
    ? Math.min(...unlimitedTariffs.map((t) => t.sale_price_eur / Math.max(1, t.validity_days || 1)))
    : null;

  // Collect unique local operators
  const operators = useMemo(() => {
    const set = new Set<string>();
    for (const t of tariffs) {
      const ops = getTariffOperators(t, 6);
      for (const op of ops) {
        if (op.name) set.add(op.name);
      }
    }
    return Array.from(set).slice(0, 5);
  }, [tariffs]);

  // Has 5G capability?
  const has5G = useMemo(() => {
    return tariffs.some((t) => {
      const ops = getTariffOperators(t, 4);
      return bestNetworkType(ops) === '5G';
    });
  }, [tariffs]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        <Link href={prefix || "/"} className="hover:text-brand-600 transition-colors">
          {isDe ? 'Startseite' : 'Home'}
        </Link>
        <span>/</span>
        <Link href={`${prefix}/tariffs`} className="hover:text-brand-600 transition-colors">
          {isDe ? 'eSIM Tarife' : 'eSIM Plans'}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">{countryLabel}</span>
      </nav>

      {/* ── Hero Header ── */}
      <section className="mb-10 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-brand-50/30 p-6 md:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-5">
            <div className="flex h-16 w-16 md:h-20 md:w-20 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100 overflow-hidden">
              <CountryFlag
                countryCode={destination.code}
                countryName={countryLabel}
                size={54}
                className="object-cover"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  ⚡ {isDe ? 'Sofort-Aktivierung' : 'Instant QR Code'}
                </span>
                {has5G && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    5G Highspeed
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {tariffs.length} {isDe ? 'verfügbare Tarife' : 'available plans'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {isDe ? `eSIM für ${countryLabel}` : `eSIM for ${countryLabel}`}
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                {isDe
                  ? `Prepaid Highspeed-Datenvolumen für deine Reise nach ${countryLabel}. Keine Roaming-Gebühren, kein SIM-Kartenwechsel und transparente Festpreise.`
                  : `Prepaid high-speed data for your travel to ${countryLabel}. Zero roaming fees, no physical SIM swap, and fair fixed rates.`}
              </p>
            </div>
          </div>

          {/* Quick Price Highlights Card */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs shrink-0 min-w-[220px]">
            <div className="flex items-baseline justify-between md:justify-start md:gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {isDe ? 'Tarife ab' : 'Starting from'}
              </span>
              <Price eur={minPrice} className="text-2xl font-black text-brand-600" />
            </div>

            {minTravelTariff && (
              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{formatGb(minTravelTariff.data_gb)} ({minTravelTariff.validity_days} {isDe ? 'Tage' : 'Days'})</span>
                <span className="font-bold text-slate-800"><Price eur={minTravelTariff.sale_price_eur} /></span>
              </div>
            )}

            {minUnlimitedPerDay !== null && (
              <Link
                href={`${prefix}/unlimited/${destination.slug}`}
                className="text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between group hover:text-brand-600 transition-colors"
                title={isDe ? `Unlimited-Tarif für ${countryLabel} anpassen` : `Customize Unlimited plan for ${countryLabel}`}
              >
                <span className="flex items-center gap-1 font-semibold text-emerald-700 group-hover:underline">
                  <InfinityIcon size={12} className="text-emerald-600" /> Unlimited
                </span>
                <span className="font-bold text-emerald-600">
                  ab {minUnlimitedPerDay.toFixed(2).replace('.', ',')} € / {isDe ? 'Tag' : 'day'} →
                </span>
              </Link>
            )}

            {operators.length > 0 && (
              <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center gap-1.5">
                <NetworkIcon size={12} className="text-slate-400 shrink-0" />
                <span className="truncate">{operators.join(' · ')}</span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Category Filter Switcher ── */}
      <section className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`rounded-xl px-4 py-2 text-xs md:text-sm font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {isDe ? 'Alle Tarife' : 'All Plans'} ({tariffs.length})
          </button>

          {travelTariffs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('travel')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs md:text-sm font-bold transition-all ${
                activeTab === 'travel'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TravelGlobeIcon size={14} className="currentColor" />
              <span>{isDe ? 'Datenpakete' : 'Travel Data'}</span> ({travelTariffs.length})
            </button>
          )}

          {unlimitedTariffs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('unlimited')}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs md:text-sm font-bold transition-all ${
                activeTab === 'unlimited'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <InfinityIcon size={14} />
              <span>Unlimited</span> ({unlimitedTariffs.length})
            </button>
          )}
        </div>

        <p className="text-xs text-slate-500">
          {isDe
            ? `${displayedTariffs.length} Tarife für ${countryLabel}`
            : `${displayedTariffs.length} plans for ${countryLabel}`}
        </p>
      </section>

      {/* ── Unlimited Builder Callout ── */}
      {unlimitedTariffs.length > 0 && (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5"><EcoIcon size={24} /></span>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                {isDe
                  ? `Eigenen Unlimited-Tarif für ${countryLabel} zusammenstellen`
                  : `Build your custom Unlimited plan for ${countryLabel}`}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {isDe
                  ? `Wähle dein tägliches Highspeed-Volumen und die genaue Reisedauer von 1 bis 365 Tagen im PureSim Unlimited-Builder für ${countryLabel}.`
                  : `Choose your daily high-speed volume and exact trip length from 1 to 365 days in the PureSim Unlimited builder for ${countryLabel}.`}
              </p>
            </div>
          </div>
          <Link
            href={`${prefix}/unlimited/${destination.slug}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <span>{isDe ? 'Zum Unlimited-Builder' : 'Go to Unlimited Builder'}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      {/* ── Tariffs Grid ── */}
      <section className="mb-14">
        <TariffsGrid tariffs={displayedTariffs} />
      </section>

      {/* ── SEO & FAQ Section ── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {isDe
            ? `Häufig gestellte Fragen zur eSIM für ${countryLabel}`
            : `Frequently Asked Questions about ${countryLabel} eSIM`}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? `Wie aktiviere ich die eSIM in ${countryLabel}?`
                : `How do I activate the eSIM in ${countryLabel}?`}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Nach dem Kauf erhältst du sofort einen QR-Code per E-Mail und in deinem Dashboard. Scanne den Code einfach mit deiner Smartphone-Kamera unter Einstellungen > Mobilfunk > eSIM hinzufügen.'
                : 'Immediately after purchase, you will receive a QR code via email and in your dashboard. Simply scan it under Settings > Cellular/Mobile > Add eSIM.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? `Welche Netze werden in ${countryLabel} genutzt?`
                : `Which networks are used in ${countryLabel}?`}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {operators.length > 0
                ? isDe
                  ? `PureSim verbindet sich automatisch mit den führenden lokalen Mobilfunknetzen (${operators.join(', ')}), um dir stets die beste Signalstärke und höchste Bandbreite (LTE/5G) zu bieten.`
                  : `PureSim connects automatically to leading local carriers (${operators.join(', ')}), providing optimal coverage and high-speed data.`
                : isDe
                  ? 'PureSim verbindet sich automatisch mit den stärksten lokalen Mobilfunkpartnern vor Ort.'
                  : 'PureSim connects automatically to local top-tier carriers.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? 'Wann beginnt die Gültigkeit des Tarifs?'
                : 'When does the validity period start?'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Bei PureSim beginnt die gebuchte Laufzeit erst in dem Moment, in dem sich deine eSIM zum ersten Mal mit einem Mobilfunknetz vor Ort verbindet.'
                : 'With PureSim, your plan validity only starts when your eSIM first connects to a supported cellular network at your destination.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? 'Behalte ich meine gewohnte WhatsApp-Nummer?'
                : 'Can I keep my existing WhatsApp number?'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Ja! Deine eSIM dient als reine Datenverbindung. Alle Messenger-Dienste wie WhatsApp, Telegram und Signal funktionieren unverändert mit deiner gewohnten Rufnummer weiter.'
                : 'Yes! Your eSIM handles mobile data. All apps including WhatsApp, Telegram, and iMessage continue working with your existing phone number.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
