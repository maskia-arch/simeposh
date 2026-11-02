import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { getGuideUrl } from '@/lib/guide-links';
import { TG_SUPPORT_URL, TG_CHANNEL_URL } from '@/lib/telegram-config';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('telegram_page_title');
  const description = t('telegram_meta_desc');

  return {
    title: { absolute: title.endsWith('| PureSim') ? title : `${title} | PureSim` },
    description,
    alternates: buildAlternates(locale, { dePath: 'telegram', enPath: 'telegram' }),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${BASE_URL}${locale === 'de' ? '' : `/${locale}`}/telegram`,
    },
  };
}

export default async function TelegramPage() {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  const contactPageJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ContactPage',
    name: t('telegram_h1'),
    url: `${BASE_URL}${locale === 'de' ? '' : `/${locale}`}/telegram`,
    description: t('telegram_meta_desc'),
    mainEntity: {
      '@type': 'Organization',
      name: 'PureSim',
      url: BASE_URL,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        url: TG_SUPPORT_URL,
        availableLanguage: ['German', 'English'],
      },
      sameAs: [TG_CHANNEL_URL],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactPageJsonLd) }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="flex items-center gap-2 text-xs text-slate-500">
            <li>
              <Link href={`${prefix}/`} className="hover:text-brand-600 transition-colors">
                {t('footer_home')}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="font-semibold text-slate-800" aria-current="page">
              Telegram
            </li>
          </ol>
        </nav>

        {/* Header Section */}
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 shadow-sm border border-sky-100">
            <svg className="h-8 w-8" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t('telegram_h1')}
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-600 leading-relaxed">
            {t('telegram_intro')}
          </p>
        </div>

        {/* 2-Card Layout: Support vs. Community Channel */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          {/* Card 1: Personal Support (Primary) */}
          <div className="rounded-3xl border-2 border-brand-200/90 bg-gradient-to-b from-brand-50/40 via-white to-white p-6 sm:p-8 shadow-lg shadow-brand-500/5 flex flex-col justify-between relative overflow-hidden">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-200 px-3 py-1 text-xs font-extrabold text-blue-700">
                  <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                  {t('telegram_card1_badge')}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400">@autoacts</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                {t('telegram_card1_title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                {t('telegram_card1_text')}
              </p>
            </div>

            <div>
              <a
                href={TG_SUPPORT_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('telegram_card1_btn')} (${t('opens_telegram_new_window')})`}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 px-5 py-3 text-sm font-bold text-white shadow-md shadow-brand-600/20 transition-all cursor-pointer"
              >
                <svg className="h-5 w-5 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>{t('telegram_card1_btn')}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>

          {/* Card 2: PureSim Channel (Info & Community) */}
          <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {t('footer_telegram_channel')}
                </span>
                <span className="text-xs font-mono font-semibold text-slate-400">@PureSim</span>
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
                {t('telegram_card2_title')}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                {t('telegram_card2_text')}
              </p>
            </div>

            <div>
              <a
                href={TG_CHANNEL_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('telegram_card2_btn')} (${t('opens_telegram_new_window')})`}
                className="w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 px-5 py-3 text-sm font-bold text-slate-700 shadow-2xs transition-all cursor-pointer"
              >
                <svg className="h-5 w-5 text-sky-500" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                <span>{t('telegram_card2_btn')}</span>
                <span aria-hidden="true">↗</span>
              </a>
            </div>
          </div>
        </div>

        {/* Ticket & Quick-Help Links Box */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 text-center space-y-3">
          <p className="text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center gap-1.5">
            <svg className="h-4 w-4 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span>{t('telegram_ticket_line')}</span>
          </p>
          <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-bold text-brand-600">
            <Link href={`${prefix}/faq`} className="min-h-[44px] inline-flex items-center hover:text-brand-800 underline underline-offset-2">
              {t('telegram_help_faq')}
            </Link>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">•</span>
            <Link href={getGuideUrl(locale)} className="min-h-[44px] inline-flex items-center hover:text-brand-800 underline underline-offset-2">
              {t('telegram_help_guide')}
            </Link>
            <span className="text-slate-300 hidden sm:inline" aria-hidden="true">•</span>
            <Link href={`${prefix}/dashboard?tab=tickets`} className="min-h-[44px] inline-flex items-center hover:text-brand-800 underline underline-offset-2">
              {t('telegram_help_ticket')}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
