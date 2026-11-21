'use client';

import { useState, useEffect } from 'react';
import { formatEur } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { useThemeDemo } from '@/lib/theme-demo-context';
import { calculatePromoPriceCents } from '@/lib/promo-calculator';

export interface PriceHistoryEntry {
  price_eur: number;
  recorded_at: string;
  is_promotional?: boolean;
  regular_price_eur?: number | null;
  promotion_name?: string | null;
  discount_pct?: number | null;
}

const LABELS: Record<string, {
  title: string;
  subtitle: string;
  current: string;
  highest: string;
  lowest: string;
  stability: string;
  bestPrice: string;
  promoPrice: string;
  regularPrice: string;
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
    promoPrice: 'Aktionspreis',
    regularPrice: 'Regulärer Preis',
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
    promoPrice: 'Promo Price',
    regularPrice: 'Regular Price',
    loading: 'Loading price history...',
    error: 'Error loading',
  },
  fr: {
    title: 'Évolution du prix',
    subtitle: 'Transparence des prix pour ce forfait',
    current: 'Actuel',
    highest: 'Le plus haut',
    lowest: 'Le plus bas',
    stability: 'Stabilité des prix : aucun changement',
    bestPrice: 'Meilleur prix !',
    promoPrice: 'Prix promo',
    regularPrice: 'Prix régulier',
    loading: 'Chargement de l’historique des prix...',
    error: 'Erreur lors du chargement',
  },
  es: {
    title: 'Historial de precios',
    subtitle: 'Transparencia de precios para este plan',
    current: 'Actual',
    highest: 'Más alto',
    lowest: 'Más bajo',
    stability: 'Estabilidad de precios: sin variaciones',
    bestPrice: '¡Mejor precio!',
    promoPrice: 'Precio promocional',
    regularPrice: 'Precio regular',
    loading: 'Cargando historial de precios...',
    error: 'Error al cargar',
  },
  it: {
    title: 'Cronologia prezzi',
    subtitle: 'Trasparenza dei prezzi per questa tariffa',
    current: 'Attuale',
    highest: 'Più alto',
    lowest: 'Più basso',
    stability: 'Stabilità dei prezzi: nessuna variazione',
    bestPrice: 'Miglior prezzo!',
    promoPrice: 'Prezzo promozionale',
    regularPrice: 'Prezzo regolare',
    loading: 'Caricamento cronologia prezzi...',
    error: 'Errore durante il caricamento',
  },
  nl: {
    title: 'Prijsontwikkeling',
    subtitle: 'Prijstransparantie voor dit tarief',
    current: 'Huidig',
    highest: 'Hoogste',
    lowest: 'Laagste',
    stability: 'Prijsstabiliteit: geen prijswijzigingen',
    bestPrice: 'Beste prijs!',
    promoPrice: 'Actieprijs',
    regularPrice: 'Reguliere prijs',
    loading: 'Prijsgeschiedenis laden...',
    error: 'Fout bij het laden',
  },
  pl: {
    title: 'Historia cen',
    subtitle: 'Przejrzystość cenowa dla tej taryfy',
    current: 'Aktualna',
    highest: 'Najwyższa',
    lowest: 'Najniższa',
    stability: 'Stabilność cen: brak zmian cen',
    bestPrice: 'Najlepsza cena!',
    promoPrice: 'Cena promocyjna',
    regularPrice: 'Cena regularna',
    loading: 'Ładowanie historii cen...',
    error: 'Błąd podczas ładowania',
  },
  pt: {
    title: 'Histórico de preços',
    subtitle: 'Transparência de preços para este plano',
    current: 'Atual',
    highest: 'Mais alto',
    lowest: 'Mais baixo',
    stability: 'Estabilidade de preços: sem alterações',
    bestPrice: 'Melhor preço!',
    promoPrice: 'Preço promocional',
    regularPrice: 'Preço regular',
    loading: 'A carregar histórico de preços...',
    error: 'Erro ao carregar',
  },
  tr: {
    title: 'Fiyat Geçmişi',
    subtitle: 'Bu tarife için fiyat şeffaflığı',
    current: 'Mevcut',
    highest: 'En Yüksek',
    lowest: 'En Düşük',
    stability: 'Fiyat istikrarı: Fiyat değişikliği yok',
    bestPrice: 'En İyi Fiyat!',
    promoPrice: 'Kampanya Fiyatı',
    regularPrice: 'Normal Fiyat',
    loading: 'Fiyat geçmişi yükleniyor...',
    error: 'Yükleme hatası',
  },
  sv: {
    title: 'Prishistorik',
    subtitle: 'Pristransparens för detta abonnemang',
    current: 'Aktuellt',
    highest: 'Högsta',
    lowest: 'Lägsta',
    stability: 'Prisstabilitet: inga prisändringar',
    bestPrice: 'Bästa pris!',
    promoPrice: 'Kampanjpris',
    regularPrice: 'Ordinarie pris',
    loading: 'Laddar prishistorik...',
    error: 'Fel vid inläsning',
  },
  da: {
    title: 'Prishistorik',
    subtitle: 'Gennemskuelige priser for dette abonnement',
    current: 'Aktuel',
    highest: 'Højeste',
    lowest: 'Laveste',
    stability: 'Prisstabilitet: ingen prisændringer',
    bestPrice: 'Bedste pris!',
    promoPrice: 'Kampagnepris',
    regularPrice: 'Normalpris',
    loading: 'Indlæser prishistorik...',
    error: 'Fejl under indlæsning',
  },
  fi: {
    title: 'Hintahistoria',
    subtitle: 'Hintojen läpinäkyvyys tälle liittymälle',
    current: 'Nykyinen',
    highest: 'Korkein',
    lowest: 'Alhaisin',
    stability: 'Hintavakaus: ei hintamuutoksia',
    bestPrice: 'Paras hinta!',
    promoPrice: 'Tarjoushinta',
    regularPrice: 'Normaalihinta',
    loading: 'Ladataan hintahistoriaa...',
    error: 'Virhe ladattaessa',
  },
  cs: {
    title: 'Historie cen',
    subtitle: 'Cenová transparentnost pro tento tarif',
    current: 'Aktuální',
    highest: 'Nejvyšší',
    lowest: 'Nejnižší',
    stability: 'Cenová stabilita: beze změn cen',
    bestPrice: 'Nejlepší cena!',
    promoPrice: 'Akční cena',
    regularPrice: 'Běžná cena',
    loading: 'Načítání historie cen...',
    error: 'Chyba při načítání',
  },
  ro: {
    title: 'Istoric prețuri',
    subtitle: 'Transparență a prețurilor pentru acest tarif',
    current: 'Actual',
    highest: 'Cel mai mare',
    lowest: 'Cel mai mic',
    stability: 'Stabilitate a prețurilor: fără modificări de preț',
    bestPrice: 'Cel mai bun preț!',
    promoPrice: 'Preț promoțional',
    regularPrice: 'Preț standard',
    loading: 'Se încarcă istoricul prețurilor...',
    error: 'Eroare la încărcare',
  },
  hu: {
    title: 'Ártörténet',
    subtitle: 'Átlátható árazás ehhez a tarifához',
    current: 'Jelenlegi',
    highest: 'Legmagasabb',
    lowest: 'Legalacsonyabb',
    stability: 'Árstabilitás: nincs árváltozás',
    bestPrice: 'Legjobb ár!',
    promoPrice: 'Akciós ár',
    regularPrice: 'Normál ár',
    loading: 'Ártörténet betöltése...',
    error: 'Hiba a betöltéskor',
  },
};

