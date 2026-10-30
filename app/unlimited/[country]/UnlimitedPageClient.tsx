'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { PublicTariff } from '@/lib/tariffs';
import type { Destination } from '@/lib/destinations';
import type { UnlimitedPriceTable, ClientTier } from '@/lib/pricing';
import { UnlimitedConfigurator } from '@/components/UnlimitedConfigurator';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import { formatDayRangeWithUnit, formatPercent } from '@/lib/i18n/plural';
import { EcoIcon, BoltIcon, InfinityIcon } from '@/components/Icons';

interface UnlimitedPageClientProps {
  destination: Destination;
  tariffs: PublicTariff[];
  countryLabel: string;
  allDestinations?: Array<{ code: string; name: string; flag?: string | null; slug: string }>;
  minPrice: number;
  minPerDay: number;
  priceTables?: Record<string, UnlimitedPriceTable>;
}

export function UnlimitedPageClient({
  destination,
  tariffs,
  countryLabel,
  allDestinations,
  minPrice,
  minPerDay,
  priceTables,
}: UnlimitedPageClientProps) {
  const { t, locale } = useTranslation();
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;

  const [activeCategory, setActiveCategory] = useState<'unlimited_eco' | 'unlimited_pro'>('unlimited_eco');

  const tiers: ClientTier[] = useMemo(() => {
    if (priceTables) {
      for (const pt of Object.values(priceTables)) {
        if (pt?.tiers && pt.tiers.length > 0) return pt.tiers;
      }
    }
    return [];
  }, [priceTables]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* ── Breadcrumb ── */}
      <nav aria-label={t('aria_breadcrumb' as any) || 'Breadcrumb'} className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href={prefix || "/"} className="min-h-[44px] inline-flex items-center py-2 px-1 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm">
          {t('nav_home' as any) || 'Home'}
        </Link>
        <span>/</span>
        <Link
          href={`${prefix}/tariffs`}
          data-testid="breadcrumb-tariffs-link"
          className="relative min-h-[44px] inline-flex items-center py-2 px-1 text-xs text-slate-500 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm"
        >
          {t('nav_tariffs') || 'eSIM'}
        </Link>
        <span>/</span>
        <Link href={`${prefix}/esim/${destination.slug}`} className="min-h-[44px] inline-flex items-center py-2 px-1 hover:text-brand-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm">
          {countryLabel}
        </Link>
        <span>/</span>
        <span aria-current="page" className="font-semibold text-slate-800">Unlimited Builder</span>
      </nav>

      {/* ── Hero Header ── */}
      <section className="mb-8 rounded-3xl border border-slate-200/80 bg-gradient-to-br from-white via-slate-50/50 to-brand-50/30 p-6 md:p-10 shadow-sm">
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
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  <InfinityIcon size={13} /> {t('badge_unlimited_surf' as any) || (isDe ? 'Unbegrenzt surfen' : 'Unlimited Data')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  ⚡ {t('badge_instant_activation' as any) || (isDe ? 'Sofort-Aktivierung' : 'Instant QR Code')}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  📅 {t('badge_flexible_days' as any) || (isDe ? '1–365 Tage frei wählbar' : '1–365 Days flexible')}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {`Unlimited eSIM ${countryLabel}`}
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                {t('unlimited_hero_desc' as any, { country: countryLabel }) || (isDe
                  ? `Prepaid Highspeed-Datenvolumen für ${countryLabel} mit flexibler Laufzeit von 1 bis 365 Tagen. Kein Roaming, keine Vertragsbindung und nach dem täglichen Highspeed-Volumen unbegrenzt mit 512 kbps weiter surfen.`
                  : `Prepaid high-speed data for ${countryLabel} with customizable duration from 1 to 365 days. Zero roaming fees, no contract, and unlimited browsing after your daily high-speed allowance.`)}
              </p>
            </div>
          </div>

          {/* Quick Price Highlights Card */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs shrink-0 min-w-[220px]">
            <div className="flex items-baseline justify-between md:justify-start md:gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {t('starting_price_from' as any) || (isDe ? 'Startpreis ab' : 'Starting from')}
              </span>
              <Price eur={minPrice} className="text-2xl font-black text-emerald-600" />
            </div>

            {minPerDay > 0 && (
              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{t('daily_price_from' as any) || (isDe ? 'Tagespreis ab' : 'Daily rate from')}</span>
                <span className="font-bold text-slate-800">
                  <Price eur={minPerDay} /> {t('unit_per_day' as any)}
                </span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-1 flex items-center justify-between">
              <Link
                href={`${prefix}/esim/${destination.slug}`}
                className="min-h-[44px] text-brand-600 hover:text-brand-700 font-medium hover:underline inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-sm py-2 px-1"
              >
                ← {t('all_plans_country' as any, { country: countryLabel }) || (isDe ? `Alle Tarife für ${countryLabel}` : `All plans for ${countryLabel}`)}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Category / Tier Switcher Bar (Reused from /tariffs) ── */}
      <div className="mb-6 rounded-2xl bg-gradient-to-r from-emerald-50 via-white to-violet-50 border border-slate-200 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div
            onClick={() => setActiveCategory('unlimited_eco')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              activeCategory === 'unlimited_eco'
                ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300 shadow-xs'
                : 'border-slate-200/80 bg-white/80 hover:border-emerald-300'
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5"><EcoIcon size={24} /></span>
            <div>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>{t('tp_eco_title')}</span>
                {activeCategory === 'unlimited_eco' && (
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">{t('badge_active' as any) || (isDe ? 'Aktiv' : 'Active')}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t('tp_eco_desc', { speed: '512 kbps' })}</p>
            </div>
          </div>

          <div
            onClick={() => setActiveCategory('unlimited_pro')}
            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
              activeCategory === 'unlimited_pro'
                ? 'border-violet-500 bg-violet-50/80 ring-2 ring-violet-300 shadow-xs'
                : 'border-slate-200/80 bg-white/80 hover:border-violet-300'
            }`}
          >
            <span className="text-2xl shrink-0 mt-0.5"><BoltIcon size={24} className="text-violet-600" /></span>
            <div>
              <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                <span>{t('tp_pro_title')}</span>
                {activeCategory === 'unlimited_pro' && (
                  <span className="text-xs font-bold bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-full">{t('badge_active' as any) || (isDe ? 'Aktiv' : 'Active')}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t('tp_pro_desc')}</p>
            </div>
          </div>
        </div>

        {tiers.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
            {tiers
              .filter((tier) => tier.discountPct > 0)
              .map((tier) => (
                <span
                  key={tier.minDays}
                  className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-800"
                >
                  {formatDayRangeWithUnit(tier.minDays, tier.maxDays, locale)} {formatPercent(tier.discountPct, locale, { negative: true })}
                </span>
              ))}
          </div>
        ) : null}
      </div>

      {/* ── Reused Unlimited Builder Studio ── */}
      <section className="mb-14">
        <UnlimitedConfigurator
          tariffs={tariffs}
          initialCountryCode={destination.code}
          initialTariffType={activeCategory}
          onTariffTypeChange={(type) => setActiveCategory(type)}
          allDestinations={allDestinations}
          isStandaloneRoute={true}
          priceTables={priceTables}
        />
      </section>

      {/* ── FAQ Reference Link ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg md:text-xl font-bold text-slate-900 mb-1">
            {t('faq_title' as any) || (isDe ? 'Häufig gestellte Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)')}
          </h2>
          <p className="text-xs md:text-sm text-slate-600">
            {t('faq_teaser_unlimited_desc' as any, { country: countryLabel })}
          </p>
        </div>
        <Link
          href={`${prefix}/faq`}
          className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-brand-50 border border-brand-200 px-5 py-2.5 text-xs md:text-sm font-bold text-brand-700 hover:bg-brand-100 transition-all shrink-0"
        >
          <span>{t('faq_teaser_btn' as any)}</span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>
    </div>
  );
}
