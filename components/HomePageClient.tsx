'use client';

import Link from 'next/link';
import { TopUpTeaser } from '@/components/TopUpTeaser';
import { HeroSearch, type Destination } from '@/components/HeroSearch';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';
import { Price } from '@/components/Price';
import { displayCountryName } from '@/lib/tariff-display';
import { SearchIcon, CreditCardIcon, CameraIcon, GlobeIcon, BookIcon, NetworkIcon, CheckCircleIcon, ScalesIcon } from '@/components/Icons';

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
  destinations,
  featuredGuide,
  latestNews,
}: {
  popularDestinations: PopularDestination[];
  destinations: Destination[];
  featuredGuide: any;
  latestNews: any[];
}) {
  const { t, locale } = useTranslation();

  const features = [
    {
      icon: (
        <svg className="h-6 w-6 text-[#0ea5e9] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
        </svg>
      ),
      label: t('feat_instant'),
      desc: t('feat_instant_d')
    },
    {
      icon: (
        <svg className="h-6 w-6 text-[#1d4ed8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
        </svg>
      ),
      label: t('feat_countries'),
      desc: t('feat_countries_d')
    },
    {
      icon: <ScalesIcon size={24} className="text-[#0ea5e9] shrink-0" />,
      label: t('feat_price'),
      desc: t('feat_price_d')
    },
    {
      icon: (
        <svg className="h-6 w-6 text-[#1d4ed8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751A11.959 11.959 0 0112 2.714z" />
        </svg>
      ),
      label: t('feat_secure'),
      desc: t('feat_secure_d')
    },
  ];

  const steps = [
    { step: '1', icon: <SearchIcon size={32} className="text-[#1d4ed8] mx-auto" />, title: t('how_1_t'), desc: t('how_1_d') },
    { step: '2', icon: <CreditCardIcon size={32} className="text-[#0ea5e9] mx-auto" />, title: t('how_2_t'), desc: t('how_2_d') },
    { step: '3', icon: <CameraIcon size={32} className="text-[#1d4ed8] mx-auto" />, title: t('how_3_t'), desc: t('how_3_d') },
    { step: '4', icon: <CheckCircleIcon size={32} className="text-[#0ea5e9] mx-auto" />, title: t('how_4_t'), desc: t('how_4_d') },
  ];

  return (
    <>
      {/* Hero */}
      <section className="bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 md:py-14 text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-medium backdrop-blur-sm">
            <svg className="h-4 w-4 text-[#38bdf8] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-.778.099-1.533.284-2.253" />
            </svg>
            <span>{t('hero_badge')}</span>
          </div>
          <h1 className="mb-3 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            {t('hero_title').split('–')[0].trim()} –<br />
            <span className="text-brand-200">{t('hero_title_highlight')}</span>
          </h1>
          <p className="mx-auto mb-6 max-w-xl text-lg text-brand-100">
            {t('hero_subtitle')}
          </p>

          {/* Airalo-style destination search */}
          <HeroSearch destinations={destinations} />

          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              href="/tariffs"
              className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white shadow-md hover:bg-brand-700 transition-colors border border-brand-500/20"
            >
              {t('hero_cta_plans')}
            </Link>
            <Link
              href="/topup"
              className="rounded-full border-2 border-white bg-transparent px-6 py-3 font-semibold text-white hover:bg-white/10 transition-colors"
            >
              {t('hero_cta_topup')}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature badges */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-4 md:py-5">
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5">{f.icon}</span>
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
      <section className="mx-auto max-w-6xl px-4 py-8 md:py-10">
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

        <div className="grid grid-flow-col grid-rows-2 gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-none snap-x snap-mandatory sm:mx-0 sm:px-0 sm:grid-flow-row sm:grid-rows-none sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-4">
          {popularDestinations.map((dest) => {
            const countryLabel = displayCountryName(dest, locale);
            return (
              <Link
                key={dest.country_code}
                href={`/tariffs?q=${encodeURIComponent(countryLabel)}`}
                className="group relative flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-300 hover:border-brand-500 hover:shadow-md hover:-translate-y-1 shrink-0 w-[280px] snap-start sm:w-auto sm:shrink"
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
        <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
          <TopUpTeaser />
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-12">
        <h2 className="mb-8 text-center text-2xl font-bold text-slate-900">{t('how_title')}</h2>
        <div className="grid gap-6 md:grid-cols-4">
          {steps.map((s) => (
            <div key={s.step} className="relative text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-white font-bold text-sm">
                {s.step}
              </div>
              <div className="mb-2 h-10 flex items-center justify-center">{s.icon}</div>
              <p className="font-semibold text-slate-800">{s.title}</p>
              <p className="text-sm text-slate-500 mt-1">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Blog Teaser Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 md:py-12 border-t border-slate-100">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('blog_tagline' as any) || 'Mehr über eSIM erfahren & News'}
          </h2>
          <p className="mt-3 text-slate-500 text-sm max-w-xl mx-auto">
            {t('blog_teaser_subtitle' as any)}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {/* Card 1: Guide (Fixed / Primary) */}
          {featuredGuide ? (
            <BlogTeaserCard post={featuredGuide} isPrimary={true} t={t} />
          ) : (
            <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-850 text-white p-8 flex flex-col justify-between shadow-sm hover:shadow-xl transition-all duration-350 hover:-translate-y-1 min-h-[350px]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent)] pointer-events-none" />
              <div>
                <span className="inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                  {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
                </span>
                <h3 className="mt-6 text-2xl font-bold leading-tight group-hover:text-brand-100 transition-colors">
                  {t('blog_fallback_guide_title' as any)}
                </h3>
                <p className="mt-3 text-brand-100 text-sm leading-relaxed">
                  {t('blog_fallback_guide_desc' as any)}
                </p>
              </div>
              <Link
                href="/blog"
                className="mt-8 inline-flex items-center gap-2 font-semibold text-white group-hover:underline text-sm"
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
              return <BlogTeaserCard key={post.id} post={post} isPrimary={false} t={t} />;
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
                <div key={index} className="flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[350px]">
                  <div className="h-44 w-full bg-gradient-to-br from-indigo-500 to-brand-500 relative flex items-center justify-center text-white overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
                    <NetworkIcon size={40} className="text-white" />
                    <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider backdrop-blur-sm">
                      {t('blog_category_news' as any) || 'News'}
                    </span>
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between">
                    <div>
                      <p className="text-xs text-slate-400 font-medium">{fallback.date}</p>
                      <h3 className="mt-2 text-lg font-bold text-slate-800 line-clamp-2 hover:text-brand-600 transition-colors">
                        {fallback.title}
                      </h3>
                      <p className="mt-2 text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-3">
                        {fallback.excerpt}
                      </p>
                    </div>
                    <Link
                      href="/blog"
                      className="mt-4 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-xs sm:text-sm group"
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

function BlogTeaserCard({ post, isPrimary, t }: { post: any; isPrimary: boolean; t: any }) {
  const { locale } = useTranslation();
  const formattedDate = post.published_at 
    ? new Date(post.published_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : new Date(post.created_at).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (isPrimary) {
    // Primary/Featured guide visual
    return (
      <div className="relative group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[350px] flex flex-col">
        {post.featured_image ? (
          <div className="h-48 w-full overflow-hidden relative">
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
          <div className="h-48 w-full bg-gradient-to-br from-brand-600 via-brand-700 to-indigo-800 relative flex items-center justify-center text-white overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
            <BookIcon size={48} className="text-white" />
            <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
              {t('blog_category_guide' as any) || 'eSIM Grundlagen'}
            </span>
          </div>
        )}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
            <h3 className="mt-2 text-xl font-bold text-slate-800 line-clamp-2 group-hover:text-brand-700 transition-colors">
              {post.title}
            </h3>
            <p className="mt-2 text-slate-500 text-sm leading-relaxed line-clamp-3">
              {post.excerpt}
            </p>
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="mt-6 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-sm group"
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
    <div className="flex flex-col rounded-2xl border border-slate-200/80 bg-white overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[350px]">
      {post.featured_image ? (
        <div className="h-44 w-full overflow-hidden relative">
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
        <div className="h-44 w-full bg-gradient-to-br from-indigo-500 to-brand-500 relative flex items-center justify-center text-white overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.1),transparent)] pointer-events-none" />
          <NetworkIcon size={40} className="text-white" />
          <span className="absolute bottom-3 left-3 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm">
            {t('blog_category_news' as any) || 'News'}
          </span>
        </div>
      )}
      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-xs text-slate-400 font-medium">{formattedDate}</p>
          <h3 className="mt-2 text-lg font-bold text-slate-800 line-clamp-2 hover:text-brand-600 transition-colors">
            {post.title}
          </h3>
          <p className="mt-2 text-slate-500 text-xs sm:text-sm leading-relaxed line-clamp-3">
            {post.excerpt}
          </p>
        </div>
        <Link
          href={`/blog/${post.slug}`}
          className="mt-4 inline-flex items-center gap-1.5 font-semibold text-brand-600 hover:text-brand-850 text-xs sm:text-sm group"
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
