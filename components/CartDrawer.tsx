'use client';

import { useState, useEffect } from 'react';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { displayCountryName, isNonHkIpTariff } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';
import { createClient } from '@/lib/supabase/client';
import { EcoIcon } from '@/components/Icons';

const TYPE_BADGE: Record<string, { icon: React.ReactNode; label: string }> = {
  travel:        { icon: <span>✈️</span>, label: 'Travel' },
  unlimited_eco: { icon: <EcoIcon size={12} className="inline-block align-middle" />, label: 'Eco' },
  unlimited_pro: { icon: <span>⚡</span>, label: 'Pro' },
};

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
    if (window.confirm(t('cart_clear_confirm'))) {
      clear();
    }
  };

  const [email, setEmail]             = useState('');
  const [user, setUser]               = useState<any>(null);
  const [balance, setBalance]         = useState<number>(0);
  const [totalSpend, setTotalSpend]   = useState<number>(0);
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

  useEffect(() => {
    if (user?.email && (!email || email !== user.email)) {
      setEmail(user.email);
    }
  }, [user]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] bg-black/40 backdrop-blur-xs transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={close}
      />

      {/* Slide-over Panel */}
      <aside
        className={`fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-hidden={!isOpen}
      >
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-white">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <CustomCartIcon className="h-4.5 w-4.5 text-brand-600" />
            <span>{t('cart_title')}</span>
            {count > 0 && (
              <span className="rounded-full bg-brand-100 border border-brand-200 px-2 py-0.5 text-[11px] font-black text-brand-700">
                {count}
              </span>
            )}
          </h2>
          <button
            onClick={close}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer text-xs"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
            <div className="mb-3 rounded-full bg-brand-50 p-4 text-brand-600 shadow-inner ring-1 ring-brand-100">
              <CustomCartIcon className="h-8 w-8" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">{t('cart_empty_title')}</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">{t('cart_empty_sub')}</p>
            <a
              href="/tariffs"
              onClick={close}
              className="mt-4 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-black text-white hover:bg-brand-700 shadow-sm transition-all"
            >
              {t('cart_discover')}
            </a>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-thin">
            {/* Section 1: Item List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Ausgewählte eSIMs</span>
                <button
                  onClick={handleClearConfirm}
                  className="text-[11px] font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>🗑️ Leeren</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {items.map((i) => {
                  const badge = i.tariffType ? TYPE_BADGE[i.tariffType] : null;
                  const isUnlimited = i.tariffType?.startsWith('unlimited') || i.dataGb === 0;
                  const isNonHk = isNonHkIpTariff({ name: i.name, package_code: i.packageCode });
                  return (
                    <div key={i.key} className="flex items-center gap-2.5 p-2.5 bg-white">
                      <CountryFlag countryCode={i.countryCode} countryName={i.countryName} size={24} className="shrink-0 rounded-sm shadow-sm ring-1 ring-black/5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-xs font-extrabold text-slate-900 flex items-center gap-1">
                            <span>
                              {displayCountryName(
                                { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
                                locale,
                              )}
                            </span>
                            {isNonHk && (
                              <span className="shrink-0 text-[8px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1 py-0.2 rounded-full">
                                🛡️ Non-HK
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => removeItem(i.key)}
                            className="shrink-0 flex items-center justify-center w-4.5 h-4.5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer text-[10px]"
                            aria-label={t('cart_clear')}
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500 font-medium flex items-center flex-wrap gap-1">
                          {badge && <span className="inline-flex items-center gap-0.5 mr-0.5">{badge.icon} <span>{badge.label}</span></span>}
                          <span>· {isUnlimited ? '∞ Unlimited' : formatGb(i.dataGb)} · {i.validityDays}d</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                          <button
                            onClick={() => setQuantity(i.key, i.quantity - 1)}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition-colors rounded-l-lg cursor-pointer"
                          >−</button>
                          <span className="min-w-[1rem] text-center text-[11px] font-extrabold tabular-nums text-slate-800">{i.quantity}</span>
                          <button
                            onClick={() => setQuantity(i.key, i.quantity + 1)}
                            className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-200 transition-colors rounded-r-lg cursor-pointer"
                          >+</button>
                        </div>
                        <Price eur={i.priceEur * i.quantity} className="text-xs font-black text-slate-900 tabular-nums" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Compact Cashback & Delivery Email Row */}
            <div className="space-y-2">
              {/* Delivery Email Input */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  E-Mail für QR-Zustellung
                </label>
                {user ? (
                  <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-1.5">
                    <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200 shrink-0">Eingeloggt</span>
                  </div>
                ) : (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                    placeholder="deine@email.de"
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400"
                  />
                )}
              </div>

              {/* Compact Cashback Note */}
              <div className="rounded-xl p-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-[11px] text-blue-900 flex items-center gap-2">
                <span className="shrink-0">✨</span>
                <div className="flex-1 truncate">
                  {user ? (
                    <span className="font-bold">
                      {t('checkout_cashback_earned' as any, { 
                        amount: (total * (
                          (totalSpend >= 1000 ? 0.10 : totalSpend >= 500 ? 0.08 : totalSpend >= 100 ? 0.06 : 0.05) + 
                          (extraCashbackQueue > 0 ? 0.05 : 0)
                        )).toFixed(2)
                      })}
                    </span>
                  ) : (
                    <span>
                      <span className="font-bold">Bis zu 15% Cashback</span> ·{' '}
                      <a
                        href={`/login?redirect=${encodeURIComponent(typeof window !== 'undefined' ? window.location.pathname + window.location.search : '')}`}
                        className="font-bold text-brand-600 underline"
                      >
                        Einloggen
                      </a>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Section 3: High-Density Payment Selector & Sticky Balanced CTA */}
            <CryptoPaySelector
              email={email}
              items={items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined }))}
              total={total}
              balance={balance}
              user={user}
            />
          </div>
        )}
      </aside>
    </>
  );
}
