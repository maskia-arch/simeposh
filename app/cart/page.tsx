'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';
import { displayCountryName, coverageLabel } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';

const TYPE_BADGE: Record<string, { icon: string; label: string }> = {
  travel:        { icon: '✈️', label: 'Travel' },
  unlimited_eco: { icon: '♾️', label: 'Unlimited Eco' },
  unlimited_pro: { icon: '⚡', label: 'Unlimited Pro' },
};

export default function CartPage() {
  const { locale, t } = useTranslation();
  const { items, total, count, setQuantity, removeItem, clear } = useCart();
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
        body:    JSON.stringify({ email, items: items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined })) }),
      });
      const data = await res.json();
      if (!res.ok || !data.checkoutUrl) throw new Error(data.error ?? t('cart_failed'));
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('cart_unknown'));
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="mb-4 text-6xl">🛒</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('cart_empty_title')}</h1>
        <p className="mb-6 text-slate-500">{t('cart_empty_sub')}</p>
        <Link href="/tariffs" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors">
          {t('cart_discover')}
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <h1 className="mb-6 text-3xl font-bold text-slate-900">🛒 {t('cart_title')}</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Items */}
        <div className="space-y-3 lg:col-span-2">
          {items.map((i) => {
            const badge = i.tariffType ? TYPE_BADGE[i.tariffType] : null;
            const isUnlimited = i.tariffType?.startsWith('unlimited') || i.dataGb === 0;
            const label = displayCountryName(
              { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
              locale,
            );
            const coverage = coverageLabel(
              { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
              locale,
            );
            return (
              <div key={i.key} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <CountryFlag countryCode={i.countryCode} countryName={label} size={44} className="mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold text-slate-800">{label}</p>
                      <p className="text-xs text-slate-500">
                        {badge && <span>{badge.icon} {badge.label} · </span>}
                        {isUnlimited ? '∞' : formatGb(i.dataGb)} · {i.validityDays} {t('cfg_days')}
                        {coverage && <span> · 🌍 {coverage}</span>}
                      </p>
                    </div>
                    <button onClick={() => removeItem(i.key)} className="text-slate-300 hover:text-red-500" title={t('cart_clear')}>🗑️</button>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-slate-200">
                      <button onClick={() => setQuantity(i.key, i.quantity - 1)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-50">−</button>
                      <span className="min-w-[2.5rem] text-center text-sm font-semibold tabular-nums">{i.quantity}</span>
                      <button onClick={() => setQuantity(i.key, i.quantity + 1)} className="px-3 py-1.5 text-slate-500 hover:bg-slate-50">+</button>
                    </div>
                    <Price eur={i.priceEur * i.quantity} className="font-bold text-slate-900 tabular-nums" />
                  </div>
                </div>
              </div>
            );
          })}
          <button onClick={clear} className="text-sm text-slate-400 hover:text-red-500 transition-colors">{t('cart_clear')}</button>
        </div>

        {/* Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <h2 className="font-bold text-slate-800">{t('cart_summary')}</h2>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">{count} {count === 1 ? t('cart_unit_one') : t('cart_unit_many')}</span>
              <Price eur={total} className="font-medium" />
            </div>
            <div className="flex justify-between border-t border-slate-100 pt-3">
              <span className="font-semibold text-slate-800">{t('cart_total')}</span>
              <Price eur={total} className="text-xl font-extrabold text-slate-900" />
            </div>

            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t('cart_email_ph')}
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
            <p className="text-xs text-slate-400">{t('cart_email_hint')}</p>

            {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

            <button
              onClick={handleCheckout}
              disabled={loading}
              className="w-full rounded-2xl bg-brand-600 py-3.5 text-base font-bold text-white hover:bg-brand-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-lg"
            >
              {loading ? t('cart_loading') : <>{t('cart_checkout')} · <Price eur={total} /></>}
            </button>
            <p className="text-center text-xs text-slate-400">{t('cart_secure')}</p>

            {/* Crypto payment (own infrastructure, amount-based matching) */}
            <div className="border-t border-slate-100 pt-4">
              <CryptoPaySelector
                email={email}
                items={items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined }))}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
