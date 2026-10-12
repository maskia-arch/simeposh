'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { ERROR_I18N, detectErrorLocale } from '@/lib/error-i18n';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState('de');

  useEffect(() => {
    console.error('[Global Error]', error);
    const loc = detectErrorLocale();
    setLocale(loc);
    document.documentElement.lang = loc;

    let meta = document.querySelector('meta[name="robots"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'robots');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', 'noindex, nofollow');

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical) canonical.remove();
  }, [error]);

  const t = ERROR_I18N[locale] || ERROR_I18N.de;
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-center px-4 py-16 font-sans text-slate-100">
      <div className="max-w-md mx-auto space-y-6">
        <div className="flex justify-center mb-2">
          <Image
            src="/logo.png"
            alt="PureSim"
            width={160}
            height={44}
            className="h-10 w-auto object-contain brightness-110"
            priority
          />
        </div>

        <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-red-600/20 border border-red-500/30 text-red-400">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {t.title}
          </h1>
          <p className="text-sm text-slate-400">
            {t.desc}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 px-6 py-3 text-sm font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            {t.retry}
          </button>
          <a
            href={prefix || '/'}
            className="w-full sm:w-auto inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/20 transition-all cursor-pointer"
          >
            <span>{t.backHome}</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

