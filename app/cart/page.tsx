'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useCart } from '@/components/CartProvider';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';
import { displayCountryName, coverageLabel } from '@/lib/tariff-display';
import { useTranslation } from '@/lib/i18n';
import { PlaneIcon, InfinityIcon, BoltIcon, CartIcon, GlobeIcon, TrashIcon } from '@/components/Icons';

const TYPE_BADGE: Record<string, { icon: React.ReactNode; label: string }> = {
  travel:        { icon: <PlaneIcon size={12} className="currentColor" />, label: 'Travel' },
  unlimited_eco: { icon: <InfinityIcon size={12} className="currentColor" />, label: 'Unlimited Eco' },
  unlimited_pro: { icon: <BoltIcon size={12} className="currentColor" />, label: 'Unlimited Pro' },
};

export default function CartPage() {
  const { locale, t } = useTranslation();
  const { items, total, count, setQuantity, removeItem, clear } = useCart();
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

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="flex justify-center mb-4">
          <CartIcon size={64} className="text-slate-300" />
        </div>
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
      <h1 className="mb-6 text-3xl font-bold text-slate-900 flex items-center gap-2">
        <CartIcon size={28} className="text-slate-900" />
        <span>{t('cart_title')}</span>
      </h1>

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
                        {badge && <span className="inline-flex items-center gap-1">{badge.icon} {badge.label} · </span>}
                        {isUnlimited ? '∞' : formatGb(i.dataGb)} · {i.validityDays} {t('cfg_days')}
                        {coverage && (
                          <span className="inline-flex items-center gap-0.5 ml-1">
                            · <GlobeIcon size={12} className="text-slate-400" />
                            <span>{coverage}</span>
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(i.key)}
                      className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors"
                      title={t('cart_clear')}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                        <line x1="1" y1="1" x2="11" y2="11" />
                        <line x1="11" y1="1" x2="1" y2="11" />
                      </svg>
                    </button>
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
              <>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('cart_email_ph')}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                />
                <p className="text-xs text-slate-400">{t('cart_email_hint')}</p>
              </>
            )}

            {/* Crypto payment (own infrastructure, amount-based matching) */}
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
        </div>
      </div>
    </div>
  );
}
