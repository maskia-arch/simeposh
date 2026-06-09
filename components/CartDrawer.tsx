'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { displayCountryName } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';
import { createClient } from '@/lib/supabase/client';

const TYPE_BADGE: Record<string, { icon: string; label: string }> = {
  travel:        { icon: '✈️', label: 'Travel' },
  unlimited_eco: { icon: '♾️', label: 'Eco' },
  unlimited_pro: { icon: '⚡', label: 'Pro' },
};

export function CartDrawer() {
  const { locale, t } = useTranslation();
  const { items, isOpen, close, total, count, setQuantity, removeItem, clear } = useCart();
  const [email,   setEmail]   = useState('');
  const [user,    setUser]    = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSpend, setTotalSpend] = useState<number>(0);
  const [extraCashbackQueue, setExtraCashbackQueue] = useState<number>(0);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) {
        setEmail(data.user.email || '');
        (supabase
          .from('esim_cash_accounts')
          .select('balance_eur, total_spend_eur, extra_cashback_queue')
          .maybeSingle() as any)
          .then(({ data: acc }: any) => {
            if (acc) {
              setBalance(Number(acc.balance_eur) || 0);
              setTotalSpend(Number(acc.total_spend_eur) || 0);
              setExtraCashbackQueue(Number(acc.extra_cashback_queue) || 0);
            }
          });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_, session) => {
        const u = session?.user ?? null;
        setUser(u);
        if (u) {
          setEmail(u.email || '');
          (supabase
            .from('esim_cash_accounts')
            .select('balance_eur, total_spend_eur, extra_cashback_queue')
            .maybeSingle() as any)
            .then(({ data: acc }: any) => {
              if (acc) {
                setBalance(Number(acc.balance_eur) || 0);
                setTotalSpend(Number(acc.total_spend_eur) || 0);
                setExtraCashbackQueue(Number(acc.extra_cashback_queue) || 0);
              }
            });
        } else {
          setBalance(0);
          setTotalSpend(0);
          setExtraCashbackQueue(0);
          setEmail('');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);


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
            <div className="border-t border-slate-200 px-5 py-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-600">{t('cart_total')} ({count} {count === 1 ? t('cart_unit_one') : t('cart_unit_many')})</span>
                <Price eur={total} className="text-xl font-extrabold text-slate-900" />
              </div>

              {/* Cashback Promo Banner */}
              <div className="rounded-xl p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 shadow-sm">
                {user ? (
                  <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 leading-normal">
                    {t('checkout_cashback_earned' as any, { 
                      amount: (total * (
                        (totalSpend >= 1000 ? 0.10 : totalSpend >= 500 ? 0.08 : totalSpend >= 100 ? 0.06 : 0.05) + 
                        (extraCashbackQueue > 0 ? 0.05 : 0)
                      )).toFixed(2)
                    })}
                  </p>
                ) : (
                  <div className="text-xs text-amber-800 leading-normal font-medium">
                    <span className="font-bold block text-[13px] text-amber-900 mb-1">{t('checkout_cashback_guest_promo' as any)}</span>
                    <a
                      href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                      className="font-extrabold text-brand-700 underline hover:text-brand-900 transition-colors"
                    >
                      {t('checkout_cashback_guest_link' as any)}
                    </a>
                    <span>{t('checkout_cashback_guest_text' as any)}</span>
                  </div>
                )}
              </div>

              {user ? (
                <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('checkout_email_label') || 'Email Address'}</p>
                  <p className="text-sm font-semibold text-slate-700 mt-0.5">{user.email}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{t('cart_email_hint')}</p>
                </div>
              ) : (
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('cart_email_ph')}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                  />
                  <p className="mt-1 text-xs text-slate-400">{t('cart_email_hint')}</p>
                </div>
              )}

              {/* Payment selector */}
              <div className="border-t border-slate-100 pt-4">
                <CryptoPaySelector
                  email={email}
                  items={items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined }))}
                  total={total}
                  balance={balance}
                  user={user}
                />
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
