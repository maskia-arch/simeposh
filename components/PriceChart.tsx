'use client';

import { useState, useEffect } from 'react';
import { formatEur } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface PriceHistoryEntry {
  price_eur: number;
  recorded_at: string;
}

const LABELS: Record<string, {
  title: string;
  subtitle: string;
  current: string;
  highest: string;
  lowest: string;
  stability: string;
  bestPrice: string;
  loading: string;
  error: string;
}> = {
  de: {
    title: 'Preisentwicklung',
    subtitle: 'Preistransparenz für diesen Tarif',
    current: 'Aktuell',
    highest: 'Höchster',
    lowest: 'Tiefster',
    stability: 'Preiskonstanz: Keine Preisänderungen',
    bestPrice: 'Bestpreis!',
    loading: 'Lade Preisverlauf...',
    error: 'Fehler beim Laden',
  },
  en: {
    title: 'Price History',
    subtitle: 'Price transparency for this plan',
    current: 'Current',
    highest: 'Highest',
    lowest: 'Lowest',
    stability: 'Price stability: No price changes',
    bestPrice: 'Best Price!',
    loading: 'Loading price history...',
    error: 'Error loading',
  }
};

interface Props {
  tariffId: string;
  currentPrice: number;
}

export function PriceChart({ tariffId, currentPrice }: Props) {
  const { locale } = useTranslation();
  const lang = (locale === 'de' ? 'de' : 'en') as 'de' | 'en';
  const labels = LABELS[lang];

  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/tariffs/price-history?tariffId=${tariffId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        let fetched: PriceHistoryEntry[] = data.history ?? [];
        
        // Ensure we always have at least one entry representing the current price
        if (fetched.length === 0) {
          fetched = [{ price_eur: currentPrice, recorded_at: new Date().toISOString() }];
        }
        
        // If the last entry's price is different from currentPrice, append currentPrice as the latest point
        const lastEntry = fetched[fetched.length - 1];
        if (Math.abs(Number(lastEntry.price_eur) - currentPrice) >= 0.01) {
          fetched.push({ price_eur: currentPrice, recorded_at: new Date().toISOString() });
        }

        setHistory(fetched);
      } catch (err) {
        console.error('[PriceChart] Error loading price history:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    }

    fetchHistory();
  }, [tariffId, currentPrice]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 animate-pulse">
        <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
        <div className="h-20 bg-slate-200 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-100 bg-red-50 p-4 text-xs text-red-600">
        ⚠️ {labels.error}
      </div>
    );
  }

  // Calculate stats
  const prices = history.map(h => Number(h.price_eur));
  const maxPrice = Math.max(...prices, currentPrice);
  const minPrice = Math.min(...prices, currentPrice);
  const isBestPrice = currentPrice <= minPrice;

  // Chart configuration
  const width = 420;
  const height = 100;
  const paddingX = 15;
  const paddingY = 15;

  // Generate coordinates
  let points: Array<{ x: number; y: number; price: number; dateStr: string }> = [];

  if (history.length <= 1) {
    // If only one data point exists, draw a horizontal line
    points = [
      { x: paddingX, y: height / 2, price: currentPrice, dateStr: '' },
      { x: width - paddingX, y: height / 2, price: currentPrice, dateStr: '' }
    ];
  } else {
    const range = maxPrice - minPrice;
    points = history.map((entry, index) => {
      const x = paddingX + (index / (history.length - 1)) * (width - 2 * paddingX);
      let y = height / 2;
      if (range > 0) {
        y = paddingY + (1 - (Number(entry.price_eur) - minPrice) / range) * (height - 2 * paddingY);
      }
      const date = new Date(entry.recorded_at);
      const dateStr = date.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', {
        month: 'short',
        year: 'numeric'
      });
      return { x, y, price: Number(entry.price_eur), dateStr };
    });
  }

  // Construct SVG Path
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPoints = [
    `${points[0].x},${height}`,
    ...points.map(p => `${p.x},${p.y}`),
    `${points[points.length - 1].x},${height}`
  ].join(' ');

  const hasPriceChanges = maxPrice > minPrice;

  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/40 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {labels.title}
          </h4>
          <p className="text-[10px] text-slate-400">{labels.subtitle}</p>
        </div>
        {isBestPrice && hasPriceChanges && (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wide animate-pulse">
            ✨ {labels.bestPrice}
          </span>
        )}
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chart-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {/* Grid lines (horizontal min/max guides if they differ) */}
          {hasPriceChanges && (
            <>
              <line x1={paddingX} y1={paddingY} x2={width - paddingX} y2={paddingY} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
              <line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3,3" />
            </>
          )}

          {/* Area under the line */}
          <polygon points={areaPoints} fill="url(#chart-grad)" />

          {/* Trend line */}
          <path d={linePath} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((p, i) => (
            <g key={i} className="group/dot">
              <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
              {/* Optional tooltip or visual indicator */}
            </g>
          ))}
        </svg>
      </div>

      {/* Stats footer */}
      <div className="flex items-center justify-between mt-3 text-[10px] font-medium text-slate-500 border-t border-slate-100/60 pt-2">
        <div>
          <span className="text-slate-400">{labels.lowest}: </span>
          <span className="font-semibold text-slate-700">{formatEur(minPrice)}</span>
        </div>
        {!hasPriceChanges ? (
          <span className="text-[9px] text-slate-400 italic">{labels.stability}</span>
        ) : (
          <div className="text-center font-bold text-sky-600">
            {formatEur(points[0].price)} → {formatEur(currentPrice)}
          </div>
        )}
        <div>
          <span className="text-slate-400">{labels.highest}: </span>
          <span className="font-semibold text-slate-700">{formatEur(maxPrice)}</span>
        </div>
      </div>
    </div>
  );
}
