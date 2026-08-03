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

function WalletIcon({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

export function CryptoPaySelector({ email, items, total, balance, user }: CryptoPaySelectorProps) {
  const { locale, t } = useTranslation();
  const [coins, setCoins]                 = useState<CoinOption[]>([]);
  const [loading, setLoading]             = useState<string | null>(null);
  const [error, setError]                 = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedNewsletter, setAcceptedNewsletter] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/crypto/coins')
      .then((r) => r.json())
      .then((d) => {
        const loadedCoins: CoinOption[] = d.coins ?? [];
        setCoins(loadedCoins);
        if (!selectedMethod) {
          if (user && balance >= total) {
            setSelectedMethod('ESIM_CASH');
          } else if (loadedCoins.length > 0) {
            const defaultCoin = loadedCoins.find((c) => c.code === 'LTC') || loadedCoins[0];
            setSelectedMethod(defaultCoin.code);
          } else {
            setSelectedMethod('LTC');
          }
        }
      })
      .catch(() => {
        setCoins([]);
        if (!selectedMethod) setSelectedMethod('LTC');
      });
  }, [user, balance, total]);

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
      setError('Bitte eine gültige E-Mail-Adresse für die eSIM-Zustellung eingeben.');
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
      if (!res.ok || !data.ref) throw new Error(data.error ?? 'Konnte Checkout nicht starten.');
      window.location.href = `/order?ref=${data.ref}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte Checkout nicht starten.');
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
      setError('Bitte eine gültige E-Mail-Adresse für die eSIM-Zustellung eingeben.');
      return;
    }
    setLoading(coin);
    try {
      const res = await fetch('/api/crypto/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, coin, items, newsletterConsent: acceptedNewsletter, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? 'Konnte Checkout nicht starten.');
      window.location.href = `/checkout/crypto/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konnte Checkout nicht starten.');
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
    <div className="space-y-4">
      {/* 1. Payment Method Selection Cards */}
      <div className="space-y-2">
        <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500">
          Zahlungsart wählen
        </label>

        {/* eSIM Cash Card */}
        <button
          type="button"
          onClick={() => {
            setSelectedMethod('ESIM_CASH');
            setError('');
          }}
          className={`w-full flex items-center gap-3 rounded-2xl border p-3 text-left transition-all cursor-pointer ${
            selectedMethod === 'ESIM_CASH'
              ? 'border-brand-500 bg-brand-50/50 ring-2 ring-brand-300 shadow-sm'
              : !user
              ? 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
              : hasEnoughBalance
              ? 'border-emerald-200 bg-emerald-50/40 hover:bg-emerald-50/70 hover:border-emerald-300'
              : 'border-slate-200 bg-slate-50 opacity-60'
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shrink-0 shadow-sm">
            <WalletIcon className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold text-slate-900">eSIM Cash Guthaben</span>
              {user && (
                <span className={`text-xs font-extrabold ${hasEnoughBalance ? 'text-emerald-700' : 'text-amber-600'}`}>
                  {balance.toFixed(2)} €
                </span>
              )}
            </div>
            <span className="block text-[10px] text-slate-500 mt-0.5 truncate">
              {!user
                ? 'Anmelden, um mit Guthaben zu bezahlen'
                : hasEnoughBalance
                ? 'Sofortige Abbuchung ohne Gebühren'
                : `Unzureichend (${balance.toFixed(2)} € / Benötigt: ${total.toFixed(2)} €)`}
            </span>
          </div>
          {selectedMethod === 'ESIM_CASH' && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white text-[10px] font-bold">✓</span>
          )}
        </button>

        {/* Crypto Coins Card & Grid */}
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
              <span>🪙</span>
              <span>Krypto-Zahlung</span>
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Instant & Diskret</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {visibleCoins.map((c) => {
              const isSelected = selectedMethod === c.code;
              const feeText = c.surchargePct > 0
                ? `+${c.surchargePct}%`
                : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : '0% Gebühr';
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(c.code);
                    setError('');
                  }}
                  disabled={loading !== null}
                  className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50/70 ring-2 ring-brand-400 shadow-sm font-bold'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  <img
                    src={COIN_ICON[c.code] ?? '🪙'}
                    alt={c.code}
                    className="h-5 w-5 rounded-full object-contain shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="block text-[11px] font-extrabold text-slate-800 leading-tight">{c.code}</span>
                    <span className={`block text-[9px] font-semibold truncate ${c.surchargePct > 0 || c.surchargeFixedEur > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {feeText}
                    </span>
                  </div>
                  {isSelected && <span className="text-brand-600 text-xs font-bold shrink-0">✓</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Legal & Newsletter Consent Checkboxes */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 text-xs">
        <div className="flex items-start gap-2.5">
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
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
          />
          <label htmlFor="accept-terms-checkout" className="text-[11px] text-slate-600 cursor-pointer select-none leading-normal">
            {t('checkout_agree_prefix')}{' '}
            <Link href="/agb" target="_blank" className="font-bold text-brand-600 hover:text-brand-800 underline">
              {t('checkout_agree_link')}
            </Link>
            {' '}{t('checkout_agree_suffix')}
          </label>
        </div>

        <div className="flex items-start gap-2.5 pt-2 border-t border-slate-200/60">
          <input
            id="accept-newsletter"
            type="checkbox"
            checked={acceptedNewsletter}
            onChange={(e) => setAcceptedNewsletter(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
          />
          <label htmlFor="accept-newsletter" className="text-[11px] text-slate-600 cursor-pointer select-none leading-normal">
            Exklusive Angebote, Rabatte & eSIM-News per E-Mail erhalten.
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs font-semibold text-red-600">
          {error}
        </p>
      )}

      {/* 3. PINNED STICKY DRAWER FOOTER WITH UNMISSABLE "JETZT BEZAHLEN" CTA */}
      <div className="sticky -bottom-5 -mx-5 -mb-5 border-t-2 border-slate-200/80 bg-white/95 backdrop-blur-md p-5 shadow-[0_-10px_25px_-5px_rgba(0,0,0,0.1)] space-y-3 z-30">
        <div className="flex items-baseline justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gesamtsumme</span>
            {fee > 0 && <span className="text-[10px] text-amber-600 font-semibold block">Inkl. {fee.toFixed(2)} € Gebühr</span>}
          </div>
          <div className="text-right">
            <span className="text-2xl font-black text-slate-900 tracking-tight">{finalTotal.toFixed(2)} €</span>
          </div>
        </div>

        <button
          type="button"
          disabled={loading !== null}
          onClick={() => {
            if (selectedMethod === 'ESIM_CASH') {
              handleEsimCashPay();
            } else if (selectedMethod) {
              start(selectedMethod);
            } else {
              setError('Bitte wähle eine Zahlungsart.');
            }
          }}
          className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-brand-600 via-brand-700 to-indigo-600 px-6 py-4 text-center text-base font-black text-white shadow-xl shadow-brand-500/30 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Wird weitergeleitet…</span>
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <ShieldCheckIcon className="h-5 w-5 shrink-0 text-white/95" />
              <span>Jetzt Bezahlen ({finalTotal.toFixed(2)} €)</span>
            </span>
          )}
        </button>

        <p className="text-center text-[10px] text-slate-400 font-medium">
          🔒 256-Bit SSL Verschlüsselung · Sofortige QR-Zustellung
        </p>
      </div>
    </div>
  );
}
