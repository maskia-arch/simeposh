'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface CoinOption {
  code: string; name: string; surchargePct: number; surchargeFixedEur: number; confirmations: number; minOrderEur?: number;
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

// Vector Wallet Icon
function WalletIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

// Vector Key/Terms Icon
function ShieldCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function CryptoPaySelector({ email, items, total, balance, user }: CryptoPaySelectorProps) {
  const { locale, t } = useTranslation();
  const [coins, setCoins]     = useState<CoinOption[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedNewsletter, setAcceptedNewsletter] = useState(false);
  const [cryptoOpen, setCryptoOpen]       = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

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
         body: JSON.stringify({ email, coin: 'ESIM_CASH', items, newsletterConsent: acceptedNewsletter, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ref) throw new Error(data.error ?? (t('pay_error' as any) || 'Could not start checkout.'));
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
        body: JSON.stringify({ email, coin, items, newsletterConsent: acceptedNewsletter, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? (t('pay_error' as any) || 'Could not start checkout.'));
      window.location.href = `/checkout/crypto/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : (t('pay_error' as any) || 'Could not start checkout.'));
      setLoading(null);
    }
  }

  const visibleCoins = coins.filter((c) => total >= (c.minOrderEur || 0));
  const selectedCoin = visibleCoins.find((c) => c.code === selectedMethod);
  let fee = 0;
  if (selectedCoin) {
    if (selectedCoin.surchargePct > 0) {
      fee = total * (selectedCoin.surchargePct / 100);
    } else if (selectedCoin.surchargeFixedEur > 0) {
      fee = selectedCoin.surchargeFixedEur;
    }
  }
  const finalTotal = total + fee;

  return (
    <div className="space-y-2.5">
      {/* eSIM Cash Payment Option */}
      <div>
        <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">eSIM Cash</p>
        <button
          type="button"
          disabled={loading !== null || (!!user && !hasEnoughBalance)}
          onClick={() => {
            setSelectedMethod('ESIM_CASH');
            setError('');
          }}
          className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all ${
            selectedMethod === 'ESIM_CASH'
              ? 'border-brand-500 ring-2 ring-brand-100 bg-brand-50/5'
              : !user
              ? 'border-brand-100 bg-brand-50/20 hover:bg-brand-50/30 hover:border-brand-300'
              : hasEnoughBalance
              ? 'border-amber-200 bg-amber-50/20 hover:bg-amber-50/30 hover:border-amber-300'
              : 'border-slate-200 bg-slate-50 opacity-60 cursor-not-allowed'
          }`}
        >
          <WalletIcon className="h-5 w-5 text-brand-600 shrink-0" />
          <span className="flex-1 min-w-0">
            <span className="block text-xs font-bold text-slate-800">eSIM Cash</span>
            <span className="block text-[10px] text-slate-500 mt-0.5 truncate">
              {!user
                ? (t('pay_login_to_pay' as any) || 'Log in to pay with eSIM Cash')
                : hasEnoughBalance
                ? (t('pay_with_bal' as any) || 'Pay with balance ({balance} € available)').replace('{balance}', balance.toFixed(2))
                : (t('pay_insufficient' as any) || 'Insufficient balance (Required: {total} €, Balance: {balance} €)')
                    .replace('{total}', total.toFixed(2))
                    .replace('{balance}', balance.toFixed(2))}
            </span>
          </span>
          {selectedMethod === 'ESIM_CASH' && (
            <span className="text-brand-600 text-xs font-bold">✓</span>
          )}
        </button>
      </div>

      {/* Pay with Crypto Accordion */}
      {visibleCoins.length > 0 && (
        <div className="space-y-1">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Krypto-Zahlung</p>
          <button
            type="button"
            onClick={() => setCryptoOpen(!cryptoOpen)}
            className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition-all border-slate-200 bg-white hover:bg-slate-50 hover:border-brand-300`}
          >
            <div className="flex -space-x-1.5 shrink-0">
              {visibleCoins.slice(0, 4).map((c) => (
                <img
                  key={c.code}
                  src={COIN_ICON[c.code] ?? '🪙'}
                  alt={c.code}
                  className="h-5 w-5 rounded-full border border-white bg-white object-contain shadow-sm ring-1 ring-slate-100"
                />
              ))}
            </div>
            <span className="flex-1 min-w-0">
              <span className="block text-xs font-bold text-slate-800">
                {t('pay_crypto' as any) || 'Pay with crypto'}
              </span>
              <span className="block text-[10px] text-slate-550 mt-0.5 truncate">
                {visibleCoins.map((c) => c.code).join(', ')}
              </span>
            </span>
            <span className="text-slate-455 transition-transform duration-200 shrink-0">
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
            <div className="grid grid-cols-2 gap-1.5 mt-1 rounded-xl border border-slate-100 bg-slate-50/50 p-1.5 shadow-inner">
              {visibleCoins.map((c) => {
                const isSelected = selectedMethod === c.code;
                const feeText = c.surchargePct > 0
                  ? `+${c.surchargePct}%`
                  : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : (t('pay_no_fee' as any) || '0% fee');
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(c.code);
                      setError('');
                    }}
                    disabled={loading !== null}
                    className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-brand-500 ring-2 ring-brand-100 bg-brand-50/10'
                        : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-55 animate-fadeIn'
                    }`}
                  >
                    <img
                      src={COIN_ICON[c.code] ?? '🪙'}
                      alt={c.code}
                      className="h-5 w-5 rounded-full object-contain"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[11px] font-bold text-slate-800">{c.code}</span>
                      <span className={`block text-[9px] font-semibold truncate ${c.surchargePct > 0 || c.surchargeFixedEur > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                        {feeText}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Checkout Confirmation Section (Appears when a payment method is selected) */}
      {selectedMethod && (
        <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm animate-fadeIn">
          {/* Summary Details */}
          <div className="text-xs space-y-1">
            <div className="flex items-center justify-between text-slate-550">
              <span>Methode:</span>
              <span className="font-bold text-slate-800 flex items-center gap-1">
                {selectedMethod === 'ESIM_CASH' ? (
                  <>
                    <WalletIcon className="h-4 w-4 text-brand-600" />
                    eSIM Cash
                  </>
                ) : (
                  <>
                    <img src={COIN_ICON[selectedMethod]} className="h-4 w-4 object-contain" alt="" />
                    {selectedMethod}
                  </>
                )}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-550">
              <span>Zwischensumme:</span>
              <span className="font-semibold text-slate-800">{total.toFixed(2)} €</span>
            </div>
            {fee > 0 && (
              <div className="flex items-center justify-between text-amber-700">
                <span>Zahlungsgebühr:</span>
                <span className="font-semibold">+{fee.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 border-t border-slate-100 pt-1.5 mt-1">
              <span>Gesamtsumme:</span>
              <span className="text-sm font-extrabold text-brand-700">{finalTotal.toFixed(2)} €</span>
            </div>
          </div>

          {/* Terms and Conditions Checkbox */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            <div className="flex items-start gap-2">
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
                className="mt-0.5 h-4 w-4 rounded border-slate-350 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
              />
              <label htmlFor="accept-terms-checkout" className="text-[9px] text-slate-500 cursor-pointer select-none leading-normal">
                {t('checkout_agree_prefix')}{' '}
                <Link href="/agb" target="_blank" className="font-semibold text-brand-600 hover:text-brand-800 underline">
                  {t('checkout_agree_link')}
                </Link>
                {' '}{t('checkout_agree_suffix')}
              </label>
            </div>

            {/* Newsletter Subscription Consent Checkbox */}
            <div className="flex items-start gap-2">
              <input
                id="accept-newsletter"
                type="checkbox"
                checked={acceptedNewsletter}
                onChange={(e) => setAcceptedNewsletter(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-slate-350 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
              />
              <label htmlFor="accept-newsletter" className="text-[9px] text-slate-500 cursor-pointer select-none leading-normal">
                Ich möchte per E-Mail Neuigkeiten, Angebote und Rabatte erhalten.
              </label>
            </div>
          </div>

          {/* Pay Button */}
          <button
            type="button"
            disabled={loading !== null}
            onClick={() => {
              if (selectedMethod === 'ESIM_CASH') {
                handleEsimCashPay();
              } else {
                start(selectedMethod);
              }
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-center text-xs font-bold text-white shadow hover:bg-brand-700 active:bg-brand-800 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Bitte warten...
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <ShieldCheckIcon className="h-4 w-4 shrink-0 text-white/95" />
                Jetzt Bezahlen ({finalTotal.toFixed(2)} €)
              </span>
            )}
          </button>
        </div>
      )}

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
