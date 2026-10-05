'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { displayCountryName, isNonHkIpTariff, isPremiumTariff } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';
import { CheckoutEmailField } from '@/components/CheckoutEmailField';
import { createClient } from '@/lib/supabase/client';
import { EcoIcon, TravelGlobeIcon, TravelPremiumGlobeIcon } from '@/components/Icons';
import { useHideChatBubble } from '@/lib/useHideChatBubble';

const TYPE_BADGE: Record<string, { icon: React.ReactNode; label: string }> = {
  travel:        { icon: <TravelGlobeIcon size={12} className="inline-block align-middle text-sky-600" />, label: 'Travel' },
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
  const pathname = usePathname();
  const { locale, t } = useTranslation();
  const { items, isOpen, close, total, count, setQuantity, removeItem, clear } = useCart();
  
  useEffect(() => {
    if (pathname?.startsWith('/checkout/crypto/')) {
      close();
    }
  }, [pathname, close]);

  const handleClearConfirm = () => {
    if (window.confirm(t('cart_clear_confirm'))) {
      clear();
    }
  };

  const [email, setEmail] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('esim_checkout_email') || '';
      } catch {}
    }
    return '';
  });
  const [emailError, setEmailError]   = useState('');
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
          const saved = typeof window !== 'undefined' ? localStorage.getItem('esim_checkout_email') || '' : '';
          setEmail(saved);
        }
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const savedEmail = localStorage.getItem('esim_checkout_email');
        if (savedEmail && !user) {
          setEmail(savedEmail);
        }
      } catch {}
    }
  }, [user]);

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('esim_checkout_email', val);
      } catch {}
    }
  };

  useEffect(() => {
    if (user?.email && (!email || email !== user.email)) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  useHideChatBubble(isOpen);

  const drawerRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      triggerRef.current = document.activeElement as HTMLElement | null;
      const timer = setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 50);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
          return;
        }
        if (e.key === 'Tab' && drawerRef.current) {
          const focusable = drawerRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          );
          if (focusable.length === 0) return;
          const first = focusable[0];
          const last = focusable[focusable.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === first) {
              e.preventDefault();
              last.focus();
            }
          } else {
            if (document.activeElement === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
        triggerRef.current?.focus();
      };
    }
  }, [isOpen, close]);

  const closeLabel = locale === 'de' ? 'Schließen' : 'Close';

  if (!isOpen) {
    return null;
  }

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
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cart-drawer-title"
        className="fixed right-0 top-0 z-[61] flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 translate-x-0"
      >
        {/* Compact Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-slate-100 px-4 py-3 bg-white">
          <h2 id="cart-drawer-title" className="flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <CustomCartIcon className="h-4.5 w-4.5 text-brand-600" />
            <span>{t('cart_title')}</span>
            {count > 0 && (
              <span className="rounded-full bg-brand-100 border border-brand-200 px-2 py-0.5 text-xs font-black text-brand-700">
                {count}
              </span>
            )}
          </h2>
          <button
            ref={closeButtonRef}
            onClick={close}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800 transition-colors cursor-pointer text-sm font-bold focus:outline-none focus:ring-2 focus:ring-brand-500"
            aria-label={closeLabel}
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-slate-500">
            <div className="mb-3 rounded-full bg-brand-50 p-4 text-brand-600 shadow-inner ring-1 ring-brand-100">
              <CustomCartIcon className="h-8 w-8" />
            </div>
            <p className="text-sm font-extrabold text-slate-800">{t('cart_empty_title')}</p>
            <p className="mt-1 text-xs text-slate-500 max-w-xs">{t('cart_empty_sub')}</p>
            <a
              href="/tariffs"
              onClick={close}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-black text-white hover:bg-brand-700 shadow-sm transition-all"
            >
              {t('cart_discover')}
            </a>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0 scrollbar-thin">
            {/* Section 1: Item List */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Ausgewählte eSIMs</span>
                <button
                  onClick={handleClearConfirm}
                  className="min-h-[44px] min-w-[44px] text-xs font-bold text-[#475569] hover:text-red-600 inline-flex items-center justify-center gap-1 cursor-pointer transition-colors px-2 py-1 rounded-lg"
                >
                  <span>🗑️ Leeren</span>
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
                {items.map((i) => {
                  const isPremium = isPremiumTariff({ name: i.name, package_code: i.packageCode });
                  const badge = isPremium && (!i.tariffType || i.tariffType === 'travel')
                    ? { icon: <TravelPremiumGlobeIcon size={12} className="inline-block align-middle text-amber-700" />, label: 'Travel Premium' }
                    : i.tariffType ? TYPE_BADGE[i.tariffType] : null;
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
                            {isPremium && (
                              <span className="shrink-0 text-[10px] font-bold text-amber-900 bg-amber-50 border border-amber-300 px-1.5 py-0.5 rounded-full inline-flex items-center gap-0.5">
                                <TravelPremiumGlobeIcon size={10} className="text-amber-800" /> Premium
                              </span>
                            )}
                            {isNonHk && (
                              <span className="shrink-0 text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded-full">
                                🛡️ Non-HK
                              </span>
                            )}
                          </p>
                          <button
                            onClick={() => removeItem(i.key)}
                            className="shrink-0 flex items-center justify-center min-w-[44px] min-h-[44px] rounded-full text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer text-xs font-bold"
                            aria-label={locale === 'de' ? 'Position entfernen' : 'Remove item'}
                          >
                            ✕
                          </button>
                        </div>

                        <p className="text-xs text-slate-500 font-medium flex items-center flex-wrap gap-1">
                          {badge && <span className="inline-flex items-center gap-0.5 mr-0.5">{badge.icon} <span>{badge.label}</span></span>}
                          <span>· {isUnlimited ? '∞ Unlimited' : formatGb(i.dataGb)} · {i.validityDays}d</span>
                          {i.topUpIccid && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-brand-50 border border-brand-200 px-1.5 py-0.5 text-xs font-bold text-brand-700 font-mono">
                              🔄 Refill: {i.topUpIccid.slice(-8)}
                            </span>
                          )}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 overflow-hidden">
                          <button
                            onClick={() => setQuantity(i.key, i.quantity - 1)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            aria-label={locale === 'de' ? 'Menge verringern' : 'Decrease quantity'}
                          >−</button>
                          <span className="min-w-[1.25rem] text-center text-xs font-extrabold tabular-nums text-slate-800 px-1">{i.quantity}</span>
                          <button
                            onClick={() => setQuantity(i.key, i.quantity + 1)}
                            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sm font-bold text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer"
                            aria-label={locale === 'de' ? 'Menge erhöhen' : 'Increase quantity'}
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
              <CheckoutEmailField
                email={email}
                onChange={handleEmailChange}
                error={emailError}
                onErrorChange={setEmailError}
                user={user}
              />

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
              items={items.map((i) => ({ tariffId: i.tariffId, quantity: i.quantity, days: i.periodDays ?? undefined, topUpIccid: i.topUpIccid ?? undefined }))}
              total={total}
              balance={balance}
              user={user}
              emailError={emailError}
              setEmailError={setEmailError}
            />
          </div>
        )}
      </aside>
    </>
  );
}
