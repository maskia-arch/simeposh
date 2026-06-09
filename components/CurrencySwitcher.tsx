'use client';

import { useState, useRef, useEffect } from 'react';
import { useCurrency } from '@/components/CurrencyProvider';
import { useTranslation } from '@/lib/i18n';
import { CURRENCIES } from '@/lib/currency';

export function CurrencySwitcher() {
  const { currency, setCurrency } = useCurrency();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('cur_title')}
        title={t('cur_title')}
        className="flex items-center gap-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-brand-700 transition-colors"
      >
        {/* Banknote icon */}
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
          <rect x="2.25" y="6" width="19.5" height="12" rx="2" />
          <circle cx="12" cy="12" r="2.25" />
          <path strokeLinecap="round" d="M5.25 9v6M18.75 9v6" />
        </svg>
        <span className="hidden text-xs font-semibold sm:inline">{currency}</span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t('cur_title')}
          </p>
          {CURRENCIES.map((c) => (
            <button
              key={c.code}
              onClick={() => { setCurrency(c.code); setOpen(false); }}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-slate-50 ${
                c.code === currency ? 'bg-brand-50 font-semibold text-brand-700' : 'text-slate-700'
              }`}
            >
              <span className="w-5 text-center text-base leading-none">{c.symbol}</span>
              <span>{c.code}</span>
              <span className="text-xs text-slate-400">{c.label}</span>
              {c.code === currency && (
                <svg className="ml-auto h-3.5 w-3.5 text-brand-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
          ))}
          <p className="px-3 pt-1.5 pb-1 text-[10px] text-slate-400">
            {t('cur_hint')}
          </p>
        </div>
      )}
    </div>
  );
}
