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

function WalletIcon({ className = 'h-4 w-4' }: { className?: string }) {
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
  const [activeTab, setActiveTab]        = useState<'crypto' | 'cash'>('crypto');

  useEffect(() => {
    fetch('/api/crypto/coins')
      .then((r) => r.json())
      .then((d) => {
        const loadedCoins: CoinOption[] = d.coins ?? [];
        setCoins(loadedCoins);
        if (!selectedMethod) {
          if (user && balance >= total) {
            setActiveTab('cash');
            setSelectedMethod('ESIM_CASH');
          } else if (loadedCoins.length > 0) {
            setActiveTab('crypto');
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
    <div className="space-y-3">
      {/* 1. Sleek Compact Segmented Payment Tab Switch */}
      <div className="space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
          Zahlungsart
        </label>
        
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => {
              setActiveTab('crypto');
              if (visibleCoins.length > 0) {
                const defaultCoin = visibleCoins.find((c) => c.code === 'LTC') || visibleCoins[0];
                setSelectedMethod(defaultCoin.code);
              }
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'crypto'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>🪙 Krypto</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('cash');
              setSelectedMethod('ESIM_CASH');
              setError('');
            }}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'cash'
                ? 'bg-white text-brand-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <WalletIcon className="h-3.5 w-3.5 text-brand-600" />
            <span>eSIM Cash</span>
          </button>
        </div>

        {/* Tab Content: Crypto Coins Pills */}
        {activeTab === 'crypto' && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {visibleCoins.map((c) => {
              const isSelected = selectedMethod === c.code;
              return (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    setSelectedMethod(c.code);
                    setError('');
                  }}
                  className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold transition-all cursor-pointer ${
                    isSelected
                      ? 'border-brand-600 bg-brand-50 text-brand-800 ring-1 ring-brand-300'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <img src={COIN_ICON[c.code] ?? '🪙'} alt={c.code} className="h-3.5 w-3.5 object-contain" />
                  <span>{c.code}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Tab Content: eSIM Cash Info */}
        {activeTab === 'cash' && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2 text-xs">
            <div className="flex items-center justify-between text-slate-800 font-bold">
              <span>Dein Guthaben:</span>
              <span className={hasEnoughBalance ? 'text-emerald-700 font-extrabold' : 'text-amber-600'}>
                {user ? `${balance.toFixed(2)} €` : 'Nicht eingeloggt'}
              </span>
            </div>
            {!user && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                Bitte logge dich ein, um dein eSIM Cash Guthaben zu nutzen.
              </p>
            )}
          </div>
        )}
      </div>

      {/* 2. Ultra-Compact Legal Checkboxes */}
      <div className="space-y-1 text-[10px] text-slate-500 pt-0.5">
        <div className="flex items-center gap-2">
          <input
            id="accept-terms-checkout"
            type="checkbox"
            checked={acceptedTerms}
            onChange={(e) => {
              setAcceptedTerms(e.target.checked);
              if (e.target.checked && error === t('checkout_agree_error')) setError('');
            }}
            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer accent-brand-600 shrink-0"
          />
          <label htmlFor="accept-terms-checkout" className="cursor-pointer select-none">
            {t('checkout_agree_prefix')}{' '}
            <Link href="/agb" target="_blank" className="font-bold text-brand-600 hover:underline">
              {t('checkout_agree_link')}
            </Link>
            {' '}{t('checkout_agree_suffix')}
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 border border-red-200 px-2.5 py-1 text-[11px] font-semibold text-red-600">
          {error}
        </p>
      )}

      {/* 3. Balanced, Perfectly Proportioned Sticky Drawer Footer */}
      <div className="sticky -bottom-4 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-md space-y-2 z-20">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gesamtsumme</span>
          <div className="text-right">
            <span className="text-xl font-extrabold text-slate-900 tabular-nums">{finalTotal.toFixed(2)} €</span>
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
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] py-3 text-center text-xs font-extrabold text-white shadow-md disabled:opacity-50 transition-all cursor-pointer"
        >
          {loading ? (
            <span className="flex items-center gap-1.5">
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Weiterleitung…</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 shrink-0" />
              <span>Jetzt Bezahlen ({finalTotal.toFixed(2)} €)</span>
            </span>
          )}
        </button>

        <p className="text-center text-[9px] text-slate-400 font-medium">
          🔒 256-Bit SSL · Sofortige QR-Zustellung
        </p>
      </div>
    </div>
  );
}
