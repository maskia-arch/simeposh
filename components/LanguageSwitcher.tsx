'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function LanguageSwitcher({ variant = 'light', className = '' }: LanguageSwitcherProps) {
  const router = useRouter();
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const current = SUPPORTED_LOCALES.find((l) => l.code === locale) ?? SUPPORTED_LOCALES[0];
  const isDark = variant === 'dark';

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={ref} className={`relative inline-block text-left ${className}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={t('lang_select')}
        title={t('lang_select')}
        className={`flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
          isDark
            ? 'text-slate-200 hover:bg-slate-800/80 hover:text-white active:bg-slate-900'
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700 active:bg-slate-200'
        }`}
      >
        {/* Globe icon */}
        <svg className={`h-4.5 w-4.5 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.5 3.75 5.7 3.75 9S14.5 18.5 12 21M12 3C9.5 5.5 8.25 8.7 8.25 12S9.5 18.5 12 21" />
        </svg>
        <span className="font-extrabold uppercase tracking-wider">{current.code}</span>
        <svg className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className={`absolute right-0 z-[100] mt-2 w-48 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl transition-all animate-fadeIn ${
            isDark
              ? 'border border-slate-800 bg-slate-900/95 text-slate-100 shadow-slate-950/80'
              : 'border border-slate-200 bg-white text-slate-800 shadow-slate-300/50'
          }`}
        >
          <p className={`px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider border-b mb-1 ${
            isDark ? 'text-slate-400 border-slate-800/80' : 'text-slate-400 border-slate-100'
          }`}>
            {t('lang_select')}
          </p>
          <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar">
            {SUPPORTED_LOCALES.map((lang) => {
              const isSelected = lang.code === locale;
              return (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLocale(lang.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer ${
                    isSelected
                      ? isDark
                        ? 'bg-brand-600/25 text-brand-400 font-bold border-l-2 border-brand-400 pl-2.5'
                        : 'bg-brand-50 text-brand-700 font-bold border-l-2 border-brand-600 pl-2.5'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="text-base select-none">{lang.flag}</span>
                  <span className="flex-1 text-left">{lang.label}</span>
                  {isSelected && (
                    <svg className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
