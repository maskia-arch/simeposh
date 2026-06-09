'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { useTranslation } from '@/lib/i18n';
import { Price } from '@/components/Price';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface CheckoutModalProps {
  tariff:       Tariff;
  orderType?:   'new_esim' | 'top_up';
  topUpIccid?:  string;
  /** Custom day-pass duration (unlimited configs) — sent so the server recomputes the price. */
  days?:        number;
  onClose:      () => void;
}

export function CheckoutModal({
  tariff,
  orderType = 'new_esim',
  topUpIccid,
  days,
  onClose,
}: CheckoutModalProps) {
  const { t }               = useTranslation();
  const [email, setEmail]   = useState('');
  const [user, setUser]     = useState<any>(null);
  const [balance, setBalance] = useState<number>(0);
  const [totalSpend, setTotalSpend] = useState<number>(0);
  const [extraCashbackQueue, setExtraCashbackQueue] = useState<number>(0);
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {orderType === 'top_up' ? t('checkout_title_topup') : t('checkout_title_new')}
            </h2>
            <p className="text-sm text-slate-500">{tariff.country_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-xl bg-brand-50 p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_plan')}</span>
            <span className="font-medium">{tariff.name}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_data')}</span>
            <span className="font-medium">
              {isUnlimited ? t('card_unlimited') : formatGb(tariff.data_gb)}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_validity')}</span>
            <span className="font-medium">{tariff.validity_days} {t('checkout_days')}</span>
          </div>
          {orderType === 'top_up' && topUpIccid && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{t('checkout_iccid')}</span>
              <span className="font-mono text-xs">{topUpIccid}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-brand-200 pt-2">
            <span className="font-semibold text-slate-800">{t('checkout_total')}</span>
            <Price eur={tariff.sale_price_eur} className="text-xl font-bold text-brand-700" />
          </div>
        </div>

        {/* Cashback Promo Banner */}
        <div className="mb-4 rounded-xl p-3 bg-gradient-to-br from-amber-50 to-amber-100/50 border border-amber-200/60 shadow-sm">
          {user ? (
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 leading-normal">
              {t('checkout_cashback_earned' as any, { 
                amount: (tariff.sale_price_eur * (
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

        {/* Email */}
        <div className="mb-4">
          {user ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('checkout_email_label') || 'Email Address'}</p>
              <p className="text-sm font-semibold text-slate-700 mt-0.5">{user.email}</p>
              <p className="text-[11px] text-slate-400 mt-1">{t('checkout_email_hint')}</p>
            </div>
          ) : (
            <>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                {t('checkout_email_label')}
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder={t('checkout_email_ph')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
              />
              <p className="mt-1 text-xs text-slate-400">{t('checkout_email_hint')}</p>
            </>
          )}
        </div>

        {/* Crypto payment (no third-party processor) */}
        <CryptoPaySelector
          email={email}
          items={[{ tariffId: tariff.id, quantity: 1, days, topUpIccid: orderType === 'top_up' ? topUpIccid : undefined }]}
          total={tariff.sale_price_eur}
          balance={balance}
          user={user}
        />
      </div>
    </div>
  );
}
