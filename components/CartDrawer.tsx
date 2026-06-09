'use client';

import { useState } from 'react';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { displayCountryName } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';

const TYPE_BADGE: Record<string, { icon: string; label: string }> = {
  travel:        { icon: '✈️', label: 'Travel' },
  unlimited_eco: { icon: '♾️', label: 'Eco' },
  unlimited_pro: { icon: '⚡', label: 'Pro' },
};

export function CartDrawer() {
  const { locale, t } = useTranslation();
  const { items, isOpen, close, total, count, setQuantity, removeItem, clear } = useCart();
  const [email,   setEmail]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  async function handleCheckout() {
    setError('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError(t('cart_invalid_email'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/checkout/cart', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          items: items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) {
        throw new Error(data.error ?? t('cart_failed'));
      }
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cart_unknown'));
      setLoading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={close}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
            🛒 {t('cart_title')}
            {count > 0 && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                {count}
              </span>
            )}
          </h2>
          <button onClick={close} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
            <p className="mb-3 text-5xl">🛒</p>
            <p className="font-semibold text-slate-600">{t('cart_empty_title')}</p>
            <p className="mt-1 text-sm">{t('cart_empty_sub')}</p>
            <a
              href="/tariffs"
              onClick={close}
              className="mt-5 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
            >
              {t('cart_discover')}
            </a>
          </div>
        ) : (
          <>
            <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
              {items.map((i) => {
                const badge = i.tariffType ? TYPE_BADGE[i.tariffType] : null;
                const isUnlimited = i.tariffType?.startsWith('unlimited') || i.dataGb === 0;
                return (
                  <div key={i.key} className="flex gap-3 rounded-2xl border border-slate-200 p-3">
                    <CountryFlag countryCode={i.countryCode} countryName={i.countryName} size={36} className="mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-semibold text-slate-800">
                          {displayCountryName(
                            { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
                            locale,
                          )}
                        </p>
                        <button
                          onClick={() => removeItem(i.key)}
                          className="shrink-0 text-slate-300 hover:text-red-500"
                          aria-label={t('cart_clear')}
                          title={t('cart_clear')}
                        >
                          🗑️
                        </button>
                      </div>
                      <p className="text-xs text-slate-500">
                        {badge && <span className="mr-1">{badge.icon} {badge.label}</span>}
                        · {isUnlimited ? '∞' : formatGb(i.dataGb)} · {i.validityDays}d
                      </p>

                      <div className="mt-2 flex items-center justify-between">
                        {/* Quantity stepper */}
                        <div className="flex items-center rounded-lg border border-slate-200">
                          <button
                            onClick={() => setQuantity(i.key, i.quantity - 1)}
                            className="px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                            aria-label="Weniger"
                          >−</button>
                          <span className="min-w-[2rem] text-center text-sm font-semibold tabular-nums">{i.quantity}</span>
                          <button
                            onClick={() => setQuantity(i.key, i.quantity + 1)}
                            className="px-2.5 py-1 text-slate-500 hover:bg-slate-50"
                            aria-label="Mehr"
                          >+</button>
                        </div>
                        <Price eur={i.priceEur * i.quantity} className="font-bold text-slate-900 tabular-nums" />
                      </div>
                    </div>
                  </div>
                );
              })}

              <button
                onClick={clear}
                className="w-full rounded-lg py-2 text-xs text-slate-400 hover:text-red-500 transition-colors"
              >
                {t('cart_clear')}
              </button>
            </div>

            {/* Footer / checkout */}
            <div className="border-t border-slate-200 px-5 py-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">{t('cart_total')} ({count} {count === 1 ? t('cart_unit_one') : t('cart_unit_many')})</span>
                <Price eur={total} className="text-xl font-extrabold text-slate-900" />
              </div>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('cart_email_ph')}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-lg"
              >
                {loading ? t('cart_loading') : <>{t('cart_checkout')} · <Price eur={total} /></>}
              </button>
              <p className="text-center text-xs text-slate-400">{t('cart_secure')}</p>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
