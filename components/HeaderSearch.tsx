'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CountryFlag } from '@/components/CountryFlag';
import { useTranslation } from '@/lib/i18n';
import { displayCountryName } from '@/lib/tariff-display';
import { aliasesToCodes, aliasesToRegions } from '@/lib/i18n/countryAliases';
import type { Destination } from '@/components/HeroSearch';

interface Props {
  destinations: Destination[];
  placeholder?: string;
  onSearchClose?: () => void;
}

export function HeaderSearch({ destinations, placeholder, onSearchClose }: Props) {
  const router = useRouter();
  const { locale, t } = useTranslation();
  const [q, setQ]         = useState('');
  const [open, setOpen]   = useState(false);
  const [active, setActive] = useState(0);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const label = (d: Destination) =>
    displayCountryName({ country_code: d.code, country_name: d.name, location_codes: null, region: null }, locale);

  const results = useMemo(() => {
    const qLow = q.trim().toLowerCase();
    if (!qLow) return [];

    const matchedCountryCodes = new Set(aliasesToCodes(qLow).map((c) => c.toLowerCase()));
    const matchedRegionCodes = new Set(aliasesToRegions(qLow).map((c) => c.toLowerCase()));

    const scored: Array<{ d: Destination; score: number }> = [];
    for (const d of destinations) {
      const lbl  = label(d).toLowerCase();
      const name = d.name.toLowerCase();
      const code = d.code.toLowerCase();
      let s = 0;

      if (matchedCountryCodes.has(code)) {
        s = 85;
      } else if (matchedRegionCodes.has(code)) {
        s = 80;
      } else if (code === qLow) {
        s = 90;
      } else if (lbl === qLow || name === qLow) {
        s = 88;
      } else if (lbl.startsWith(qLow) || name.startsWith(qLow)) {
        s = 70;
      } else if (lbl.includes(qLow) || name.includes(qLow)) {
        s = 50;
      }

      if (s > 0) {
        if (d.isRegion) s += 2;
        scored.push({ d, score: s });
      }
    }
    scored.sort((a, b) => (b.score - a.score) || b.d.count - a.d.count);
    return scored.slice(0, 5).map((x) => x.d); // show top 5 in header search
  }, [q, destinations, locale]);

  function go(query: string) {
    const term = query.trim();
    if (!term) { router.push('/tariffs'); return; }
    router.push(`/tariffs?q=${encodeURIComponent(term)}`);
    onSearchClose?.();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) {
        const dest = results[active];
        const val = label(dest);
        setQ(val);
        go(val);
      } else {
        go(q);
      }
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  return (
    <div ref={boxRef} className="relative w-full text-left">
      <div className="flex items-center gap-2 rounded-full border-2 border-slate-300 bg-white hover:border-slate-400 focus-within:border-brand-600 focus-within:ring-4 focus-within:ring-brand-100 px-3.5 py-1.5 shadow-sm hover:shadow transition-all duration-150">
        <svg className="h-4 w-4 shrink-0 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? t('tariffs_search')}
          className="w-full bg-transparent text-xs sm:text-sm text-slate-900 font-medium placeholder:text-slate-500 outline-none"
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(true); }} className="text-slate-400 hover:text-slate-600 text-xs font-bold" aria-label="Clear">✕</button>
        )}
      </div>

      {open && q.trim().length > 0 && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-60 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 text-slate-800 shadow-xl ring-1 ring-black/5 animate-in fade-in slide-in-from-top-1 duration-100">
          {results.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-slate-400">
              {locale === 'de' ? 'Keine Ziele für' : 'No destinations for'} „{q}"
            </p>
          ) : (
            <ul className="space-y-0.5">
              {results.map((d, i) => (
                <li key={d.code}>
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => {
                      const val = label(d);
                      setQ(val);
                      go(val);
                      setOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      i === active ? 'bg-brand-50 text-brand-900 font-semibold' : 'hover:bg-slate-50 text-slate-700 text-sm'
                    }`}
                  >
                    <CountryFlag countryCode={d.code} countryName={label(d)} size={20} className="shrink-0 rounded-sm" />
                    <span className="flex-grow truncate text-xs">{label(d)}</span>
                    {d.isRegion && (
                      <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-semibold text-violet-700">
                        {locale === 'de' ? 'Region' : 'Region'}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
