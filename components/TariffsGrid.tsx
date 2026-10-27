'use client';

import { useState, useRef, useEffect } from 'react';
import { TariffCard }        from './TariffCard';
import { CheckoutModal }     from './CheckoutModal';
import { TariffDetailModal } from './TariffDetailModal';
import { useTranslation }    from '@/lib/i18n';
import type { PublicTariff } from '@/lib/tariffs';

import { NetworkIcon } from '@/components/Icons';

import { getRecommendedTariffId } from '@/lib/tariff-display';

type Tariff = PublicTariff;

const INITIAL_CHUNK_SIZE = 32;
const CHUNK_INCREMENT = 32;

const LOAD_MORE_LABELS: Record<string, string> = {
  de: 'Weitere Tarife laden',
  en: 'Load more plans',
  fr: 'Charger plus de forfaits',
  es: 'Cargar más planes',
  it: 'Carica altri piani',
  nl: 'Meer tarieven laden',
  pl: 'Załaduj więcej planów',
  pt: 'Carregar mais planos',
  tr: 'Daha fazla tarife yükle',
  sv: 'Ladda fler abonnemang',
  da: 'Indlæs flere planer',
  fi: 'Lataa lisää liittymiä',
  cs: 'Načíst další tarify',
  ro: 'Încarcă mai multe tarife',
  hu: 'További tarifák betöltése',
};

export function TariffsGrid({
  tariffs,
  recommendedTariffId,
}: {
  tariffs: Tariff[];
  recommendedTariffId?: string | null;
}) {
  const { t, locale } = useTranslation();
  const [checkout, setCheckout] = useState<Tariff | null>(null);
  const [detail,   setDetail]   = useState<Tariff | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(INITIAL_CHUNK_SIZE);
  const [focusTariffId, setFocusTariffId] = useState<string | null>(null);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // If tariffs change (e.g. filter/search change), reset visible count
  const [prevTariffs, setPrevTariffs] = useState(tariffs);
  if (prevTariffs !== tariffs) {
    setPrevTariffs(tariffs);
    setVisibleCount(INITIAL_CHUNK_SIZE);
    setFocusTariffId(null);
  }

  // After loading more, focus on first newly loaded card
  useEffect(() => {
    if (focusTariffId && cardRefs.current[focusTariffId]) {
      const el = cardRefs.current[focusTariffId];
      if (el) {
        el.tabIndex = -1;
        el.focus({ preventScroll: false });
      }
      setFocusTariffId(null);
    }
  }, [focusTariffId]);

  // If recommendedTariffId was explicitly provided (e.g. from CountryPageClient or TariffsPageClient with country search), use it.
  // Otherwise, if tariffs belong to a single destination country, auto-calculate.
  const effectiveRecommendedId = recommendedTariffId !== undefined
    ? recommendedTariffId
    : (() => {
        if (tariffs.length <= 1) return null;
        const firstCode = tariffs[0].country_code;
        const isSingleCountry = firstCode && tariffs.every((t) => t.country_code === firstCode);
        return isSingleCountry ? getRecommendedTariffId(tariffs) : null;
      })();

  if (tariffs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
        <div className="flex justify-center mb-3">
          <NetworkIcon size={40} className="text-slate-300" />
        </div>
        <p className="font-medium">{t('tariffs_empty')}</p>
        <p className="text-sm mt-1">{t('tariffs_empty_sub')}</p>
      </div>
    );
  }

  const visibleTariffs = tariffs.slice(0, visibleCount);
  const remainingCount = tariffs.length - visibleCount;
  const loadMoreText = LOAD_MORE_LABELS[locale] || LOAD_MORE_LABELS.en;

  const handleLoadMore = () => {
    const nextCount = visibleCount + CHUNK_INCREMENT;
    const firstNewIndex = visibleCount;
    const firstNewTariff = tariffs[firstNewIndex];
    const addedAmount = Math.min(remainingCount, CHUNK_INCREMENT);

    if (firstNewTariff) {
      setFocusTariffId(firstNewTariff.id);
    }
    setVisibleCount(nextCount);
    setLiveAnnouncement(
      locale === 'de'
        ? `${addedAmount} weitere Tarife geladen. ${Math.min(nextCount, tariffs.length)} von ${tariffs.length} sichtbar.`
        : `${addedAmount} more plans loaded. ${Math.min(nextCount, tariffs.length)} of ${tariffs.length} visible.`
    );
  };

  return (
    <>
      <div id="tariffs-grid" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {visibleTariffs.map((t) => (
          <div
            key={t.id}
            ref={(el) => { cardRefs.current[t.id] = el; }}
            className="outline-none"
          >
            <TariffCard
              tariff={t}
              isRecommended={t.id === effectiveRecommendedId}
              onBuy={(tariff) => setCheckout(tariff)}
              onDetail={(tariff) => setDetail(tariff)}
            />
          </div>
        ))}
      </div>

      {remainingCount > 0 && (
        <div className="mt-8 flex flex-col items-center justify-center gap-2">
          <div role="status" aria-live="polite" className="sr-only">
            {liveAnnouncement || `${tariffs.length - remainingCount} / ${tariffs.length}`}
          </div>
          <button
            type="button"
            aria-controls="tariffs-grid"
            onClick={handleLoadMore}
            className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-700 shadow-sm hover:border-brand-500 hover:bg-slate-50 active:scale-95 transition-all cursor-pointer min-h-[44px]"
          >
            {loadMoreText} (+{Math.min(remainingCount, CHUNK_INCREMENT)}) · {tariffs.length - remainingCount} / {tariffs.length}
          </button>
        </div>
      )}

      {checkout && (
        <CheckoutModal
          tariff={checkout}
          orderType="new_esim"
          onClose={() => setCheckout(null)}
        />
      )}

      {detail && (
        <TariffDetailModal
          tariff={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
