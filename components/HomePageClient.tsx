'use client';

import Link from 'next/link';
import type { Database } from '@/lib/supabase/types';
import { TariffsGrid } from '@/components/TariffsGrid';
import { TopUpTeaser } from '@/components/TopUpTeaser';
import { HeroSearch, type Destination } from '@/components/HeroSearch';
import { useTranslation } from '@/lib/i18n';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

const STEP_ICONS = ['🔍', '💳', '📷', '🌐'];

export function HomePageClient({ tariffs, destinations }: { tariffs: Tariff[]; destinations: Destination[] }) {
  const { t } = useTranslation();

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

      {/* Featured tariffs */}
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
        <TariffsGrid tariffs={tariffs} />
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
