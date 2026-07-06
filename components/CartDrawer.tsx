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

// Custom brand-aligned Vector Cart Icon
function CustomCartIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  );
}

export function CartDrawer() {
  const { locale, t } = useTranslation();
  const { items, isOpen, close, total, count, setQuantity, removeItem, clear } = useCart();
  
  const handleClearConfirm = () => {
    const confirmMsg = locale === 'de'
      ? 'Möchtest du deinen Warenkorb wirklich leeren?'
      : 'Are you sure you want to empty your cart?';
    if (window.confirm(confirmMsg)) {
      clear();
    }
  };
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
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 className="flex items-center gap-2 text-md font-extrabold text-slate-900">
            <CustomCartIcon className="h-5 w-5 text-brand-600" />
            {t('cart_title')}
            {count > 0 && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-bold text-brand-700">
                {count}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-3">
            <button onClick={close} className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 transition-colors cursor-pointer" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
            <div className="mb-3 rounded-full bg-slate-50 p-4 text-brand-500 shadow-sm ring-1 ring-slate-100/50">
              <CustomCartIcon className="h-10 w-10" />
            </div>
            <p className="font-bold text-slate-700">{t('cart_empty_title')}</p>
            <p className="mt-1 text-xs text-slate-450">{t('cart_empty_sub')}</p>
            <a
              href="/tariffs"
              onClick={close}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 shadow-sm transition-all"
            >
              {t('cart_discover')}
            </a>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
            {/* Sleek, borderless list layout with divide separator */}
            <div className="flex-1 divide-y divide-slate-100 px-4 min-h-0 overflow-y-auto">
              {items.map((i) => {
                const badge = i.tariffType ? TYPE_BADGE[i.tariffType] : null;
                const isUnlimited = i.tariffType?.startsWith('unlimited') || i.dataGb === 0;
                return (
                  <div key={i.key} className="flex items-center gap-3 py-3 bg-white">
                    <CountryFlag countryCode={i.countryCode} countryName={i.countryName} size={24} className="shrink-0 rounded-sm shadow-sm ring-1 ring-black/5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-xs font-bold text-slate-800">
                          {displayCountryName(
                            { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
                            locale,
                          )}
                        </p>
                        <button
                          onClick={() => removeItem(i.key)}
                          className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                          aria-label={t('cart_clear')}
                        >
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                            <line x1="1" y1="1" x2="11" y2="11" />
                            <line x1="11" y1="1" x2="1" y2="11" />
                          </svg>
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-450 mt-0.5">
                        {badge && <span className="mr-1">{badge.icon} {badge.label}</span>}
                        · {isUnlimited ? '∞' : formatGb(i.dataGb)} · {i.validityDays}d
                      </p>
                      
                      <div className="mt-1.5 flex items-center justify-between">
                        {/* Quantity stepper */}
                        <div className="flex items-center rounded-md border border-slate-200 bg-slate-50">
                          <button
                            onClick={() => setQuantity(i.key, i.quantity - 1)}
                            className="px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors rounded-l-md"
                            aria-label="Weniger"
                          >−</button>
                          <span className="min-w-[1.25rem] text-center text-[11px] font-semibold tabular-nums text-slate-700">{i.quantity}</span>
                          <button
                            onClick={() => setQuantity(i.key, i.quantity + 1)}
                            className="px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100 transition-colors rounded-r-md"
                            aria-label="Mehr"
                          >+</button>
                        </div>
                        <Price eur={i.priceEur * i.quantity} className="text-xs font-extrabold text-slate-900 tabular-nums" />
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Clear Cart Button */}
              <div className="flex justify-end py-3 border-t border-slate-100 mt-2">
                <button
                  onClick={handleClearConfirm}
                  className="text-xs font-bold text-slate-400 hover:text-red-650 flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <span>🗑️</span> {t('cart_clear')}
                </button>
              </div>
            </div>

            {/* Footer / checkout */}
            <div className="border-t border-slate-150 px-4 py-3.5 space-y-2.5 bg-slate-50/50">
              <div className="flex items-center justify-between border-b border-slate-200/50 pb-2">
                <span className="text-xs text-slate-500 font-medium">{t('cart_total')} ({count} {count === 1 ? t('cart_unit_one') : t('cart_unit_many')})</span>
                <Price eur={total} className="text-md font-extrabold text-slate-900" />
              </div>

              {/* Compact Cashback Promo Banner in Brand Blue */}
              <div className="rounded-lg p-2 bg-blue-50/50 border border-blue-100/60 text-[10px] text-blue-800 leading-normal flex items-start gap-2 shadow-sm">
                <span className="text-[11px] shrink-0">✨</span>
                <div className="flex-1 font-medium">
                  {user ? (
                    <p className="font-semibold text-blue-900">
                      {t('checkout_cashback_earned' as any, { 
                        amount: (total * (
                          (totalSpend >= 1000 ? 0.10 : totalSpend >= 500 ? 0.08 : totalSpend >= 100 ? 0.06 : 0.05) + 
                          (extraCashbackQueue > 0 ? 0.05 : 0)
                        )).toFixed(2)
                      })}
                    </p>
                  ) : (
                    <div>
                      <span className="font-bold block text-blue-950 mb-0.5">{t('checkout_cashback_guest_promo' as any)}</span>
                      <a
                        href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                        className="font-extrabold text-brand-600 underline hover:text-brand-855 transition-colors"
                      >
                        {t('checkout_cashback_guest_link' as any)}
                      </a>
                      <span> {t('checkout_cashback_guest_text' as any)}</span>
                    </div>
                  )}
                </div>
              </div>

              {user ? (
                <div className="rounded-lg bg-white border border-slate-200 px-3 py-1.5 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">{t('checkout_email_label') || 'Email Address'}</p>
                    <p className="text-xs font-semibold text-slate-700 mt-0.5">{user.email}</p>
                  </div>
                  <span className="text-[9px] text-slate-400">{t('cart_email_hint')}</span>
                </div>
              ) : (
                <div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('cart_email_ph')}
                    className="w-full rounded-lg border border-slate-350 bg-white px-3 py-2 text-xs outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all text-slate-800"
                  />
                </div>
              )}

              {/* Payment selector */}
              <div className="border-t border-slate-200/50 pt-2.5">
                <CryptoPaySelector
                  email={email}
                  items={items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined }))}
                  total={total}
                  balance={balance}
                  user={user}
                />
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