interface Props {
  tariffId: string;
  currentPrice: number;
}

export function PriceChart({ tariffId, currentPrice }: Props) {
  const { locale } = useTranslation();
  const demo = useThemeDemo();
  const labels = LABELS[locale] || LABELS.en;

  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [hoveredPoint, setHoveredPoint] = useState<{
    price: number;
    dateStr: string;
    isPromotional?: boolean;
    promotionName?: string | null;
    regularPrice?: number | null;
    discountPct?: number | null;
  } | null>(null);

  useEffect(() => {
    async function fetchHistory() {
      try {
        const res = await fetch(`/api/tariffs/price-history?tariffId=${tariffId}`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        
        let fetched: PriceHistoryEntry[] = data.history ?? [];
        
        // Ensure we always have at least one entry representing the regular price
        if (fetched.length === 0) {
          fetched = [{ price_eur: currentPrice, recorded_at: new Date().toISOString() }];
        }
        
        // If demo mode is active with a promo discount, dynamically add the simulated promo point
        if (demo.isDemoActive && demo.activePromo && demo.activePromo.discount_basis_points > 0) {
          const promoCalc = calculatePromoPriceCents(
            Math.round(currentPrice * 100),
            demo.activePromo.discount_basis_points,
            demo.activePromo.rounding_strategy
          );
          if (promoCalc.applied) {
            fetched.push({
              price_eur: promoCalc.promoCents / 100,
              recorded_at: new Date().toISOString(),
              is_promotional: true,
              regular_price_eur: currentPrice,
              promotion_name: demo.activePromo.internal_name,
              discount_pct: Math.round(demo.activePromo.discount_basis_points / 100),
            });
          }
        } else {
          // If the last entry's price is different from currentPrice, append currentPrice
          const lastEntry = fetched[fetched.length - 1];
          if (Math.abs(Number(lastEntry.price_eur) - currentPrice) >= 0.01) {
            fetched.push({ price_eur: currentPrice, recorded_at: new Date().toISOString() });
          }
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
  }, [tariffId, currentPrice, demo.isDemoActive, demo.activePresetId]);

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
  const effectiveCurrentPrice = history[history.length - 1]?.price_eur ?? currentPrice;
  const maxPrice = Math.max(...prices, currentPrice);
  const minPrice = Math.min(...prices, effectiveCurrentPrice);
  const isBestPrice = effectiveCurrentPrice <= minPrice;
  const hasPromotionalPoints = history.some(h => h.is_promotional);

  // Chart configuration
  const width = 420;
  const height = 110;
  const paddingX = 20;
  const paddingY = 22;

  // Generate coordinates
  interface ChartPoint {
    x: number;
    y: number;
    price: number;
    dateStr: string;
    isPromotional?: boolean;
    promotionName?: string | null;
    regularPrice?: number | null;
    discountPct?: number | null;
  }

  let points: ChartPoint[] = [];

  if (history.length <= 1) {
    // If only one data point exists, draw a horizontal line
    points = [
      { x: paddingX, y: height / 2, price: effectiveCurrentPrice, dateStr: '', isPromotional: history[0]?.is_promotional },
      { x: width - paddingX, y: height / 2, price: effectiveCurrentPrice, dateStr: '', isPromotional: history[0]?.is_promotional }
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
      const dateStr = date.toLocaleDateString(locale || 'en', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
      return {
        x,
        y,
        price: Number(entry.price_eur),
        dateStr,
        isPromotional: entry.is_promotional,
        promotionName: entry.promotion_name,
        regularPrice: entry.regular_price_eur,
        discountPct: entry.discount_pct,
      };
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
        <div className="flex items-center gap-1.5">
          {hasPromotionalPoints && (
            <span className="inline-flex items-center rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold text-rose-800 uppercase tracking-wide">
              🏷️ {labels.promoPrice}
            </span>
          )}
          {isBestPrice && hasPriceChanges && (
            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 uppercase tracking-wide animate-pulse">
              ✨ {labels.bestPrice}
            </span>
          )}
        </div>
      </div>

      {/* Hover Info Tooltip Bar */}
      {hoveredPoint ? (
        <div className="mb-2 p-2 rounded-xl bg-slate-900 text-white text-[11px] flex items-center justify-between animate-in fade-in duration-150 shadow-md">
          <div className="flex items-center gap-2">
            {hoveredPoint.isPromotional ? (
              <span className="rounded bg-rose-600 px-1.5 py-0.2 text-[9px] font-black uppercase text-white">
                Aktion: {hoveredPoint.promotionName || 'Special'}
              </span>
            ) : (
              <span className="rounded bg-sky-600 px-1.5 py-0.2 text-[9px] font-bold uppercase text-white">
                Regulär
              </span>
            )}
            <span className="font-extrabold text-white text-xs">{formatEur(hoveredPoint.price)}</span>
            {hoveredPoint.regularPrice && hoveredPoint.isPromotional && (
              <span className="text-slate-400 line-through text-[10px]">
                statt {formatEur(hoveredPoint.regularPrice)}
              </span>
            )}
            {hoveredPoint.discountPct && hoveredPoint.isPromotional && (
              <span className="text-amber-400 font-bold text-[10px]">
                (−{hoveredPoint.discountPct}%)
              </span>
            )}
          </div>
          <span className="text-[10px] text-slate-400 font-mono">{hoveredPoint.dateStr}</span>
        </div>
      ) : (
        <div className="h-2 mb-1" />
      )}

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id="chart-grad-reg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id="chart-grad-promo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
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
          <polygon points={areaPoints} fill={hasPromotionalPoints ? "url(#chart-grad-promo)" : "url(#chart-grad-reg)"} />

          {/* Trend line */}
          <path
            d={linePath}
            fill="none"
            stroke={hasPromotionalPoints ? "#f43f5e" : "#0ea5e9"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points */}
          {points.map((p, i) => {
            const isPromo = p.isPromotional === true;
            return (
              <g
                key={i}
                className="cursor-pointer group/dot"
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => setHoveredPoint(p)}
              >
                {isPromo ? (
                  <>
                    {/* Glowing outer halo for promotional price */}
                    <circle cx={p.x} cy={p.y} r="8" fill="#f43f5e" fillOpacity="0.25" className="animate-pulse" />
                    <circle cx={p.x} cy={p.y} r="4.5" fill="#f43f5e" stroke="#ffffff" strokeWidth="2" />
                    
                    {/* Promotional Badge on chart */}
                    <g transform={`translate(${p.x}, ${p.y - 12})`}>
                      <rect
                        x="-18"
                        y="-10"
                        width="36"
                        height="12"
                        rx="4"
                        fill="#f43f5e"
                      />
                      <text
                        x="0"
                        y="-1.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="7"
                        fontWeight="900"
                        fontFamily="sans-serif"
                      >
                        {p.discountPct ? `−${p.discountPct}%` : 'DEAL'}
                      </text>
                    </g>
                  </>
                ) : (
                  <>
                    <circle cx={p.x} cy={p.y} r="3" fill="#ffffff" stroke="#0ea5e9" strokeWidth="2" />
                  </>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Stats footer */}
      <div className="flex flex-col gap-2 mt-3 pt-2 border-t border-slate-100/60 text-[10px]">
        {/* Color Legend */}
        <div className="flex items-center justify-between text-slate-500 font-medium">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-sky-500 inline-block" />
              <span>{labels.regularPrice}</span>
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 inline-block" />
              <span>{labels.promoPrice} (z. B. Black Friday)</span>
            </span>
          </div>
          <span className="text-[9px] text-slate-400">Punkt berühren für Details</span>
        </div>

        {/* Min / Max / Stability Stats */}
        <div className="flex items-center justify-between text-slate-500 font-medium pt-1">
          <div>
            <span className="text-slate-400">{labels.lowest}: </span>
            <span className="font-semibold text-slate-700">{formatEur(minPrice)}</span>
          </div>
          {!hasPriceChanges ? (
            <span className="text-[9px] text-slate-400 italic">{labels.stability}</span>
          ) : (
            <div className="text-center font-bold text-sky-600">
              {formatEur(points[0].price)} → {formatEur(effectiveCurrentPrice)}
            </div>
          )}
          <div>
            <span className="text-slate-400">{labels.highest}: </span>
            <span className="font-semibold text-slate-700">{formatEur(maxPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
