'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CountryFlag } from '@/components/CountryFlag';
import { useTranslation } from '@/lib/i18n';
import { displayCountryName, isRegionCode } from '@/lib/tariff-display';
import { aliasToCode, aliasToRegion } from '@/lib/i18n/countryAliases';

export interface Destination {
  code:     string;
  name:     string;        // English stored name
  flag:     string | null;
  isRegion: boolean;
  count:    number;        // how many tariffs cover it
}

/** Preferred popular country codes (Airalo-style quick picks), shown if present. */
const POPULAR_CODES = ['TR', 'US', 'JP', 'TH', 'CA', 'CN', 'DE', 'CH', 'GB', 'EG', 'MA', 'ES', 'IT', 'FR', 'GR', 'AE'];

/** Self-contained UI strings (English fallback for any unlisted locale). */
const STR: Record<string, Record<string, string>> = {
  ph: {
    en: 'Where do you need an eSIM?', de: 'Wo brauchst du eine eSIM?', fr: 'Où as-tu besoin d’une eSIM ?',
    es: '¿Dónde necesitas una eSIM?', it: 'Dove ti serve una eSIM?', nl: 'Waar heb je een eSIM nodig?',
    pl: 'Gdzie potrzebujesz eSIM?', pt: 'Onde precisas de um eSIM?', tr: 'Nerede eSIM lazım?',
  },
  btn: {
    en: 'Search', de: 'Suchen', fr: 'Rechercher', es: 'Buscar', it: 'Cerca', nl: 'Zoeken',
    pl: 'Szukaj', pt: 'Pesquisar', tr: 'Ara',
  },
  popular: {
    en: 'Popular destinations', de: 'Beliebte Ziele', fr: 'Destinations populaires', es: 'Destinos populares',
    it: 'Destinazioni popolari', nl: 'Populaire bestemmingen', pl: 'Popularne kierunki', pt: 'Destinos populares', tr: 'Popüler yerler',
  },
  regions: {
    en: 'Regional & global eSIMs', de: 'Regionale & globale eSIMs', fr: 'eSIM régionales & mondiales',
    es: 'eSIMs regionales y globales', it: 'eSIM regionali e globali', nl: 'Regionale & wereldwijde eSIMs',
    pl: 'eSIM regionalne i globalne', pt: 'eSIMs regionais e globais', tr: 'Bölgesel ve küresel eSIM’ler',
  },
  region: {
    en: 'Region', de: 'Region', fr: 'Région', es: 'Región', it: 'Regione', nl: 'Regio', pl: 'Region', pt: 'Região', tr: 'Bölge',
  },
  none: {
    en: 'No destinations for', de: 'Keine Ziele für', fr: 'Aucune destination pour', es: 'Sin destinos para',
    it: 'Nessuna destinazione per', nl: 'Geen bestemmingen voor', pl: 'Brak kierunków dla', pt: 'Sem destinos para', tr: 'Sonuç yok:',
  },
};

