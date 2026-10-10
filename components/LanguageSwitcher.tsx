'use client';

import { useState, useRef, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { SUPPORTED_LOCALES } from '@/lib/i18n';
import { useTranslation } from '@/lib/i18n';

interface LanguageSwitcherProps {
  variant?: 'light' | 'dark';
  className?: string;
}

export function LanguageSwitcher({ variant = 'light', className = '' }: LanguageSwitcherProps) {
  const { locale, setLocale, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const pathname = usePathname() || '/';
  const current = SUPPORTED_LOCALES.find((l) => l.code === locale) ?? SUPPORTED_LOCALES[0];
  const isDark = variant === 'dark';

  function getTargetUrl(targetCode: string) {
    const cleanPath = pathname.replace(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/, '') || '/';
    if (targetCode === 'de') {
      return cleanPath;
    }
    return `/${targetCode}${cleanPath === '/' ? '' : cleanPath}`;
  }

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Keyboard navigation
  useEffect(() => {
    if (!open) {
      setFocusedIndex(-1);
      return;
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setOpen(false);
        buttonRef.current?.focus();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev < SUPPORTED_LOCALES.length - 1 ? prev + 1 : 0));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : SUPPORTED_LOCALES.length - 1));
      } else if (e.key === 'Home') {
        e.preventDefault();
        setFocusedIndex(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        setFocusedIndex(SUPPORTED_LOCALES.length - 1);
      } else if (e.key === 'Enter' && focusedIndex >= 0) {
        e.preventDefault();
        const selected = SUPPORTED_LOCALES[focusedIndex];
        if (selected) {
          setLocale(selected.code);
          setOpen(false);
          buttonRef.current?.focus();
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, focusedIndex, setLocale]);

  // Scroll active item into view when navigating via arrow keys
  useEffect(() => {
    if (open && focusedIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      const targetItem = items[focusedIndex] as HTMLElement;
      if (targetItem) {
        targetItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [focusedIndex, open]);

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      <button
        ref={buttonRef}
        onClick={() => {
          setOpen((o) => {
            const next = !o;
            if (next) {
              const curIdx = SUPPORTED_LOCALES.findIndex((l) => l.code === locale);
              setFocusedIndex(curIdx >= 0 ? curIdx : 0);
            }
            return next;
          });
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            setOpen(true);
            const curIdx = SUPPORTED_LOCALES.findIndex((l) => l.code === locale);
            setFocusedIndex(curIdx >= 0 ? curIdx : 0);
          }
        }}
        aria-label={t('lang_select')}
        aria-expanded={open}
        aria-haspopup="listbox"
        className={`flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-1.5 sm:px-2.5 py-2 text-xs font-bold transition-all cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 ${
          isDark
            ? 'text-slate-200 hover:bg-slate-800/80 hover:text-white active:bg-slate-900'
            : 'text-slate-600 hover:bg-slate-100 hover:text-brand-700 active:bg-slate-200'
        }`}
      >
        {/* Globe icon: 20x20 px */}
        <svg className={`h-5 w-5 shrink-0 ${isDark ? 'text-brand-400' : 'text-brand-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <circle cx="12" cy="12" r="9" />
          <path strokeLinecap="round" d="M3 12h18M12 3c2.5 2.5 3.75 5.7 3.75 9S14.5 18.5 12 21M12 3C9.5 5.5 8.25 8.7 8.25 12S9.5 18.5 12 21" />
        </svg>
        <span className="font-extrabold uppercase tracking-wider">{current.code}</span>
        <svg className={`hidden sm:block h-3 w-3 shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''} ${isDark ? 'text-slate-400' : 'text-slate-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          id="lang-listbox"
          role="listbox"
          aria-label={t('lang_select')}
          aria-activedescendant={open && focusedIndex >= 0 ? `lang-opt-${SUPPORTED_LOCALES[focusedIndex]?.code}` : undefined}
          className={`absolute right-0 z-[100] mt-2 w-56 rounded-2xl p-1.5 shadow-2xl backdrop-blur-xl transition-all animate-fadeIn ${
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
          <div ref={listRef} className="max-h-72 overflow-y-auto space-y-0.5 custom-scrollbar">
            {SUPPORTED_LOCALES.map((lang, idx) => {
              const isSelected = lang.code === locale;
              const isFocused = idx === focusedIndex;
              const targetUrl = getTargetUrl(lang.code);
              return (
                <Link
                  key={lang.code}
                  id={`lang-opt-${lang.code}`}
                  href={targetUrl}
                  prefetch={false}
                  role="option"
                  aria-selected={isSelected}
                  onClick={(e) => {
                    e.preventDefault();
                    setLocale(lang.code);
                    setOpen(false);
                    buttonRef.current?.focus();
                  }}
                  onMouseEnter={() => setFocusedIndex(idx)}
                  className={`flex min-h-[44px] w-full items-center gap-3 px-3 py-2 text-xs font-medium rounded-xl transition-all cursor-pointer outline-none focus:outline-none ${
                    isSelected
                      ? isDark
                        ? 'bg-brand-600/25 text-brand-400 font-bold border-l-2 border-brand-400 pl-2.5' + (isFocused ? ' ring-2 ring-[#2563eb] bg-slate-800' : '')
                        : 'bg-[#eff6ff] text-blue-700 font-bold border-l-2 border-[#2563eb] pl-2.5' + (isFocused ? ' ring-2 ring-[#2563eb]' : '')
                      : isFocused
                      ? isDark
                        ? 'bg-slate-800 text-white ring-2 ring-[#2563eb]'
                        : 'bg-[#f1f5f9] text-slate-900 ring-2 ring-[#2563eb]'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                      : 'text-slate-700 hover:bg-[#f1f5f9]'
                  }`}
                >
                  <span className="text-base select-none shrink-0">{lang.flag}</span>
                  <span className="flex-1 text-left truncate">{lang.label}</span>
                  {isSelected && (
                    <svg className={`h-3.5 w-3.5 shrink-0 ${isDark ? 'text-brand-400' : 'text-[#2563eb]'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M5 13l4 4L19 7"/>
                    </svg>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
