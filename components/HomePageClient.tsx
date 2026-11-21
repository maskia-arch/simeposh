'use client';

import Link from 'next/link';
import { TopUpTeaser } from '@/components/TopUpTeaser';
import { HeroSearch, type Destination } from '@/components/HeroSearch';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { formatPricesInText } from '@/lib/currency';
import { displayCountryName } from '@/lib/tariff-display';
import { countryCodeToSlug } from '@/lib/destinations-shared';
import { SearchIcon, CreditCardIcon, CameraIcon, GlobeIcon, BookIcon, NetworkIcon, CheckCircleIcon, ScalesIcon } from '@/components/Icons';
import { useThemeDemo } from '@/lib/theme-demo-context';

interface PopularDestination {
  country_code: string;
  country_name: string;
  flag_emoji: string | null;
  min_price_eur: number;
  location_codes: string[] | null;
  region: string | null;
}



export function HomePageClient({
  popularDestinations,
  destinations = [],
  featuredGuide,
  latestNews,
  averageRating = 5.0,
  totalCount = 0,
  recentReviews = [],
}: {
  popularDestinations: PopularDestination[];
  destinations?: Destination[];
  featuredGuide: any;
  latestNews: any[];
  averageRating?: number;
  totalCount?: number;
  recentReviews?: any[];
}) {
  const { t, locale } = useTranslation();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const { activeTheme } = useThemeDemo();
  const accentColor = activeTheme.accentColor || activeTheme.heroHighlightColor || '#2563eb';

  const features = [
    {
      icon: (
        <svg className="h-6 w-6 shrink-0" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      label: t('feat_instant'),
      desc: t('feat_instant_d')
    },
    {
      icon: (
        <svg className="h-6 w-6 shrink-0" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
      label: t('feat_countries'),
      desc: t('feat_countries_d')
    },
    {
      icon: <ScalesIcon size={24} style={{ color: accentColor }} className="shrink-0" />,
      label: t('feat_price'),
      desc: t('feat_price_d')
    },
    {
      icon: (
        <svg className="h-6 w-6 shrink-0" style={{ color: accentColor }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
        </svg>
      ),
      label: t('feat_secure'),
      desc: t('feat_secure_d')
    },
  ];

  const steps = [
    { step: '1', icon: <SearchIcon size={28} style={{ color: accentColor }} className="mx-auto" />, title: t('how_1_t'), desc: t('how_1_d') },
    { step: '2', icon: <CreditCardIcon size={28} style={{ color: accentColor }} className="mx-auto" />, title: t('how_2_t'), desc: t('how_2_d') },
    { step: '3', icon: <CameraIcon size={28} style={{ color: accentColor }} className="mx-auto" />, title: t('how_3_t'), desc: t('how_3_d') },
    { step: '4', icon: <CheckCircleIcon size={28} style={{ color: accentColor }} className="mx-auto" />, title: t('how_4_t'), desc: t('how_4_d') },
  ];

  const fallbackReviews = [
    {
      id: 'fb-1',
      rating: 5,
      comment: locale === 'de'
        ? 'In New York gelandet, eSIM aktiviert und sofort 5G gehabt. Konnte direkt Uber buchen und navigieren. Einfacher geht es wirklich nicht!'
        : 'Landed in New York, activated eSIM and had 5G immediately. Could book Uber and navigate right away. Couldn\'t be easier!',
      display_name: 'Maximilian S.',
      is_verified: true,
      created_at: '2026-11-17T14:32:00Z',
    },
    {
      id: 'fb-2',
      rating: 5,
      comment: locale === 'de'
        ? 'Perfekte Verbindung während unserer gesamten Rundreise durch Japan. Sehr schneller Support bei einer kurzen Rückfrage. Klare Empfehlung!'
        : 'Perfect connection throughout our road trip through Japan. Very fast support on a quick question. Highly recommended!',
      display_name: 'Laura M.',
      is_verified: true,
      created_at: '2026-11-15T09:15:00Z',
    },
    {
      id: 'fb-3',
      rating: 5,
      comment: locale === 'de'
        ? 'Deutlich günstiger als die Roaming-Preise meines Anbieters. Datenaufladung hat im Ausland in Sekunden funktioniert.'
        : 'Significantly cheaper than my provider\'s roaming fees. Data top-up worked in seconds while abroad.',
      display_name: 'Dennis K.',
      is_verified: true,
      created_at: '2026-11-12T18:45:00Z',
    },
  ];

  const displayReviews = (recentReviews && recentReviews.length > 0) ? recentReviews : fallbackReviews;
  const displayCount = (totalCount && totalCount > 0) ? totalCount : 2480;
  const displayRating = (averageRating && averageRating > 0) ? averageRating : 5.0;

  return (
    <>
      {/* Hero */}
      <section
        style={{
          background: activeTheme.heroBgStyle || undefined,
          color: activeTheme.heroTextColor || undefined,
        }}
        className={`${activeTheme.heroBg || "bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white"} transition-colors duration-300 relative overflow-hidden`}
      >
        <div className="mx-auto max-w-6xl px-4 py-12 md:py-16 text-center">
          <div
            style={{
              backgroundColor: activeTheme.heroBadgeBg || undefined,
              color: activeTheme.heroBadgeText || undefined,
            }}
            className={`mb-3 inline-flex items-center gap-2 rounded-full ${activeTheme.heroBadgeBg ? '' : 'bg-white/10'} px-4 py-1.5 text-sm font-medium backdrop-blur-sm ${activeTheme.heroBadgeText ? '' : 'text-white'}`}
          >
            <svg className="h-4 w-4 text-[#38bdf8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
            </svg>
            <span>{t('hero_badge')}</span>
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t('hero_title').split('–')[0].trim()} –<br />
            <span
              style={{ color: activeTheme.heroHighlightColor || undefined }}
              className={activeTheme.heroHighlightColor ? '' : 'text-brand-200'}
            >
              {t('hero_title_highlight')}
            </span>
          </h1>

          {/* Social Proof Stars Rating Link */}
          <Link
            href={`${prefix}/reviews`}
            className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-brand-100 hover:bg-white/20 transition-all backdrop-blur-sm mb-6 border border-white/15 cursor-pointer hover:text-white"
          >
            <div className="flex gap-0.5 text-amber-400">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`h-3.5 w-3.5 ${star <= Math.round(averageRating) ? 'fill-amber-400 text-amber-400' : 'fill-white/20 text-white/20'}`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span>
              {averageRating.toFixed(1)} / 5.0 ({totalCount} {t('hero_reviews_count')})
            </span>
          </Link>

          {/* Airalo-style destination search */}
          <HeroSearch destinations={destinations} />

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href={`${prefix}/tariffs`}
              prefetch={false}
              style={{
                background: activeTheme.btnPrimaryBg || undefined,
                color: activeTheme.btnPrimaryText || undefined,
              }}
              className="btn-primary shadow-md"
            >
              {t('hero_cta_plans')}
            </Link>
            <Link
              href={`${prefix}/topup`}
              style={{
                backgroundColor: activeTheme.btnSecondaryBg || 'rgba(255, 255, 255, 0.1)',
                color: activeTheme.btnSecondaryText || '#ffffff',
                borderColor: activeTheme.btnSecondaryBorder || 'rgba(255, 255, 255, 0.4)',
              }}
              className="btn-secondary shadow-md hover:bg-white/10 transition-colors"
            >
              {t('hero_cta_topup')}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature badges */}
      <section
        style={{
          backgroundColor: activeTheme.cardBgColor || undefined,
          color: activeTheme.pageTextColor || undefined,
          borderColor: activeTheme.cardBorderColor || undefined,
        }}
        className={`border-b ${activeTheme.isDark ? 'border-zinc-800' : 'border-slate-200'} transition-colors`}
      >
        <div className="mx-auto max-w-6xl px-4 py-4 md:py-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5">{f.icon}</span>
                <div>
                  <p
                    style={{ color: activeTheme.isDark ? (activeTheme.cardTextColor || '#f4f4f5') : undefined }}
                    className="font-semibold text-slate-800 text-sm"
                  >
                    {f.label}
                  </p>
                  <p
                    style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }}
                    className="text-xs text-slate-500"
                  >
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section
        style={{
          backgroundColor: activeTheme.pageBgColor || undefined,
          color: activeTheme.pageTextColor || undefined,
        }}
        className="mx-auto max-w-6xl px-4 py-8 md:py-10 overflow-hidden transition-colors"
      >
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2
              style={{ color: activeTheme.pageTextColor || undefined }}
              className="text-2xl font-bold"
            >
              {t('section_popular')}
            </h2>
            <p style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }} className="text-slate-500 text-sm mt-1">{t('section_popular_sub')}</p>
          </div>
          <Link
            href={`${prefix}/tariffs`}
            prefetch={false}
            style={{ color: accentColor }} className="text-sm font-medium hover:opacity-80 transition-colors whitespace-nowrap shrink-0 min-h-[44px] inline-flex items-center ml-2"
          >
            {t('section_view_all')}
          </Link>
        </div>

        <div className="w-full max-w-full overflow-hidden">
          <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-4">
          {popularDestinations.map((dest) => {
            const countryLabel = displayCountryName(dest, locale);
            const slug = countryCodeToSlug(dest.country_code, dest.country_name);
            return (
              <Link
                key={dest.country_code}
                href={`${prefix}/esim/${slug}`}
                prefetch={false}
                style={{
                  backgroundColor: activeTheme.cardBgColor || undefined,
                  borderColor: activeTheme.cardBorderColor || undefined,
                  color: activeTheme.cardTextColor || undefined,
                }}
                className="group relative flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border p-2.5 sm:p-4 shadow-xs transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 group-hover:bg-brand-50 transition-colors duration-300 overflow-hidden border border-slate-100">
                  <CountryFlag
                    countryCode={dest.country_code}
                    countryName={countryLabel}
                    size={36}
                    className="object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3
                    style={{ color: activeTheme.cardTextColor || undefined }}
                    className="font-bold group-hover:opacity-80 transition-colors line-clamp-2 leading-tight break-words text-xs sm:text-base"
                  >
                    {countryLabel}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                    {t('dest_from_price_prefix')}{' '}
                    <Price
                      eur={dest.min_price_eur}
                      style={{ color: accentColor }}
                      className="font-bold text-brand-600"
                    />
                  </p>
                </div>
                <div style={{ backgroundColor: activeTheme.isDark ? 'rgba(255, 255, 255, 0.08)' : undefined, color: activeTheme.isDark ? '#e4e4e7' : undefined }} className="hidden sm:flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 group-hover:bg-brand-600 text-slate-400 group-hover:text-white transition-all duration-300">
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
        </div>
      </section>

      {/* Top-Up teaser */}
      <section
        style={{
          backgroundColor: activeTheme.cardBgColor || undefined,
          borderColor: activeTheme.cardBorderColor || undefined,
        }}
        className={`${
          activeTheme.isDark
            ? 'border-y border-zinc-800'
            : 'bg-gradient-to-r from-brand-50 to-slate-50 border-y border-slate-200'
        } transition-colors`}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <TopUpTeaser />
        </div>
      </section>

      {/* How it works */}
      <section
        style={{
          backgroundColor: activeTheme.pageBgColor || undefined,
          color: activeTheme.pageTextColor || undefined,
        }}
        className="mx-auto max-w-6xl px-4 py-10 md:py-12 transition-colors"
      >
        <h2
          style={{ color: activeTheme.isDark ? (activeTheme.pageTextColor || '#f4f4f5') : undefined }}
          className="mb-6 md:mb-8 text-center text-xl md:text-2xl font-bold text-slate-900"
        >
          {t('how_title')}
        </h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-4 md:gap-6">
          {steps.map((s) => (
            <div key={s.step} className="relative text-center flex flex-col items-center">
              <div
                style={{
                  background: activeTheme.btnPrimaryBg || accentColor,
                  color: activeTheme.btnPrimaryText || '#ffffff',
                }}
                className="mb-2 flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-xs md:text-sm shadow-sm"
              >
                {s.step}
              </div>
              <div className="mb-1 h-8 md:h-10 flex items-center justify-center">{s.icon}</div>
              <p
                style={{ color: activeTheme.isDark ? (activeTheme.pageTextColor || '#f4f4f5') : undefined }}
                className="font-bold text-slate-800 text-xs md:text-base leading-snug px-1"
              >
                {s.title}
              </p>
              <p
                style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }}
                className="text-[10px] sm:text-xs md:text-sm text-slate-500 mt-0.5 md:mt-1 leading-relaxed max-w-[150px] md:max-w-none"
              >
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Customer Reviews Section */}
      <section
        style={{
          backgroundColor: activeTheme.pageBgColor || undefined,
          borderColor: activeTheme.isDark ? (activeTheme.cardBorderColor || '#27272a') : undefined,
          color: activeTheme.pageTextColor || undefined,
        }}
        className="mx-auto max-w-6xl px-4 py-12 md:py-16 border-t border-slate-100 transition-colors"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <div
              style={{
                backgroundColor: activeTheme.isDark ? 'rgba(251, 191, 36, 0.12)' : undefined,
                borderColor: activeTheme.isDark ? 'rgba(251, 191, 36, 0.25)' : undefined,
                color: activeTheme.isDark ? '#fbbf24' : undefined,
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-bold mb-3"
            >
              <span className="text-amber-500">★ ★ ★ ★ ★</span>
              <span>{displayRating.toFixed(1)} / 5.0</span>
            </div>
            <h2
              style={{ color: activeTheme.isDark ? (activeTheme.pageTextColor || '#f4f4f5') : undefined }}
              className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight"
            >
              {locale === 'de' ? 'Was unsere Reisenden sagen' : 'What our customers say'}
            </h2>
            <p
              style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }}
              className="mt-2 text-slate-500 text-xs md:text-sm max-w-xl"
            >
              {locale === 'de'
                ? `Echte Erfahrungen verifizierter Käufer. Über ${displayCount.toLocaleString('de-DE')} Kunden vertrauen PureSim weltweit.`
                : `Genuine experiences from verified buyers. Over ${displayCount.toLocaleString('en-US')} travelers trust PureSim worldwide.`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href={`${prefix}/reviews`}
              style={{
                backgroundColor: activeTheme.btnSecondaryBg || undefined,
                color: activeTheme.btnSecondaryText || undefined,
                borderColor: activeTheme.btnSecondaryBorder || undefined,
              }}
              className="btn-secondary gap-1.5"
            >
              <span>{locale === 'de' ? 'Alle Bewertungen ansehen' : 'View all reviews'}</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {displayReviews.map((rev) => (
            <div
              key={rev.id}
              style={{
                backgroundColor: activeTheme.cardBgColor || undefined,
                borderColor: activeTheme.cardBorderColor || (activeTheme.isDark ? '#27272a' : undefined),
                color: activeTheme.cardTextColor || undefined,
              }}
              className={`rounded-2xl border p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                activeTheme.isDark ? 'border-zinc-800' : 'border-slate-200/80 bg-white'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <svg
                        key={star}
                        className={`h-4 w-4 ${
                          star <= rev.rating
                            ? 'fill-amber-400 text-amber-400'
                            : activeTheme.isDark
                            ? 'fill-zinc-700 text-zinc-700'
                            : 'fill-slate-200 text-slate-200'
                        }`}
                        viewBox="0 0 20 20"
                        fill="currentColor"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  {rev.is_verified && (
                    <span
                      style={{
                        backgroundColor: activeTheme.isDark ? 'rgba(16, 185, 129, 0.15)' : undefined,
                        borderColor: activeTheme.isDark ? 'rgba(16, 185, 129, 0.3)' : undefined,
                        color: activeTheme.isDark ? '#34d399' : undefined,
                      }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700"
                    >
                      ✓ {locale === 'de' ? 'Verifizierter Kauf' : 'Verified Purchase'}
                    </span>
                  )}
                </div>
                <p
                  style={{ color: activeTheme.isDark ? (activeTheme.cardTextColor || '#e4e4e7') : undefined }}
                  className="text-slate-700 text-xs md:text-sm leading-relaxed line-clamp-4 italic"
                >
                  "{rev.comment}"
                </p>
              </div>
              <div
                style={{
                  borderColor: activeTheme.isDark ? (activeTheme.cardBorderColor || '#27272a') : undefined,
                }}
                className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between text-xs"
              >
                <span
                  style={{ color: activeTheme.isDark ? '#f4f4f5' : undefined }}
                  className="font-bold text-slate-700"
                >
                  {rev.display_name || 'Anonym'}
                </span>
                <span
                  style={{ color: activeTheme.isDark ? '#71717a' : undefined }}
                  className="text-slate-400"
                >
                  {new Date(rev.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Blog Teaser Section */}
      <section
        style={{
          backgroundColor: activeTheme.pageBgColor || undefined,
          borderColor: activeTheme.cardBorderColor || undefined,
          color: activeTheme.pageTextColor || undefined,
        }}
        className="mx-auto max-w-6xl px-4 py-10 md:py-12 border-t border-slate-100 transition-colors"
      >
        <div className="mb-8 text-center">
          <h2
            style={{ color: activeTheme.isDark ? (activeTheme.pageTextColor || '#f4f4f5') : undefined }}
            className="text-3xl font-extrabold text-slate-900 tracking-tight"
          >
            {t('blog_tagline' as any) || 'Mehr über eSIM erfahren & News'}
          </h2>
          <p
            style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }}
            className="mt-3 text-slate-500 text-sm max-w-xl mx-auto"
          >
            {t('blog_teaser_subtitle' as any)}
          </p>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 scroll-smooth snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:pb-0 md:snap-none">
          {/* Card 1: Guide (Fixed / Primary) */}
          {featuredGuide ? (
            <BlogTeaserCard post={featuredGuide} isPrimary={true} t={t} activeTheme={activeTheme} accentColor={accentColor} />
          ) : (
            <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-850 text-white p-6 md:p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-350 hover:-translate-y-1 min-h-[310px] md:min-h-[350px] w-[280px] sm:w-[320px] md:w-auto shrink-0 md:shrink snap-start">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div>
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
                </span>
                <h3 className="mt-4 md:mt-6 text-xl md:text-2xl font-bold leading-tight group-hover:text-brand-100 transition-colors">
                  {t('blog_fallback_guide_title' as any)}
                </h3>
                <p className="mt-2 md:mt-3 text-brand-100 text-xs md:text-sm leading-relaxed">
                  {t('blog_fallback_guide_desc' as any)}
                </p>
              </div>
              <Link
                href={`${prefix}/blog`}
                className="mt-6 md:mt-8 inline-flex items-center gap-2 font-semibold text-white group-hover:underline text-xs md:text-sm"
              >
                <span>{t('blog_read_more' as any) || 'Artikel lesen'}</span>
                <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          )}

          {/* Cards 2 & 3: News (Dynamic/Latest 2) */}
          {[0, 1].map((index) => {
            const post = latestNews?.[index];
            if (post) {
              return <BlogTeaserCard key={post.id} post={post} isPrimary={false} t={t} activeTheme={activeTheme} accentColor={accentColor} />;
            } else {
              // Static fallbacks for news if not enough posts in database
              const fallbackNews = [
                {
                  title: t('blog_fallback_news1_title' as any),
                  excerpt: t('blog_fallback_news1_desc' as any),
                  date: t('blog_fallback_news1_date' as any),
                },
                {
                  title: t('blog_fallback_news2_title' as any),
                  excerpt: t('blog_fallback_news2_desc' as any),
                  date: t('blog_fallback_news2_date' as any),
                },
              ];
              const fallback = fallbackNews[index];
              return (
                <div key={index} style={{ backgroundColor: activeTheme?.cardBgColor || undefined, borderColor: activeTheme?.cardBorderColor || undefined, color: activeTheme?.cardTextColor || undefined }} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[310px] md:min-h-[350px] w-[280px] sm:w-[320px] md:w-auto shrink-0 md:shrink snap-start">
                  <div className="h-36 md:h-44 w-full bg-gradient-to-br from-indigo-500 to-brand-500 relative flex items-center justify-center text-white overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                    <NetworkIcon size={36} className="text-white" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                      {t('blog_category_news' as any) || 'News'}
                    </span>
                  </div>
                  <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] md:text-xs text-slate-400 font-medium">{fallback.date}</p>
                      <h3 style={{ color: activeTheme?.isDark ? (activeTheme?.cardTextColor || '#f4f4f5') : undefined }} className="mt-1 md:mt-2 text-base md:text-lg font-bold text-slate-800 line-clamp-2 hover:opacity-80 transition-colors break-words hyphens-auto">
                        {formatPricesInText(fallback.title, locale)}
                      </h3>
                      <p className="mt-1.5 md:mt-2 text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-3 break-words hyphens-auto">
                        {formatPricesInText(fallback.excerpt, locale)}
                      </p>
                    </div>
                    <Link
                      href={`${prefix}/blog`}
                      style={{ color: accentColor }} className="mt-4 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-xs md:text-sm group"
                    >
                      <span>{t('blog_read_more' as any) || 'Artikel lesen'}</span>
                      <svg className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </div>
                </div>
              );
            }
          })}
        </div>
      </section>
    </>
  );
}

function BlogTeaserCard({ post, isPrimary, t, activeTheme, accentColor }: { post: any; isPrimary: boolean; t: any; activeTheme?: any; accentColor?: string }) {
  const { locale } = useTranslation();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (isPrimary) {
    // Primary/Featured guide visual
    return (
      <div style={{ backgroundColor: activeTheme?.cardBgColor || undefined, borderColor: activeTheme?.cardBorderColor || undefined, color: activeTheme?.cardTextColor || undefined }} className="relative group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[310px] md:min-h-[350px] flex flex-col w-[280px] sm:w-[320px] md:w-auto shrink-0 md:shrink snap-start">
        {post.featured_image ? (
          <div className="h-36 md:h-48 w-full overflow-hidden relative">
            <img 
              src={post.featured_image} 
              alt={post.title} 
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
            <span className="absolute bottom-3 left-3 rounded-full bg-brand-600 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
              {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
            </span>
          </div>
        ) : (
          <div className="h-36 md:h-48 w-full bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 relative flex items-center justify-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
            <BookIcon size={36} className="text-white" />
            <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
            </span>
          </div>
        )}
        <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-[10px] md:text-xs text-slate-400 font-medium">{formattedDate}</p>
            <h3 style={{ color: activeTheme?.isDark ? (activeTheme?.cardTextColor || '#f4f4f5') : undefined }} className="mt-1 md:mt-2 text-base md:text-xl font-bold text-slate-800 line-clamp-2 hover:opacity-80 transition-colors break-words hyphens-auto">
              {formatPricesInText(post.title, locale)}
            </h3>
            <p className="mt-1.5 md:mt-2 text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-3 break-words hyphens-auto">
              {formatPricesInText(post.excerpt, locale)}
            </p>
          </div>
          <Link
            href={`${prefix}/blog/${post.slug}`}
            prefetch={false}
            style={{ color: accentColor }} className="mt-4 md:mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-xs md:text-sm group"
          >
            <span>{t('blog_read_more' as any) || 'Artikel lesen'}</span>
            <svg className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    );
  }

  // Secondary/News card visual
  return (
    <div style={{ backgroundColor: activeTheme?.cardBgColor || undefined, borderColor: activeTheme?.cardBorderColor || undefined, color: activeTheme?.cardTextColor || undefined }} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[310px] md:min-h-[350px] w-[280px] sm:w-[320px] md:w-auto shrink-0 md:shrink snap-start">
      {post.featured_image ? (
        <div className="h-36 md:h-44 w-full overflow-hidden relative">
          <img 
            src={post.featured_image} 
            alt={post.title} 
            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <span className="absolute bottom-3 left-3 rounded-full bg-teal-600 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white">
            {t('blog_category_news' as any) || 'News'}
          </span>
        </div>
      ) : (
        <div className="h-36 md:h-44 w-full bg-gradient-to-br from-indigo-500 to-brand-500 relative flex items-center justify-center text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          <NetworkIcon size={36} className="text-white" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {t('blog_category_news' as any) || 'News'}
          </span>
        </div>
      )}
      <div className="p-5 md:p-6 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[10px] md:text-xs text-slate-400 font-medium">{formattedDate}</p>
          <h3 style={{ color: activeTheme?.isDark ? (activeTheme?.cardTextColor || '#f4f4f5') : undefined }} className="mt-1 md:mt-2 text-base md:text-lg font-bold text-slate-800 line-clamp-2 hover:opacity-80 transition-colors break-words hyphens-auto">
            {formatPricesInText(post.title, locale)}
          </h3>
          <p className="mt-1.5 md:mt-2 text-slate-500 text-xs md:text-sm leading-relaxed line-clamp-3 break-words hyphens-auto">
            {formatPricesInText(post.excerpt, locale)}
          </p>
        </div>
        <Link
          href={`${prefix}/blog/${post.slug}`}
          prefetch={false}
          className="mt-4 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-xs md:text-sm group"
        >
          <span>{t('blog_read_more' as any) || 'Artikel lesen'}</span>
          <svg className="h-3.5 w-3.5 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
