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
import { displayCountryName, getTariffOperators, bestNetworkType, isPremiumTariff } from '@/lib/tariff-display';
import { TravelGlobeIcon, InfinityIcon, EcoIcon, BoltIcon, NetworkIcon, TravelPremiumGlobeIcon } from '@/components/Icons';

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
  const prefix = isDe ? '' : `/${locale}`;

  type CategoryTab = 'all' | 'travel_standard' | 'travel_premium' | 'unlimited';
  const [activeTab, setActiveTab] = useState<CategoryTab>('all');

  const sortTariffs = (list: PublicTariff[]): PublicTariff[] => {
    return [...list].sort((a, b) => {
      // 1. Data volume GB ASC
      const gbA = Number(a.data_gb ?? 0);
      const gbB = Number(b.data_gb ?? 0);
      if (gbA !== gbB) return gbA - gbB;

      // 2. Validity days ASC
      const daysA = Number(a.validity_days ?? 0);
      const daysB = Number(b.validity_days ?? 0);
      if (daysA !== daysB) return daysA - daysB;

      // 3. Price ASC
      const priceA = Number(a.customer_price_eur ?? a.sale_price_eur ?? 0);
      const priceB = Number(b.customer_price_eur ?? b.sale_price_eur ?? 0);
      return priceA - priceB;
    });
  };

  const travelTariffs = useMemo(
    () => tariffs.filter((t) => t.tariff_type === 'travel' || !t.tariff_type?.startsWith('unlimited')),
    [tariffs]
  );

  const travelStandardTariffs = useMemo(
    () => sortTariffs(travelTariffs.filter((t) => !isPremiumTariff(t))),
    [travelTariffs]
  );

  const travelPremiumTariffs = useMemo(
    () => sortTariffs(travelTariffs.filter((t) => isPremiumTariff(t))),
    [travelTariffs]
  );

  const unlimitedTariffs = useMemo(
    () => sortTariffs(tariffs.filter((t) => t.tariff_type?.startsWith('unlimited') || t.data_gb === 0)),
    [tariffs]
  );

  const displayedCount = useMemo(() => {
    if (activeTab === 'travel_standard') return travelStandardTariffs.length;
    if (activeTab === 'travel_premium') return travelPremiumTariffs.length;
    if (activeTab === 'unlimited') return unlimitedTariffs.length;
    return tariffs.length;
  }, [activeTab, tariffs.length, travelStandardTariffs.length, travelPremiumTariffs.length, unlimitedTariffs.length]);

  // Dynamic pricing metrics
  const minPrice = tariffs.length > 0
    ? Math.min(...tariffs.map((t) => t.customer_price_eur ?? t.sale_price_eur))
    : 0;

  const minTravelTariff = travelTariffs.length > 0
    ? travelTariffs.reduce((prev, curr) => ((curr.customer_price_eur ?? curr.sale_price_eur) < (prev.customer_price_eur ?? prev.sale_price_eur) ? curr : prev))
    : null;

  const minUnlimitedPerDay = unlimitedTariffs.length > 0
    ? Math.min(...unlimitedTariffs.map((t) => t.customer_price_eur ?? (t.sale_price_eur / Math.max(1, t.validity_days || 1))))
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
      <nav aria-label={t('aria_breadcrumb' as any) || 'Breadcrumb'} className="mb-6 flex items-center gap-2 text-xs text-slate-500">
        <Link href={prefix || "/"} className="hover:text-brand-600 transition-colors">
          {t('nav_home' as any) || 'Home'}
        </Link>
        <span>/</span>
        <Link
          href={`${prefix}/tariffs`}
          data-testid="breadcrumb-tariffs-link"
          className="relative inline-flex items-center text-xs text-slate-500 hover:text-brand-600 transition-colors after:absolute after:-inset-y-[14px] after:-inset-x-2 after:content-['']"
        >
          {t('nav_tariffs') || 'eSIM'}
        </Link>
        <span>/</span>
        <span aria-current="page" className="font-semibold text-slate-800">{countryLabel}</span>
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
                  ⚡ {t('badge_instant_activation' as any) || (isDe ? 'Sofort-Aktivierung' : 'Instant QR Code')}
                </span>
                {has5G && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 border border-violet-200 px-2.5 py-0.5 text-xs font-semibold text-violet-700">
                    {t('feat_5g_badge' as any) || '5G Highspeed'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  {t('available_plans' as any, { count: tariffs.length }) || (isDe ? `${tariffs.length} verfügbare Tarife` : `${tariffs.length} available plans`)}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {t('esim_for_country' as any, { country: countryLabel }) || `eSIM for ${countryLabel}`}
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                {t('country_hero_desc' as any, { country: countryLabel }) || (isDe
                  ? `Prepaid Highspeed-Datenvolumen für deine Reise nach ${countryLabel}. Keine Roaming-Gebühren, kein SIM-Kartenwechsel und transparente Festpreise.`
                  : `Prepaid high-speed data for your travel to ${countryLabel}. Zero roaming fees, no physical SIM swap, and fair fixed rates.`)}
              </p>
            </div>
          </div>

          {/* Quick Price Highlights Card */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs shrink-0 min-w-[220px]">
            <div className="flex items-baseline justify-between md:justify-start md:gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {t('starting_from' as any) || (isDe ? 'Tarife ab' : 'Starting from')}
              </span>
              <Price eur={minPrice} className="text-2xl font-black text-brand-600" />
            </div>

            {minTravelTariff && (
              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{formatGb(minTravelTariff.data_gb)} ({minTravelTariff.validity_days} {t('unit_days' as any) || (isDe ? 'Tage' : 'Days')})</span>
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
                <span className="font-bold text-emerald-600 inline-flex items-center gap-1">
                  <span>{t('from_prefix' as any) || (isDe ? 'ab ' : 'from ')}</span><Price eur={minUnlimitedPerDay} /> {t('unit_per_day')} →
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
      <section className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2 p-1 bg-slate-100/80 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            aria-pressed={activeTab === 'all'}
            aria-controls="tariffs-list"
            className={`min-h-[44px] rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('all_plans' as any) || (isDe ? 'Alle Tarife' : 'All Plans')} ({tariffs.length})
          </button>

          {travelStandardTariffs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('travel_standard')}
              aria-pressed={activeTab === 'travel_standard'}
              aria-controls="tariffs-list"
              className={`min-h-[44px] flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'travel_standard'
                  ? 'bg-white text-brand-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TravelGlobeIcon size={14} className="currentColor" />
              <span>Travel Standard</span> ({travelStandardTariffs.length})
            </button>
          )}

          {travelPremiumTariffs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('travel_premium')}
              aria-pressed={activeTab === 'travel_premium'}
              aria-controls="tariffs-list"
              className={`min-h-[44px] flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'travel_premium'
                  ? 'bg-white text-amber-950 shadow-xs ring-1 ring-amber-400'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TravelPremiumGlobeIcon size={14} className="text-amber-950" />
              <span>Travel Premium</span> ({travelPremiumTariffs.length})
            </button>
          )}

          {unlimitedTariffs.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab('unlimited')}
              aria-pressed={activeTab === 'unlimited'}
              aria-controls="tariffs-list"
              className={`min-h-[44px] flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs md:text-sm font-bold transition-all cursor-pointer ${
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
          {t('plans_for_country' as any, { count: displayedCount, country: countryLabel }) || (isDe
            ? `${displayedCount} Tarife für ${countryLabel}`
            : `${displayedCount} plans for ${countryLabel}`)}
        </p>
      </section>

      {/* ── Unlimited Builder Callout ── */}
      {unlimitedTariffs.length > 0 && (
        <section className="mb-8 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50/50 to-emerald-50 border border-emerald-200 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0 mt-0.5"><EcoIcon size={24} /></span>
            <div>
              <h2 className="text-sm md:text-base font-bold text-slate-900">
                {t('builder_callout_title' as any, { country: countryLabel }) || (isDe
                  ? `Eigenen Unlimited-Tarif für ${countryLabel} zusammenstellen`
                  : `Build your custom Unlimited plan for ${countryLabel}`)}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5 max-w-xl">
                {t('builder_callout_desc' as any, { country: countryLabel }) || (isDe
                  ? `Wähle dein tägliches Highspeed-Volumen und die genaue Reisedauer von 1 bis 365 Tagen im PureSim Unlimited-Builder für ${countryLabel}.`
                  : `Choose your daily high-speed volume and exact trip length from 1 to 365 days in the PureSim Unlimited builder for ${countryLabel}.`)}
              </p>
            </div>
          </div>
          <Link
            href={`${prefix}/unlimited/${destination.slug}`}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 px-5 text-sm font-semibold text-white shadow-sm transition-colors shrink-0 cursor-pointer"
          >
            <span>{t('btn_go_unlimited_builder' as any) || (isDe ? 'Zum Unlimited-Builder' : 'Go to Unlimited Builder')}</span>
            <span aria-hidden="true">→</span>
          </Link>
        </section>
      )}

      {/* ── Tariffs Sections in Fixed Order: Travel Standard -> Travel Premium -> Unlimited ── */}
      <div id="tariffs-list" className="space-y-12 mb-14">
        {(activeTab === 'all' || activeTab === 'travel_standard') && travelStandardTariffs.length > 0 && (
          <section id="section-travel-standard">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <TravelGlobeIcon size={20} className="text-brand-600" />
              <span>Travel Standard</span>
              <span className="text-sm font-normal text-slate-600">({travelStandardTariffs.length})</span>
            </h2>
            <TariffsGrid tariffs={travelStandardTariffs} />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'travel_premium') && travelPremiumTariffs.length > 0 && (
          <section id="section-travel-premium">
            <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-5 flex items-center gap-2">
              <TravelPremiumGlobeIcon size={20} className="text-amber-700" />
              <span>Travel Premium</span>
              <span className="text-sm font-normal text-slate-600">({travelPremiumTariffs.length})</span>
            </h2>
            <TariffsGrid tariffs={travelPremiumTariffs} />
          </section>
        )}

        {(activeTab === 'all' || activeTab === 'unlimited') && unlimitedTariffs.length > 0 && (
          <section id="section-unlimited">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900 flex items-center gap-2">
                <InfinityIcon size={20} className="text-emerald-600" />
                <span>Unlimited</span>
                <span className="text-sm font-normal text-slate-600">({unlimitedTariffs.length})</span>
              </h2>
              <Link
                href={`${prefix}/unlimited/${destination.slug}`}
                className="text-xs md:text-sm font-bold text-emerald-700 hover:text-emerald-800 transition-colors"
              >
                {t('btn_go_unlimited_builder' as any) || (isDe ? 'Zum Unlimited-Builder' : 'Go to Unlimited Builder')} →
              </Link>
            </div>
            <TariffsGrid tariffs={unlimitedTariffs} />
          </section>
        )}
      </div>

      {/* ── SEO & FAQ Section ── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {t('faq_country_title' as any, { country: countryLabel }) || (isDe
            ? `Häufig gestellte Fragen zur eSIM für ${countryLabel}`
            : `Frequently Asked Questions about eSIM for ${countryLabel}`)}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {t('faq_country_q1' as any, { country: countryLabel }) || (isDe
                ? `Wie aktiviere ich die eSIM in ${countryLabel}?`
                : `How do I activate the eSIM in ${countryLabel}?`)}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {t('faq_country_a1' as any, { country: countryLabel }) || (isDe
                ? 'Nach dem Kauf erhältst du sofort einen QR-Code per E-Mail und in deinem Dashboard. Scanne den Code einfach mit deiner Smartphone-Kamera unter Einstellungen > Mobilfunk > eSIM hinzufügen.'
                : 'Immediately after purchase, you will receive a QR code via email and in your dashboard. Simply scan it under Settings > Cellular/Mobile > Add eSIM.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {t('faq_country_q2' as any, { country: countryLabel }) || (isDe
                ? `Welche Netze werden in ${countryLabel} genutzt?`
                : `Which networks are used in ${countryLabel}?`)}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {operators.length > 0
                ? t('faq_country_a2_ops' as any, { operators: operators.join(', '), country: countryLabel }) || (isDe
                  ? `PureSim verbindet sich automatisch mit den führenden lokalen Mobilfunknetzen (${operators.join(', ')}), um dir stets die beste Signalstärke und höchste Bandbreite (LTE/5G) zu bieten.`
                  : `PureSim connects automatically to leading local carriers (${operators.join(', ')}), providing optimal coverage and high-speed data.`)
                : t('faq_country_a2_fallback' as any, { country: countryLabel }) || (isDe
                  ? 'PureSim verbindet sich automatisch mit den stärksten lokalen Mobilfunkpartnern vor Ort.'
                  : 'PureSim connects automatically to local top-tier carriers.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {t('faq_country_q3' as any, { country: countryLabel }) || (isDe
                ? 'Wann beginnt die Gültigkeit des Tarifs?'
                : 'When does the validity period start?')}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {t('faq_country_a3' as any, { country: countryLabel }) || (isDe
                ? 'Bei PureSim beginnt die gebuchte Laufzeit erst in dem Moment, in dem sich deine eSIM zum ersten Mal mit einem Mobilfunknetz vor Ort verbindet.'
                : 'With PureSim, your plan validity only starts when your eSIM first connects to a supported cellular network at your destination.')}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {t('faq_country_q4' as any, { country: countryLabel }) || (isDe
                ? 'Behalte ich meine gewohnte WhatsApp-Nummer?'
                : 'Can I keep my existing WhatsApp number?')}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {t('faq_country_a4' as any, { country: countryLabel }) || (isDe
                ? 'Ja! Deine eSIM dient als reine Datenverbindung. Alle Messenger-Dienste wie WhatsApp, Telegram und Signal funktionieren unverändert mit deiner gewohnten Rufnummer weiter.'
                : 'Yes! Your eSIM handles mobile data. All apps including WhatsApp, Telegram, and iMessage continue working with your existing phone number.')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