export function HeroSearch({ destinations }: { destinations: Destination[] }) {
  const router = useRouter();
  const { locale } = useTranslation();
  const s = (k: keyof typeof STR) => STR[k][locale] ?? STR[k].en;
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

  const regions = useMemo(
    () => destinations.filter((d) => d.isRegion).sort((a, b) => label(a).localeCompare(label(b))),
    [destinations, locale],
  );

  const popular = useMemo(() => {
    const byCode = new Map(destinations.map((d) => [d.code, d]));
    const picks = POPULAR_CODES.map((c) => byCode.get(c)).filter(Boolean) as Destination[];
    // top up with most-covered countries if needed
    if (picks.length < 10) {
      const extra = destinations
        .filter((d) => !d.isRegion && !picks.includes(d))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10 - picks.length);
      picks.push(...extra);
    }
    return picks.slice(0, 10);
  }, [destinations]);

  const results = useMemo(() => {
    const qLow = q.trim().toLowerCase();
    if (!qLow) return [];
    const rc = aliasToCode(qLow);
    const rr = aliasToRegion(qLow);

    const scored: Array<{ d: Destination; score: number }> = [];
    for (const d of destinations) {
      const lbl  = label(d).toLowerCase();
      const name = d.name.toLowerCase();
      const code = d.code.toLowerCase();
      let s = 0;
      if (rc && code === rc.toLowerCase())      s = 100;
      else if (rr && code === rr.toLowerCase()) s = 95;
      else if (code === qLow)                   s = 90;
      else if (lbl === qLow || name === qLow)   s = 88;
      else if (lbl.startsWith(qLow) || name.startsWith(qLow)) s = 70;
      else if (lbl.includes(qLow) || name.includes(qLow))     s = 50;
      if (s > 0) { if (d.isRegion) s += 2; scored.push({ d, score: s }); }
    }
    scored.sort((a, b) => (b.score - a.score) || b.d.count - a.d.count);
    return scored.slice(0, 8).map((x) => x.d);
  }, [q, destinations, locale]);

  function go(query: string) {
    const term = query.trim();
    if (!term) { router.push('/tariffs'); return; }
    router.push(`/tariffs?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[active]) go(results[active].name);
      else go(q);
      setOpen(false);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  }

  const showSuggest = q.trim().length > 0;

  return (
    <div ref={boxRef} className="relative mx-auto w-full max-w-2xl text-left">
      {/* Search field */}
      <div className="flex items-stretch overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
        <div className="flex flex-1 items-center gap-3 px-4">
          <svg className="h-5 w-5 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setActive(0); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={s('ph')}
            className="w-full bg-transparent py-4 text-base text-slate-800 placeholder:text-slate-400 outline-none"
            aria-label={s('ph')}
          />
          {q && (
            <button onClick={() => { setQ(''); setOpen(true); }} className="text-slate-300 hover:text-slate-500" aria-label="Clear">✕</button>
          )}
        </div>
        <button
          onClick={() => go(q)}
          className="shrink-0 bg-brand-600 px-5 sm:px-7 font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          {s('btn')}
        </button>
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-white p-4 text-slate-800 shadow-2xl ring-1 ring-black/5">
          {showSuggest ? (
            results.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-400">
                {s('none')} „{q}"
              </p>
            ) : (
              <ul className="space-y-1">
                {results.map((d, i) => (
                  <li key={d.code}>
                    <button
                      onMouseEnter={() => setActive(i)}
                      onClick={() => { go(d.name); setOpen(false); }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                        i === active ? 'bg-brand-50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <CountryFlag countryCode={d.code} countryName={label(d)} size={26} className="shrink-0" />
                      <span className="flex-1 font-medium">{label(d)}</span>
                      {d.isRegion && (
                        <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                          {s('region')}
                        </span>
                      )}
                      <span className="text-xs text-slate-400">{d.count}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          ) : (
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Popular destinations */}
              <div>
                <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                  {s('popular')}
                </p>
                <ul className="space-y-0.5">
                  {popular.map((d) => (
                    <li key={d.code}>
                      <button
                        onClick={() => { go(d.name); setOpen(false); }}
                        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                      >
                        <CountryFlag countryCode={d.code} countryName={label(d)} size={24} className="shrink-0" />
                        <span className="text-sm font-medium">{label(d)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Regions */}
              {regions.length > 0 && (
                <div>
                  <p className="mb-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400">
                    {s('regions')}
                  </p>
                  <ul className="space-y-0.5">
                    {regions.map((d) => (
                      <li key={d.code}>
                        <button
                          onClick={() => { go(d.name); setOpen(false); }}
                          className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-slate-50 transition-colors"
                        >
                          <CountryFlag countryCode={d.code} countryName={label(d)} size={24} className="shrink-0" />
                          <span className="text-sm font-medium">{label(d)}</span>
                          <span className="ml-auto text-xs text-slate-400">{d.count}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
