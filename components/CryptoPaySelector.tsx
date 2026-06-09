'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface CoinOption {
  code: string; name: string; surchargePct: number; surchargeFixedEur: number; confirmations: number;
}
const COIN_ICON: Record<string, string> = { BTC: '₿', LTC: 'Ł', ETH: 'Ξ', SOL: '◎' };

export interface CryptoItem { tariffId: string; quantity: number; days?: number; topUpIccid?: string }

interface CryptoPaySelectorProps {
  email: string;
  items: CryptoItem[];
  total: number;
  balance: number;
  user: any;
}

export function CryptoPaySelector({ email, items, total, balance, user }: CryptoPaySelectorProps) {
  const { t } = useTranslation();
  const [coins, setCoins]     = useState<CoinOption[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    fetch('/api/crypto/coins').then((r) => r.json()).then((d) => setCoins(d.coins ?? [])).catch(() => setCoins([]));
  }, []);

  const hasEnoughBalance = balance >= total;

  async function handleEsimCashPay() {
    setError('');
    
    if (!acceptedTerms) {
      setError(t('checkout_agree_error'));
      return;
    }

    // If guest, redirect to login
    if (!user) {
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
      }
      return;
    }

    if (!hasEnoughBalance) return;

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError(t('pay_invalid_email' as any) || 'Please enter a valid e-mail above.');
      return;
    }

    setLoading('ESIM_CASH');
    try {
      const res = await fetch('/api/crypto/checkout', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email, coin: 'ESIM_CASH', items }),
      });
      const data = await res.json();
      if (!res.ok || !data.ref) throw new Error(data.error ?? (t('pay_error' as any) || 'Could not start checkout.'));

      // Redirect immediately to order success details page
      window.location.href = `/order?ref=${data.ref}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('pay_error' as any) || 'Could not start checkout.'));
      setLoading(null);
    }
  }

  async function start(coin: string) {
    setError('');
    
    if (!acceptedTerms) {
      setError(t('checkout_agree_error'));
      return;
    }

    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError(t('pay_invalid_email' as any) || 'Please enter a valid e-mail above.');
      return;
    }
    setLoading(coin);
    try {
      const res = await fetch('/api/crypto/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, coin, items }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? (t('pay_error' as any) || 'Could not start checkout.'));
      window.location.href = `/checkout/crypto/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('pay_error' as any) || 'Could not start checkout.'));
      setLoading(null);
    }
  }

  return (
    <div className="space-y-4">
      {/* Terms and Conditions Checkbox */}
      <div className="rounded-xl border border-slate-200/50 bg-slate-50/50 p-3.5 flex items-start gap-3 shadow-sm">
        <input
          id="accept-terms-checkout"
          type="checkbox"
          checked={acceptedTerms}
          onChange={(e) => {
            setAcceptedTerms(e.target.checked);
            if (e.target.checked && error === t('checkout_agree_error')) {
              setError('');
            }
          }}
          className="mt-0.5 h-4.5 w-4.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
        />
        <label htmlFor="accept-terms-checkout" className="text-xs text-slate-500 cursor-pointer select-none leading-relaxed">
          {t('checkout_agree_prefix')}{' '}
          <Link href="/agb" target="_blank" className="font-semibold text-brand-600 hover:text-brand-800 underline">
            {t('checkout_agree_link')}
          </Link>
          {' '}{t('checkout_agree_suffix')}
        </label>
      </div>

      {/* eSIM Cash Payment Option */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 mb-2">eSIM Cash</p>
        <button
          type="button"
          disabled={loading !== null || (!!user && !hasEnoughBalance)}
          onClick={handleEsimCashPay}
          className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
            !user
              ? 'border-brand-200 bg-brand-50/50 hover:bg-brand-50 hover:border-brand-400'
              : hasEnoughBalance
              ? 'border-amber-200 bg-amber-50/50 hover:bg-amber-50 hover:border-amber-400'
              : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          }`}
        >
          <span className="text-2xl shrink-0">💰</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-slate-800">eSIM Cash</span>
            <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
              {!user
                ? (t('pay_login_to_pay' as any) || 'Log in to pay with eSIM Cash')
                : hasEnoughBalance
                ? (t('pay_with_bal' as any) || 'Pay with balance ({balance} € available)').replace('{balance}', balance.toFixed(2))
                : (t('pay_insufficient' as any) || 'Insufficient balance (Required: {total} €, Balance: {balance} €)')
                    .replace('{total}', total.toFixed(2))
                    .replace('{balance}', balance.toFixed(2))}
            </span>
          </span>
          {loading === 'ESIM_CASH' ? (
            <span className="text-xs text-brand-600 font-semibold">{t('pay_starting' as any) || 'Starting…'}</span>
          ) : (
            <span className="text-xs text-slate-400 font-semibold">→</span>
          )}
        </button>
      </div>

      {/* Crypto coins */}
      {coins.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{t('pay_crypto' as any) || 'Pay with crypto'}</p>
          <div className="grid grid-cols-2 gap-2">
            {coins.map((c) => {
              const fee = c.surchargePct > 0
                ? (t('pay_fee' as any) || '+{pct}% fee').replace('{pct}', String(c.surchargePct))
                : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : (t('pay_no_fee' as any) || 'no fee');
              return (
                <button
                  key={c.code}
                  onClick={() => start(c.code)}
                  disabled={loading !== null}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-brand-400 hover:bg-brand-50 disabled:opacity-50 transition-colors"
                >
                  <span className="text-lg">{COIN_ICON[c.code] ?? '🪙'}</span>
                  <span className="flex-1">
                    <span className="block text-sm font-semibold text-slate-800">{c.code}</span>
                    <span className={`block text-[10px] ${c.surchargePct > 0 || c.surchargeFixedEur > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {loading === c.code ? (t('pay_starting' as any) || 'Starting…') : fee}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
