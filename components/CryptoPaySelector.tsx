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
  USDC: 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  USDT: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  TRX: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png',
  TON: 'https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png',
};

const COIN_NETWORK_LABEL: Record<string, string> = {
  BTC: 'BTC Native',
  LTC: 'LTC Native',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDC: 'ETH (ERC-20)',
  USDT: 'ETH (ERC-20)',
  TRX: 'TRON (TRC-20)',
  TON: 'TON (Memo Required)',
};

export interface CryptoItem { tariffId: string; quantity: number; days?: number; topUpIccid?: string }

interface CryptoPaySelectorProps {
  email: string;
  items: CryptoItem[];
  total: number;
  balance: number;
  user: any;
}

function BitcoinIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.638 14.904c-1.602 6.43-8.113 10.34-14.542 8.736C2.67 22.038-1.24 15.527.362 9.1 1.962 2.67 8.472-1.24 14.902.362c6.43 1.602 10.34 8.112 8.736 14.542zM15.4 10.222c.28-.936-.572-1.439-1.547-1.774l.317-1.27-1.028-.257-.308 1.237c-.27-.067-.547-.132-.824-.197l.31-1.245-1.028-.256-.317 1.272c-.224-.05-.443-.102-.656-.154l.002-.007-1.417-.354-.274 1.1s.762.175.746.186c.416.104.492.38.479.599l-.48 1.926c.029.007.066.018.107.034l-.11-.027-.673 2.697c-.051.127-.182.317-.477.244.01.015-.747-.187-.747-.187l-.51 1.176 1.338.334c.249.062.493.127.734.189l-.32 1.285 1.028.256.317-1.273c.28.076.553.148.82.217l-.315 1.264 1.028.257.32-1.282c1.755.332 3.075.198 3.63-1.39.448-1.278-.022-2.016-.946-2.497.673-.155 1.18-.598 1.316-1.512zm-2.355 3.3c-.319 1.282-2.476.589-3.173.415l.566-2.27c.698.174 2.932.52 2.607 1.855zm.319-3.32c-.29 1.166-2.087.574-2.668.429l.513-2.057c.581.145 2.45.416 2.155 1.628z" fill="#F7931A"/>
    </svg>
  );
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
    const effectiveEmail = (user?.email || email || '').trim();
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
    if (!effectiveEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(effectiveEmail)) {
      setError(t('pay_invalid_email'));
      return;
    }

    setLoading('ESIM_CASH');
    try {
      const res = await fetch('/api/crypto/checkout', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ email: effectiveEmail, coin: 'ESIM_CASH', items, newsletterConsent: acceptedNewsletter, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.ref) throw new Error(data.error ?? t('pay_error'));
      window.location.href = `/order?ref=${data.ref}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pay_error'));
      setLoading(null);
    }
  }

  async function start(coin: string) {
    setError('');
    const effectiveEmail = (user?.email || email || '').trim();
    if (!acceptedTerms) {
      setError(t('checkout_agree_error'));
      return;
    }
    if (!effectiveEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(effectiveEmail)) {
      setError(t('pay_invalid_email'));
      return;
    }
    setLoading(coin);
    try {
      const res = await fetch('/api/crypto/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: effectiveEmail, coin, items, newsletterConsent: acceptedNewsletter, locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? t('pay_error'));
      window.location.href = `/checkout/crypto/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('pay_error'));
      setLoading(null);
    }
  }

  const visibleCoins = coins.filter((c) => total >= (c.minOrderEur || 0));
  const hiddenCoinsCount = coins.length - visibleCoins.length;
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
            <BitcoinIcon className="h-4 w-4 shrink-0" />
            <span>Krypto</span>
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

        {/* Tab Content: Crypto Coins Pills with Explicit Fee Badges & Network Labels */}
        {activeTab === 'crypto' && (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap gap-1.5">
              {visibleCoins.map((c) => {
                const isSelected = selectedMethod === c.code;
                const isErc20 = c.code === 'USDC' || c.code === 'USDT';
                const iconUrl = COIN_ICON[c.code] ?? 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png';
                const netLabel = COIN_NETWORK_LABEL[c.code] || c.code;
                const coinFee = c.surchargePct > 0
                  ? `+${c.surchargePct}%`
                  : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : '0%';
                
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setSelectedMethod(c.code);
                      setError('');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? isErc20
                          ? 'border-blue-600 bg-blue-50 text-blue-950 ring-1 ring-blue-400 shadow-xs'
                          : 'border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-400 shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <img src={iconUrl} alt={c.code} className="h-4 w-4 shrink-0 object-contain" />
                    <div className="flex flex-col items-start leading-none">
                      <span>{c.code}</span>
                      <span className={`text-[8px] font-extrabold ${isErc20 ? 'text-blue-600' : 'text-slate-400'}`}>
                        {netLabel}
                      </span>
                    </div>
                    <span className={`ml-0.5 text-[9px] px-1.5 py-0.5 rounded-md font-semibold ${c.surchargePct > 0 || c.surchargeFixedEur > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                      {coinFee}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedCoin && (selectedCoin.code === 'USDC' || selectedCoin.code === 'USDT') && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-900 flex items-start gap-2">
                <span className="text-sm shrink-0">🌐</span>
                <div>
                  <p className="font-extrabold text-[11px] text-blue-950">
                    {t('pay_eth_network_title')}
                  </p>
                  <p className="text-[10px] text-blue-800 leading-snug mt-0.5">
                    {selectedCoin.code} {t('pay_eth_network_desc')}
                  </p>
                </div>
              </div>
            )}

            {selectedCoin && selectedCoin.code === 'TON' && (
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-xs text-sky-900 flex items-start gap-2">
                <span className="text-sm shrink-0">💎</span>
                <div>
                  <p className="font-extrabold text-[11px] text-sky-950">
                    Netzwerk: TON (The Open Network)
                  </p>
                  <p className="text-[10px] text-sky-800 leading-snug mt-0.5">
                    Zahlung erfordert die Eingabe einer persönlichen <strong>Memo-ID / Verwendungszweck</strong> im TON-Netzwerk.
                  </p>
                </div>
              </div>
            )}

            {selectedCoin && selectedCoin.code === 'TRX' && (
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 px-3 py-2 text-xs text-rose-900 flex items-start gap-2">
                <span className="text-sm shrink-0">🔴</span>
                <div>
                  <p className="font-extrabold text-[11px] text-rose-950">
                    Netzwerk: TRON (TRC-20 Native)
                  </p>
                  <p className="text-[10px] text-rose-800 leading-snug mt-0.5">
                    Abwicklung direkt im TRON-Netzwerk an die angezeigte TRON-Adresse.
                  </p>
                </div>
              </div>
            )}

            {hiddenCoinsCount > 0 && (
              <p className="text-[9px] text-slate-400 font-medium pt-0.5">
                {t('pay_eth_min_notice')}
              </p>
            )}
          </div>
        )}

        {/* Tab Content: eSIM Cash Info */}
        {activeTab === 'cash' && (
          <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-2 text-xs">
            <div className="flex items-center justify-between text-slate-800 font-bold">
              <span>{t('pay_cash_balance_label')}</span>
              <span className={hasEnoughBalance ? 'text-emerald-700 font-extrabold' : 'text-amber-600'}>
                {user ? `${balance.toFixed(2)} €` : t('pay_not_logged_in')}
              </span>
            </div>
            {!user && (
              <p className="text-[10px] text-slate-500 mt-0.5">
                {t('pay_cash_login_hint')}
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

      {/* 3. Balanced Sticky Drawer Footer with Explicit Price & Fee Breakdown */}
      <div className="sticky -bottom-4 -mx-4 -mb-4 border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 py-3 shadow-md space-y-2 z-20">
        <div className="space-y-0.5">
          <div className="flex items-baseline justify-between text-xs text-slate-500">
            <span>{t('pay_subtotal')}</span>
            <span className="tabular-nums font-semibold">{total.toFixed(2)} €</span>
          </div>
          {fee > 0 ? (
            <div className="flex items-baseline justify-between text-xs text-amber-700 font-semibold">
              <span>{t('pay_fee_label')} ({selectedMethod})</span>
              <span className="tabular-nums">+{fee.toFixed(2)} €</span>
            </div>
          ) : (
            <div className="flex items-baseline justify-between text-[11px] text-emerald-600 font-semibold">
              <span>{t('pay_fee_label')}</span>
              <span>{t('pay_free')}</span>
            </div>
          )}
          <div className="flex items-baseline justify-between pt-1 border-t border-slate-100">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{t('checkout_total')}</span>
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
              setError(t('pay_select_method'));
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
              <span>{t('pay_redirecting')}</span>
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <ShieldCheckIcon className="h-4 w-4 shrink-0" />
              <span>{t('pay_now')} ({finalTotal.toFixed(2)} €)</span>
            </span>
          )}
        </button>

        <p className="text-center text-[9px] text-slate-400 font-medium">
          {t('pay_ssl_notice')}
        </p>
      </div>
    </div>
  );
}
