'use client';

import Link from 'next/link';
import { TopUpTeaser } from '@/components/TopUpTeaser';
import { HeroSearch, type Destination } from '@/components/HeroSearch';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { displayCountryName } from '@/lib/tariff-display';

interface PopularDestination {
  country_code: string;
  country_name: string;
  flag_emoji: string | null;
  min_price_eur: number;
  location_codes: string[] | null;
  region: string | null;
}

const STEP_ICONS = ['🔍', '💳', '📷', '🌐'];

export function HomePageClient({ popularDestinations, destinations }: { popularDestinations: PopularDestination[]; destinations: Destination[] }) {
  const { t, locale } = useTranslation();

  const features = [
    { icon: '⚡', label: t('feat_instant'),   desc: t('feat_instant_d')  },
    { icon: '🌍', label: t('feat_countries'), desc: t('feat_countries_d') },
    { icon: '💶', label: t('feat_price'),     desc: t('feat_price_d')    },
    { icon: '🔒', label: t('feat_secure'),    desc: t('feat_secure_d')   },
  ];

  const steps = [
    { step: '1', icon: STEP_ICONS[0], title: t('how_1_t'), desc: t('how_1_d') },
    { step: '2', icon: STEP_ICONS[1], title: t('how_2_t'), desc: t('how_2_d') },
    { step: '3', icon: STEP_ICONS[2], title: t('how_3_t'), desc: t('how_3_d') },
    { step: '4', icon: STEP_ICONS[3], title: t('how_4_t'), desc: t('how_4_d') },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            {t('hero_badge')}
          </div>
          <h1 className="mb-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t('hero_title').split('–')[0].trim()} –<br />
            <span className="text-brand-200">{t('hero_title_highlight')}</span>
          </h1>
          <p className="mx-auto mb-8 max-w-xl text-lg text-brand-100">
            {t('hero_subtitle')}
          </p>

          {/* Airalo-style destination search */}
          <HeroSearch destinations={destinations} />

          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/tariffs"
              className="rounded-xl bg-white px-6 py-3 font-semibold text-brand-700 shadow-lg hover:bg-brand-50 transition-colors"
            >
              {t('hero_cta_plans')}
            </Link>
            <Link
              href="/topup"
              className="rounded-xl border-2 border-white/40 bg-white/10 px-6 py-3 font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              {t('hero_cta_topup')}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature badges */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="text-2xl">{f.icon}</span>
                <div>
                  <p className="font-semibold text-slate-800 text-sm">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Destinations */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{t('section_popular')}</h2>
            <p className="text-slate-500 text-sm mt-1">{t('section_popular_sub')}</p>
          </div>
          <Link
            href="/tariffs"
            className="text-sm font-medium text-brand-600 hover:text-brand-800 transition-colors"
          >
            {t('section_view_all')}
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
          {popularDestinations.map((dest) => {
            const countryLabel = displayCountryName(dest, locale);
            return (
              <Link
                key={dest.country_code}
                href={`/tariffs?q=${encodeURIComponent(countryLabel)}`}
                className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-brand-500 hover:shadow-md hover:-translate-y-1"
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
                  <h3 className="font-bold text-slate-800 group-hover:text-brand-700 transition-colors truncate text-sm sm:text-base">
                    {countryLabel}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 whitespace-nowrap">
                    {t('dest_from_price_prefix')}{' '}
                    <Price
                      eur={dest.min_price_eur}
                      className="font-bold text-brand-600"
                    />
                  </p>
                </div>
                <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-slate-50 group-hover:bg-brand-600 text-slate-400 group-hover:text-white transition-all duration-300">
                  <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4 transform group-hover:translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Top-Up teaser */}
      <section className="bg-gradient-to-r from-brand-50 to-slate-50 border-y border-slate-200">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <TopUpTeaser />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="mb-10 text-center text-2xl font-bold text-slate-900">{t('how_title')}</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-brand-600 text-white font-bold">
                {s.step}
              </div>
              <p className="text-3xl mb-2">{s.icon}</p>
              <p className="font-semibold text-slate-800">{s.title}</p>
              <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
