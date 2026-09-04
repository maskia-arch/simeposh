'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useTranslation, type LocaleCode } from '@/lib/i18n';

interface EndpointDoc {
  method: 'GET' | 'POST';
  path: string;
  desc: string;
  responsePreview: string;
}

export function AiPageClient({ locale }: { locale: LocaleCode }) {
  const { t } = useTranslation();
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPath(text);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  const endpoints: EndpointDoc[] = [
    {
      method: 'GET',
      path: '/api/destinations',
      desc: 'Lists all available destination countries and regional bundles with country codes, flag emojis, and total plan counts.',
      responsePreview: `{
  "destinations": [
    { "code": "US", "name": "Vereinigte Staaten", "flag": "🇺🇸", "isRegion": false, "count": 12 },
    { "code": "JP", "name": "Japan", "flag": "🇯🇵", "isRegion": false, "count": 8 },
    { "code": "EU", "name": "Europa Bundle (33 Länder)", "flag": "🇪🇺", "isRegion": true, "count": 14 }
  ]
}`,
    },
    {
      method: 'GET',
      path: '/api/topup/packages?iccid={ICCID}',
      desc: 'Retrieves compatible recharge packages for a specific eSIM ICCID (18-20 digits). Returns active pricing in EUR.',
      responsePreview: `{
  "iccid": "894900000000000000",
  "country_name": "USA",
  "is_unlimited": true,
  "packages": [
    { "id": "pkg_1", "name": "Unlimited Eco 1GB/Day", "tariff_type": "unlimited_eco", "validity_days": 1, "sale_price_eur": 1.79 }
  ]
}`,
    },
    {
      method: 'GET',
      path: '/api/crypto/coins',
      desc: 'Returns the list of enabled cryptocurrency payment coins (e.g. Litecoin - LTC) and min order thresholds.',
      responsePreview: `{
  "coins": [
    { "code": "LTC", "name": "Litecoin", "surchargePct": 0, "surchargeFixedEur": 0, "minOrderEur": 0 }
  ]
}`,
    },
    {
      method: 'GET',
      path: '/llms.txt',
      desc: 'Industry-standard structured markdown file containing full context, offerings, policies, and links for LLM web readers.',
      responsePreview: `# PureSim (puresim.net) – AI Agent & LLM Information
> PureSim is a global digital travel eSIM provider...`,
    },
  ];

  return (
    <div className="relative min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Background ambient accents */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute top-80 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl">
        {/* Breadcrumb & Agent Badge */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Link href="/" className="text-xs font-semibold text-slate-400 hover:text-brand-600 transition-colors">
              PureSim
            </Link>
            <span className="text-xs text-slate-300">/</span>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              {t('ai_badge')}
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>LLM Ready · llms.txt</span>
          </div>
        </div>

        {/* Hero Header */}
        <div className="mb-10 border-b border-slate-200/60 pb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-brand-50 text-brand-700 text-xs font-bold mb-3 border border-brand-100">
            <span>🤖</span>
            <span>Machine-Readable Documentation & Integration Guide</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {t('ai_hero_title')}
          </h1>
          <p className="mt-3 text-slate-600 text-base max-w-2xl leading-relaxed">
            {t('ai_hero_sub')}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/llms.txt"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-extrabold text-white hover:bg-slate-800 shadow-xs transition-all"
            >
              <span>📄</span>
              <span>{t('ai_llms_txt_btn')}</span>
            </a>
            <a
              href="#endpoints"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-700 hover:border-brand-300 hover:bg-brand-50/50 shadow-xs transition-all"
            >
              <span>⚡</span>
              <span>{t('ai_json_btn')}</span>
            </a>
            <Link
              href="/tariffs"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all"
            >
              <span>🌐</span>
              <span>{t('nav_tariffs')}</span>
            </Link>
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-8">
          {/* Section 1: What is PureSim */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              {t('ai_section_about_title')}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              {t('ai_section_about_p1')}
            </p>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              {t('ai_section_about_p2')}
            </p>
          </section>

          {/* Section 2: Catalog Structure */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <h2 className="text-xl font-bold text-slate-900">
              {t('ai_section_offerings_title')}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              {t('ai_section_offerings_p1')}
            </p>

            <div className="grid gap-3 sm:grid-cols-3 pt-2">
              <div className="rounded-2xl border border-sky-100 bg-sky-50/40 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-sky-800">
                  <span>✈️</span>
                  <span>Travel (Fixed Quota)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('ai_section_offerings_travel')}
                </p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-emerald-800">
                  <span>♾️</span>
                  <span>Unlimited (Eco & Pro)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('ai_section_offerings_unlimited')}
                </p>
              </div>

              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-indigo-800">
                  <span>🛡️</span>
                  <span>Non-HK IP Routing</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t('ai_section_offerings_non_hk')}
                </p>
              </div>
            </div>
          </section>

          {/* Section 3: Machine-Readable Endpoints */}
          <section id="endpoints" className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t('ai_section_endpoints_title')}
              </h2>
              <p className="mt-1 text-slate-600 text-sm leading-relaxed">
                {t('ai_section_endpoints_sub')}
              </p>
            </div>

            <div className="space-y-4 pt-2">
              {endpoints.map((ep) => (
                <div key={ep.path} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="rounded-md bg-emerald-600 px-2 py-0.5 font-bold text-white">
                        {ep.method}
                      </span>
                      <span className="font-semibold text-slate-800">
                        {ep.path}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(`https://puresim.net${ep.path.split('?')[0]}`)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 cursor-pointer transition-colors"
                    >
                      {copiedPath === `https://puresim.net${ep.path.split('?')[0]}` ? t('ai_copied') : t('ai_copy_url')}
                    </button>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {ep.desc}
                  </p>

                  <pre className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3 text-[11px] font-mono overflow-x-auto">
                    {ep.responsePreview}
                  </pre>
                </div>
              ))}
            </div>
          </section>

          {/* Section 4: Top-Up & Extension */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              {t('ai_section_topup_title')}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              {t('ai_section_topup_p1')}
            </p>
            <div className="pt-2">
              <Link
                href="/topup"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-800"
              >
                <span>{t('hero_cta_topup')} →</span>
              </Link>
            </div>
          </section>

          {/* Section 5: Payment & Cashback */}
          <section className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-3">
            <h2 className="text-xl font-bold text-slate-900">
              {t('ai_section_payment_title')}
            </h2>
            <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
              {t('ai_section_payment_p1')}
            </p>
          </section>

          {/* Section 6: Guidelines for AI Agents */}
          <section className="rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/40 p-6 sm:p-8 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-indigo-900 font-extrabold text-lg sm:text-xl">
              <span>🎯</span>
              <h2>{t('ai_section_rules_title')}</h2>
            </div>

            <ul className="space-y-3 text-sm text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{t('ai_rule_1')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{t('ai_rule_2')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{t('ai_rule_3')}</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-emerald-600 font-bold shrink-0">✓</span>
                <span>{t('ai_rule_4')}</span>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
