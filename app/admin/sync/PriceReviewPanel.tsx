'use client';

import { useState, useEffect } from 'react';
import { formatEur } from '@/lib/utils';

interface Proposal {
  id:            string;
  sync_id:       string;
  package_code:  string;
  old_price_eur: number;
  new_price_eur: number;
  change_pct:    number;
  status:        string;
  label:         string | null;
  created_at:    string;
  tariffs:       { name: string; country_name: string; flag_emoji: string | null; tariff_type: string } | null;
}

interface Decision {
  id:     string;
  action: 'approve' | 'reject';
  label?: string;
}

export function PriceReviewPanel({ onRefresh }: { onRefresh?: () => void }) {
  const [proposals,  setProposals]  = useState<Proposal[]>([]);
  const [decisions,  setDecisions]  = useState<Record<string, Decision>>({});
  const [globalLabel, setGlobalLabel] = useState('');
  const [showLabelFor, setShowLabelFor] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [saved,      setSaved]      = useState(false);

  useEffect(() => { loadProposals(); }, []);

  async function loadProposals() {
    setLoading(true);
    try {
      const res  = await fetch('/api/admin/sync/review-prices');
      const data = await res.json();
      setProposals(data.proposals ?? []);
    } finally {
      setLoading(false);
    }
  }

  function decide(id: string, action: 'approve' | 'reject', label?: string) {
    setDecisions((prev) => ({ ...prev, [id]: { id, action, label } }));
  }

  function approveAll() {
    const next: Record<string, Decision> = {};
    proposals.forEach((p) => {
      next[p.id] = { id: p.id, action: 'approve', label: globalLabel || undefined };
    });
    setDecisions(next);
  }

  function rejectAll() {
    const next: Record<string, Decision> = {};
    proposals.forEach((p) => { next[p.id] = { id: p.id, action: 'reject' }; });
    setDecisions(next);
  }

  async function submitDecisions() {
    const toSend = Object.values(decisions);
    if (toSend.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/admin/sync/review-prices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ decisions: toSend }),
      });
      setSaved(true);
      setDecisions({});
      await loadProposals();
      onRefresh?.();
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const bigChanges = proposals.filter((p) => Math.abs(p.change_pct) >= 10);
  const pending    = Object.keys(decisions).length;

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
        Preisänderungen werden geladen…
      </div>
    );
  }

  if (proposals.length === 0) {
    return (
      <div className="rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-700">
        ✅ Keine ausstehenden Preisänderungen.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-semibold text-amber-800">
              ⚠️ {proposals.length} Preisänderung{proposals.length !== 1 ? 'en' : ''} ausstehend
            </p>
            <p className="text-sm text-amber-700 mt-0.5">
              Diese Preise wurden beim letzten Sync ermittelt, aber noch nicht übernommen.
              Prüfe und bestätige die Änderungen unten.
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={rejectAll}
              className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50">
              Alle ablehnen
            </button>
            <button onClick={approveAll}
              className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700">
              Alle bestätigen
            </button>
          </div>
        </div>

        {/* Large-change alert */}
        {bigChanges.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-white p-3">
            <p className="text-xs font-semibold text-amber-800 mb-2">
              🔔 {bigChanges.length} Tarife haben Änderungen ≥ 10% – möchtest du diese mit einem Promo-Label markieren?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder='z.B. "Summer Deal", "Sale", "Aktionspreis"'
                value={globalLabel}
                onChange={(e) => setGlobalLabel(e.target.value)}
                className="flex-1 rounded-lg border border-amber-300 px-3 py-1.5 text-xs outline-none focus:border-amber-500"
              />
              <button
                onClick={() => {
                  bigChanges.forEach((p) =>
                    decide(p.id, decisions[p.id]?.action ?? 'approve', globalLabel || undefined)
                  );
                }}
                className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-600"
              >
                Label anwenden
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Proposals table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Tarif</th>
              <th className="px-4 py-3 text-right">Alter Preis</th>
              <th className="px-4 py-3 text-right">Neuer Preis</th>
              <th className="px-4 py-3 text-right">Änderung</th>
              <th className="px-4 py-3 text-center">Label</th>
              <th className="px-4 py-3 text-center">Aktion</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {proposals.map((p) => {
              const d   = decisions[p.id];
              const isIncrease = p.change_pct > 0;
              const isBig      = Math.abs(p.change_pct) >= 10;
              return (
                <tr key={p.id} className={`
                  hover:bg-slate-50
                  ${d?.action === 'approve' ? 'bg-green-50' : ''}
                  ${d?.action === 'reject'  ? 'bg-red-50 opacity-60' : ''}
                `}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">
                      {p.tariffs?.flag_emoji ?? '🌐'} {p.tariffs?.country_name ?? p.package_code}
                    </p>
                    <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.tariffs?.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">{formatEur(p.old_price_eur)}</td>
                  <td className="px-4 py-3 text-right font-semibold">{formatEur(p.new_price_eur)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-medium ${isIncrease ? 'text-red-600' : 'text-green-600'}`}>
                      {isIncrease ? '▲' : '▼'} {Math.abs(p.change_pct).toFixed(1)}%
                    </span>
                    {isBig && <span className="ml-1 text-amber-500">⚡</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {showLabelFor === p.id ? (
                      <input
                        type="text"
                        autoFocus
                        placeholder="Label…"
                        defaultValue={d?.label ?? ''}
                        onBlur={(e) => {
                          decide(p.id, d?.action ?? 'approve', e.target.value || undefined);
                          setShowLabelFor(null);
                        }}
                        className="w-28 rounded-lg border border-brand-300 px-2 py-1 text-xs outline-none"
                      />
                    ) : (
                      <button
                        onClick={() => setShowLabelFor(p.id)}
                        className="text-xs text-brand-600 hover:text-brand-800 underline-offset-2 hover:underline"
                      >
                        {d?.label ?? '+ Label'}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => decide(p.id, 'approve', d?.label)}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          d?.action === 'approve'
                            ? 'bg-green-600 text-white'
                            : 'border border-green-300 text-green-700 hover:bg-green-50'
                        }`}
                      >✓ OK</button>
                      <button
                        onClick={() => decide(p.id, 'reject')}
                        className={`rounded-lg px-3 py-1 text-xs font-medium transition-colors ${
                          d?.action === 'reject'
                            ? 'bg-red-500 text-white'
                            : 'border border-red-200 text-red-600 hover:bg-red-50'
                        }`}
                      >✗ Nein</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Submit bar */}
      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          {pending} von {proposals.length} Entscheidungen getroffen
        </p>
        <div className="flex items-center gap-3">
          {saved && <span className="text-sm text-green-600 font-medium">✅ Gespeichert</span>}
          <button
            onClick={submitDecisions}
            disabled={saving || pending === 0}
            className="rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Wird gespeichert…' : `${pending} Entscheidung${pending !== 1 ? 'en' : ''} übernehmen`}
          </button>
        </div>
      </div>
    </div>
  );
}
