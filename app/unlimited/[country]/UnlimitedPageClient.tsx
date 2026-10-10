'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { PublicTariff } from '@/lib/tariffs';
import type { Destination } from '@/lib/destinations';
import { UnlimitedConfigurator } from '@/components/UnlimitedConfigurator';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import { EcoIcon, BoltIcon, InfinityIcon } from '@/components/Icons';

interface UnlimitedPageClientProps {
  destination: Destination;
  tariffs: PublicTariff[];
  countryLabel: string;
  allDestinations: Array<{ code: string; name: string; flag?: string | null; slug: string }>;
  minPrice: number;
  minPerDay: number;
}

export function UnlimitedPageClient({
  destination,
  tariffs,
  countryLabel,
  allDestinations,
  minPrice,
  minPerDay,
}: UnlimitedPageClientProps) {
  const { t, locale } = useTranslation();
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;

  const [activeCategory, setActiveCategory] = useState<'unlimited_eco' | 'unlimited_pro'>('unlimited_eco');

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 md:py-12">
      {/* ── Breadcrumb ── */}
      <nav aria-label="Breadcrumb" className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        <Link href={prefix || "/"} className="hover:text-brand-600 transition-colors">
          {t('nav_home' as any) || 'Home'}
        </Link>
        <span>/</span>
        <Link href={`${prefix}/tariffs`} className="hover:text-brand-600 transition-colors">
          {t('nav_tariffs') || 'eSIM'}
        </Link>
        <span>/</span>
        <Link href={`${prefix}/esim/${destination.slug}`} className="hover:text-brand-600 transition-colors">
          {countryLabel}
        </Link>
        <span>/</span>
        <span className="font-semibold text-slate-800">Unlimited Builder</span>
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
                  <InfinityIcon size={13} /> {isDe ? 'Unbegrenzt surfen' : 'Unlimited Data'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 border border-brand-200 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                  ⚡ {isDe ? 'Sofort-Aktivierung' : 'Instant QR Code'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                  📅 1–365 {isDe ? 'Tage frei wählbar' : 'Days flexible'}
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
                {isDe ? `Unlimited eSIM ${countryLabel}` : `Unlimited eSIM ${countryLabel}`}
              </h1>
              <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl leading-relaxed">
                {isDe
                  ? `Prepaid Highspeed-Datenvolumen für ${countryLabel} mit flexibler Laufzeit von 1 bis 365 Tagen. Kein Roaming, keine Vertragsbindung und nach dem täglichen Highspeed-Volumen unbegrenzt mit 512 kbps weiter surfen.`
                  : `Prepaid high-speed data for ${countryLabel} with customizable duration from 1 to 365 days. Zero roaming fees, no contract, and unlimited browsing after your daily high-speed allowance.`}
              </p>
            </div>
          </div>

          {/* Quick Price Highlights Card */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-3 rounded-2xl bg-white p-4 border border-slate-200/90 shadow-xs shrink-0 min-w-[220px]">
            <div className="flex items-baseline justify-between md:justify-start md:gap-3">
              <span className="text-xs text-slate-500 font-medium">
                {isDe ? 'Startpreis ab' : 'Starting from'}
              </span>
              <Price eur={minPrice} className="text-2xl font-black text-emerald-600" />
            </div>

            {minPerDay > 0 && (
              <div className="text-xs text-slate-600 border-t border-slate-100 pt-2 flex items-center justify-between">
                <span>{isDe ? 'Tagespreis ab' : 'Daily rate from'}</span>
                <span className="font-bold text-slate-800">
                  <Price eur={minPerDay} /> {t('unit_per_day' as any) || (isDe ? '/ Tag' : '/ day')}
                </span>
              </div>
            )}

            <div className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 flex items-center justify-between">
              <Link
                href={`${prefix}/esim/${destination.slug}`}
                className="text-brand-600 hover:text-brand-700 font-medium hover:underline inline-flex items-center gap-1"
              >
                ← {t('all_plans' as any) || (isDe ? `Alle Tarife für ${countryLabel}` : `All plans for ${countryLabel}`)}
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
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full">{isDe ? 'Aktiv' : 'Active'}</span>
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
                  <span className="text-xs font-bold bg-violet-100 text-violet-800 px-2.5 py-0.5 rounded-full">{isDe ? 'Aktiv' : 'Active'}</span>
                )}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{t('tp_pro_desc')}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-slate-200 flex flex-wrap gap-2">
          <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_3')}</span>
          <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_7')}</span>
          <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_14')}</span>
          <span className="rounded-full bg-green-100 border border-green-200 px-3 py-1 text-xs font-semibold text-green-800">{t('tp_disc_30')}</span>
        </div>
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
        />
      </section>

      {/* ── SEO FAQ Section ── */}
      <section className="rounded-3xl border border-slate-200 bg-white p-6 md:p-10 shadow-xs">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">
          {t('faq_title_unlimited' as any, { country: countryLabel }) || (isDe
            ? `Häufig gestellte Fragen zu Unlimited eSIM für ${countryLabel}`
            : `Frequently Asked Questions about Unlimited eSIM for ${countryLabel}`)}
        </h2>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? 'Wie funktioniert das tägliche Highspeed-Volumen?'
                : 'How does the daily high-speed data allowance work?'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Du erhältst jeden Kalendertag dein gewähltes Highspeed-Volumen (z. B. 1 GB, 2 GB oder 3 GB). Das Volumen setzt sich alle 24 Stunden automatisch zurück. Versteckte Kosten oder Roaming-Aufpreise gibt es nicht.'
                : 'You receive your chosen high-speed allowance every day (e.g. 1 GB, 2 GB, or 3 GB). It resets automatically every 24 hours with zero roaming fees or extra costs.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? 'Was passiert nach Verbrauch des täglichen Volumens?'
                : 'What happens after using up daily high-speed data?'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Deine Internetverbindung bricht niemals ab. Bei Unlimited Eco surfst du mit 512 kbps unbegrenzt weiter – ideal für WhatsApp, Google Maps und E-Mails. Bei Unlimited Pro beträgt die Drosselung mindestens 1 Mbps.'
                : 'Your connection never cuts off. With Unlimited Eco, you continue browsing unlimited at 512 kbps — perfect for messaging and navigation. With Unlimited Pro, speed remains at least 1 Mbps.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? `Wie aktiviere ich die eSIM in ${countryLabel}?`
                : `How do I activate the eSIM in ${countryLabel}?`}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Direkt nach der Bestellung erhältst du deinen QR-Code per E-Mail und im Kundenbereich. Scanne ihn einfach mit deiner Kamera unter Einstellungen > Mobilfunk > eSIM hinzufügen.'
                : 'Right after checkout, you receive your QR code via email and in your customer dashboard. Simply scan it in Settings > Cellular/Mobile > Add eSIM.'}
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50/70 p-5 border border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm md:text-base mb-2">
              {isDe
                ? 'Wann beginnt die Gültigkeit der gewählten Laufzeit?'
                : 'When does the selected validity period start?'}
            </h3>
            <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
              {isDe
                ? 'Deine gebuchte Laufzeit (z. B. 7 oder 14 Tage) beginnt erst in dem Augenblick, in dem sich die eSIM zum ersten Mal in ein unterstütztes Mobilfunknetz vor Ort einbucht.'
                : 'Your booked validity period only starts counting down when your eSIM first connects to a supported carrier network at your destination.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
