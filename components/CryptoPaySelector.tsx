'use client';

import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';

interface CoinOption {
  code: string; name: string; surchargePct: number; surchargeFixedEur: number; confirmations: number;
}
export interface CryptoItem { tariffId: string; quantity: number; days?: number; topUpIccid?: string }

const COIN_ICON: Record<string, string> = { BTC: '₿', LTC: 'Ł', ETH: 'Ξ', SOL: '◎' };

const STR: Record<string, Record<string, string>> = {
  pay_crypto:  { en: 'Pay with crypto', de: 'Mit Krypto bezahlen' },
  fee:         { en: '+{pct}% fee', de: '+{pct}% Gebühr' },
  no_fee:      { en: 'no fee', de: 'keine Gebühr' },
  invalid:     { en: 'Please enter a valid e-mail above.', de: 'Bitte oben eine gültige E-Mail eingeben.' },
  starting:    { en: 'Starting…', de: 'Wird gestartet…' },
  error:       { en: 'Could not start crypto checkout.', de: 'Krypto-Checkout konnte nicht gestartet werden.' },
};

export function CryptoPaySelector({ email, items }: { email: string; items: CryptoItem[] }) {
  const { locale } = useTranslation();
  const s = (k: keyof typeof STR) => (STR[k][locale] ?? STR[k].en);
  const [coins, setCoins]     = useState<CoinOption[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch('/api/crypto/coins').then((r) => r.json()).then((d) => setCoins(d.coins ?? [])).catch(() => setCoins([]));
  }, []);

  async function start(coin: string) {
    setError('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { setError(s('invalid')); return; }
    setLoading(coin);
    try {
      const res = await fetch('/api/crypto/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, coin, items }),
      });
      const data = await res.json();
      if (!res.ok || !data.sessionId) throw new Error(data.error ?? s('error'));
      window.location.href = `/checkout/crypto/${data.sessionId}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : s('error'));
      setLoading(null);
    }
  }

  if (coins.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{s('pay_crypto')}</p>
      <div className="grid grid-cols-2 gap-2">
        {coins.map((c) => {
          const fee = c.surchargePct > 0
            ? s('fee').replace('{pct}', String(c.surchargePct))
            : c.surchargeFixedEur > 0 ? `+${c.surchargeFixedEur.toFixed(2)} €` : s('no_fee');
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
                  {loading === c.code ? s('starting') : fee}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
