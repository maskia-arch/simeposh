import Link from 'next/link';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { NOT_FOUND_TEXTS } from '@/lib/not-found-html';

const POPULAR_COUNTRIES: Record<string, Array<{ name: string; slug: string; flag: string }>> = {
  de: [
    { name: 'Vereinigte Staaten', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Türkei', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Deutschland', slug: 'germany', flag: '🇩🇪' },
    { name: 'Schweiz', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Vereinigtes Königreich', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australien', slug: 'australia', flag: '🇦🇺' },
  ],
  en: [
    { name: 'United States', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turkey', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Germany', slug: 'germany', flag: '🇩🇪' },
    { name: 'Switzerland', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'United Kingdom', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
};

export default async function NotFound() {
  const locale = await getServerLocale();
  const t = NOT_FOUND_TEXTS[locale] || NOT_FOUND_TEXTS.de;
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const homeUrl = prefix || '/';
  const esimUrl = `${prefix}/esim`;
  const tariffsUrl = `${prefix}/tariffs`;
  const faqUrl = `${prefix}/faq`;

  const popular = POPULAR_COUNTRIES[locale] || POPULAR_COUNTRIES.en;

  return (
    <div className="flex flex-col items-center justify-center text-center px-4 py-16 font-sans text-slate-800 bg-slate-50/50 flex-1">
      <div className="max-w-xl mx-auto space-y-6">
        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-brand-50 border border-brand-200 text-brand-600">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-slate-900">
            {t.title}
          </h1>
          <p className="text-sm md:text-base text-slate-600 max-w-md mx-auto">
            {t.desc}
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-md mx-auto w-full pt-2">
          <form action={esimUrl} method="GET" className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              name="q"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full rounded-2xl bg-white border border-slate-300 px-5 py-3.5 pl-12 text-slate-900 placeholder-slate-400 text-sm focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/20 shadow-xs"
            />
          </form>
        </div>

        {/* Popular Destinations */}
        <div className="pt-2">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
            {t.popularTitle}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {popular.map((c) => (
              <Link
                key={c.slug}
                href={`${prefix}/esim/${c.slug}`}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-brand-500 hover:text-brand-600 shadow-2xs hover:shadow-xs transition-all"
              >
                <span className="text-base">{c.flag}</span>
                <span>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Navigation links */}
        <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center gap-3">
          <Link
            href={homeUrl}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-brand-600/20 transition-all"
          >
            <span>{t.linkHome}</span>
          </Link>
          <Link
            href={esimUrl}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition-all"
          >
            <span>{t.linkEsim}</span>
          </Link>
          <Link
            href={tariffsUrl}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition-all"
          >
            <span>{t.linkTariffs}</span>
          </Link>
          <Link
            href={faqUrl}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition-all"
          >
            <span>{t.linkFaq}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
