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

const TYPE_BADGE: Record<string, { icon: string; label: string }> = {
  travel:        { icon: '✈️', label: 'Travel' },
  unlimited_eco: { icon: '♾️', label: 'Eco' },
  unlimited_pro: { icon: '⚡', label: 'Pro' },
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
    const confirmMsg = locale === 'de'
      ? 'Möchtest du deinen Warenkorb wirklich leeren?'
      : 'Are you sure you want to empty your cart?';
    if (window.confirm(confirmMsg)) {
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
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-5 py-4 bg-white">
          <h2 className="flex items-center gap-2.5 text-base font-extrabold text-slate-900">
            <CustomCartIcon className="h-5 w-5 text-brand-600" />
            <span>{t('cart_title')}</span>
            {count > 0 && (
              <span className="rounded-full bg-brand-100 border border-brand-200 px-2.5 py-0.5 text-xs font-black text-brand-700">
                {count}
              </span>
            )}
          </h2>
          <button
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-400">
            <div className="mb-4 rounded-full bg-brand-50 p-5 text-brand-600 shadow-inner ring-1 ring-brand-100">
              <CustomCartIcon className="h-10 w-10" />
            </div>
            <p className="text-base font-extrabold text-slate-800">{t('cart_empty_title')}</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">{t('cart_empty_sub')}</p>
            <a
              href="/tariffs"
              onClick={close}
              className="mt-5 rounded-2xl bg-brand-600 px-5 py-3 text-xs font-black text-white hover:bg-brand-700 shadow-md transition-all"
            >
              {t('cart_discover')}
            </a>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0 scrollbar-thin">
            {/* Section 1: Item List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Ausgewählte eSIMs</span>
                <button
                  onClick={handleClearConfirm}
                  className="text-xs font-bold text-slate-400 hover:text-red-600 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>🗑️ Leeren</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                {items.map((i) => {
                  const badge = i.tariffType ? TYPE_BADGE[i.tariffType] : null;
                  const isUnlimited = i.tariffType?.startsWith('unlimited') || i.dataGb === 0;
                  const isNonHk = isNonHkIpTariff({ name: i.name, package_code: i.packageCode });
                  return (
                    <div key={i.key} className="flex items-center gap-3 p-3.5 bg-white hover:bg-slate-50/50 transition-colors">
                      <CountryFlag countryCode={i.countryCode} countryName={i.countryName} size={28} className="shrink-0 rounded-md shadow-sm ring-1 ring-black/5" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-xs font-extrabold text-slate-900 flex items-center gap-1">
                            <span>
                              {displayCountryName(
                                { country_name: i.countryName, country_code: i.countryCode, location_codes: i.locationCodes, region: i.region },
                                locale,
                              )}
                            </span>
                            {isNonHk && (
                              <span className="shrink-0 text-[9px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded-full">
                                🛡️ Non-HK IP
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => removeItem(i.key)}
                            className="shrink-0 flex items-center justify-center w-5 h-5 rounded-full bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                            aria-label={t('cart_clear')}
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-[10px] text-slate-500 mt-0.5 font-medium">
                          {badge && <span className="mr-1">{badge.icon} {badge.label}</span>}
                          · {isUnlimited ? '∞ Unlimited' : formatGb(i.dataGb)} · {i.validityDays}d
                        </p>
                        
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50">
                            <button
                              onClick={() => setQuantity(i.key, i.quantity - 1)}
                              className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors rounded-l-xl cursor-pointer"
                            >−</button>
                            <span className="min-w-[1.5rem] text-center text-xs font-extrabold tabular-nums text-slate-800">{i.quantity}</span>
                            <button
                              onClick={() => setQuantity(i.key, i.quantity + 1)}
                              className="px-2 py-0.5 text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors rounded-r-xl cursor-pointer"
                            >+</button>
                          </div>
                          <Price eur={i.priceEur * i.quantity} className="text-sm font-black text-slate-900 tabular-nums" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Section 2: Cashback Highlight Banner */}
            <div className="rounded-2xl p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 text-xs text-blue-900 flex items-start gap-2.5 shadow-sm">
              <span className="text-base shrink-0">✨</span>
              <div className="flex-1">
                {user ? (
                  <p className="font-extrabold text-blue-950">
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
                      className="font-black text-brand-600 underline hover:text-brand-800 transition-colors"
                    >
                      {t('checkout_cashback_guest_link' as any)}
                    </a>
                    <span className="text-slate-600"> {t('checkout_cashback_guest_text' as any)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Delivery Email Address */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm space-y-1.5">
              <label className="block text-xs font-extrabold text-slate-700">
                E-Mail für QR-Zustellung
              </label>
              {user ? (
                <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
                  <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">Eingeloggt</span>
                </div>
              ) : (
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="deine@email.de"
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-medium text-slate-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all placeholder:text-slate-400"
                />
              )}
            </div>

            {/* Section 4: Crypto & eSIM Cash Payment Selector (Includes sticky unmissable Bezahlen footer) */}
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
