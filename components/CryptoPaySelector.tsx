'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface CoinOption {
  code: string; name: string; surchargePct: number; surchargeFixedEur: number; confirmations: number;
}
const COIN_ICON: Record<string, string> = {
  BTC: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  LTC: 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png',
  ETH: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  SOL: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  USDT: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  USDC: 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  TON: 'https://coin-images.coingecko.com/coins/images/17980/large/photo_2024-09-10_17.09.00.jpeg',
  TRX: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png',
};

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
  const [cryptoOpen, setCryptoOpen]       = useState(false);

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

      {/* Pay with Crypto Accordion */}
      {coins.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setCryptoOpen(!cryptoOpen)}
            className={`w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all border-slate-200 bg-white hover:bg-slate-50 hover:border-brand-400`}
          >
            <div className="flex -space-x-1.5 shrink-0">
              {coins.slice(0, 4).map((c) => (
                <img
                  key={c.code}
                  src={COIN_ICON[c.code] ?? '🪙'}
                  alt={c.code}
                  className="h-6 w-6 rounded-full border border-white bg-white object-contain shadow-sm ring-1 ring-slate-100"
                />
              ))}
              {coins.length > 4 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white bg-slate-100 text-[10px] font-bold text-slate-600 shadow-sm ring-1 ring-slate-100">
                  +{coins.length - 4}
                </div>
              )}
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-sm font-bold text-slate-800">
                {t('pay_crypto' as any) || 'Pay with crypto'}
              </span>
              <span className="block text-[11px] text-slate-500 mt-0.5 truncate">
                {coins.map((c) => c.code).join(', ')}
              </span>
            </span>
            <span className="text-slate-400 transition-transform duration-200 shrink-0">
              {cryptoOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
          </button>

          {/* Expanded Coin Selector List */}
          {cryptoOpen && (
            <div className="grid grid-cols-2 gap-2 mt-2 rounded-2xl border border-slate-100 bg-slate-50/50 p-2.5 shadow-inner">
              {coins.map((c) => {
                const fee = c.surchargePct > 0
                  ? (t('pay_fee' as any) || '+{pct}% fee').replace('{pct}', String(c.surchargePct))
                  : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : (t('pay_no_fee' as any) || 'no fee');
                return (
                  <button
                    key={c.code}
                    onClick={() => start(c.code)}
                    disabled={loading !== null}
                    className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left hover:border-brand-400 hover:bg-brand-50 hover:shadow-sm disabled:opacity-50 transition-all"
                  >
                    <img
                      src={COIN_ICON[c.code] ?? '🪙'}
                      alt={c.code}
                      className="h-7 w-7 rounded-full bg-slate-50 p-0.5 object-contain"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-800">{c.code}</span>
                      <span className={`block text-[10px] font-medium truncate ${c.surchargePct > 0 || c.surchargeFixedEur > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {loading === c.code ? (t('pay_starting' as any) || 'Starting…') : fee}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
