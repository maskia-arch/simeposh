'use client';

import { useEffect, useState } from 'react';

interface Coin {
  code: string; name: string; enabled: boolean;
  surcharge_pct: number; surcharge_fixed_eur: number; confirmations: number;
  walletConfigured: boolean;
}

export function CryptoCoinsAdmin() {
  const [coins, setCoins]   = useState<Coin[]>([]);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/crypto-coins').then((r) => r.json()).then((d) => setCoins(d.coins ?? []));
  }, []);

  function update(code: string, patch: Partial<Coin>) {
    setCoins((prev) => prev.map((c) => (c.code === code ? { ...c, ...patch } : c)));
  }

  async function save(c: Coin) {
    setSaving(c.code);
    try {
      await fetch('/api/admin/crypto-coins', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: c.code, enabled: c.enabled,
          surcharge_pct: Number(c.surcharge_pct), surcharge_fixed_eur: Number(c.surcharge_fixed_eur),
          confirmations: Number(c.confirmations),
        }),
      });
    } finally { setSaving(null); }
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Coin</th>
            <th className="px-4 py-3 text-center">Wallet ENV</th>
            <th className="px-4 py-3 text-center">Aktiv</th>
            <th className="px-4 py-3 text-center">Surcharge %</th>
            <th className="px-4 py-3 text-center">Fix € </th>
            <th className="px-4 py-3 text-center">Confirmations</th>
            <th className="px-4 py-3 text-right"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {coins.map((c) => (
            <tr key={c.code} className={!c.walletConfigured ? 'opacity-60' : ''}>
              <td className="px-4 py-3 font-medium">{c.code} <span className="text-xs text-slate-400">{c.name}</span></td>
              <td className="px-4 py-3 text-center">
                {c.walletConfigured
                  ? <span className="text-green-600" title="WALLET_ ENV gesetzt">✓</span>
                  : <span className="text-red-500" title={`WALLET_${c.code} fehlt`}>✕</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <input type="checkbox" checked={c.enabled} onChange={(e) => update(c.code, { enabled: e.target.checked })} />
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" step="0.1" min="0" value={c.surcharge_pct}
                  onChange={(e) => update(c.code, { surcharge_pct: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right" />
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" step="0.01" min="0" value={c.surcharge_fixed_eur}
                  onChange={(e) => update(c.code, { surcharge_fixed_eur: Number(e.target.value) })}
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right" />
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" step="1" min="0" value={c.confirmations}
                  onChange={(e) => update(c.code, { confirmations: Number(e.target.value) })}
                  className="w-16 rounded-lg border border-slate-300 px-2 py-1 text-right" />
              </td>
              <td className="px-4 py-3 text-right">
                <button onClick={() => save(c)} disabled={saving === c.code}
                  className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                  {saving === c.code ? '…' : 'Speichern'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {coins.length === 0 && <p className="py-8 text-center text-sm text-slate-400">Keine Coins konfiguriert.</p>}
    </div>
  );
}
