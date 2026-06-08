'use client';

import { useState } from 'react';
import { PriceReviewPanel } from './PriceReviewPanel';

interface SyncResult {
  success:      boolean;
  upserted?:    number;
  errors?:      number;
  total?:       number;
  usdEurRate?:  number;
  priceChanges?: number;
  duration_ms?: number;
  error?:       string;
}

export default function SyncPage() {
  const [status,   setStatus]   = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [result,   setResult]   = useState<SyncResult | null>(null);
  const [log,      setLog]      = useState<string[]>([]);
  const [refresh,  setRefresh]  = useState(0);

  function addLog(msg: string) {
    setLog((prev) => [...prev, `[${new Date().toLocaleTimeString('de-DE')}] ${msg}`]);
  }

  async function handleSync() {
    setStatus('running');
    setResult(null);
    setLog([]);
    addLog('Starte Produkt-Sync (Travel + Unlimited Eco + Unlimited Pro)…');
    try {
      addLog('Verbinde mit esimaccess API /api/v1/open/package/list…');
      const res  = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json() as SyncResult;
      if (!res.ok || !data.success) {
        addLog(`❌ Fehler: ${data.error ?? 'Unbekannter Fehler'}`);
        setResult(data);
        setStatus('error');
        return;
      }
      addLog(`✅ Sync abgeschlossen in ${((data.duration_ms ?? 0) / 1000).toFixed(1)}s`);
      addLog(`📦 Pakete verarbeitet: ${data.total}`);
      addLog(`💾 Upserted: ${data.upserted}  |  Fehler: ${data.errors}`);
      addLog(`💱 USD/EUR Rate: ${data.usdEurRate}`);
      if ((data.priceChanges ?? 0) > 0) {
        addLog(`⚠️  ${data.priceChanges} Preisänderungen warten auf deine Bestätigung ↓`);
      } else {
        addLog('✅ Keine Preisänderungen – alle Preise aktuell.');
      }
      setResult(data);
      setStatus('done');
      setRefresh((n) => n + 1);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Netzwerkfehler: ${msg}`);
      setStatus('error');
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Produkt-Sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lädt Travel-, Unlimited-Eco- und Unlimited-Pro-Tarife von esimaccess und synchronisiert die Datenbank.
          Preisänderungen müssen separat bestätigt werden.
        </p>
      </div>

      {/* Info */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '✈️',  title: 'Travel',         desc: 'Festes Datenvolumen, weltweit' },
          { icon: '♾️',  title: 'Unlimited Eco',  desc: 'Unbegrenzt, FUP ≤ 512 kbps' },
          { icon: '⚡',  title: 'Unlimited Pro',  desc: 'Unbegrenzt, FUP ≥ 1 Mbps' },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-3xl mb-2">{c.icon}</p>
            <p className="font-semibold text-slate-800">{c.title}</p>
            <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Trigger */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-800">Sync starten</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Preis­änderungen werden in der Review-Sektion unten zur Bestätigung vorgelegt.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={status === 'running'}
            className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {status === 'running' ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z"/>
                </svg>
                Synchronisiert…
              </span>
            ) : '🔄 Jetzt synchronisieren'}
          </button>
        </div>

        {/* Live log */}
        {log.length > 0 && (
          <div className="mt-5 rounded-xl bg-slate-900 p-4 font-mono text-xs space-y-1 max-h-48 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i} className={
                line.includes('❌') ? 'text-red-400' :
                line.includes('✅') ? 'text-green-400' :
                line.includes('⚠️') ? 'text-amber-400' : 'text-slate-300'
              }>{line}</div>
            ))}
            {status === 'running' && <div className="text-brand-400 animate-pulse">▋</div>}
          </div>
        )}
      </div>

      {/* Result */}
      {result && status === 'done' && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-6">
          <h2 className="mb-4 font-semibold text-green-800">✅ Sync abgeschlossen</h2>
          <div className="grid gap-3 sm:grid-cols-5 text-center">
            {[
              { label: 'Gesamt',          value: result.total       ?? 0 },
              { label: 'Upserted',        value: result.upserted    ?? 0 },
              { label: 'Fehler',          value: result.errors      ?? 0 },
              { label: 'USD/EUR',         value: result.usdEurRate?.toFixed(4) ?? '–' },
              { label: 'Preis­änderungen', value: result.priceChanges ?? 0 },
            ].map((s) => (
              <div key={s.label} className="rounded-xl bg-white p-3 border border-green-100">
                <p className="text-2xl font-bold text-green-700">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {result && status === 'error' && (
        <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-6">
          <h2 className="mb-2 font-semibold text-red-800">❌ Sync fehlgeschlagen</h2>
          <p className="text-sm text-red-700">{result.error}</p>
        </div>
      )}

      {/* Price review */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">📊 Preisänderungen prüfen</h2>
        <PriceReviewPanel key={refresh} onRefresh={() => setRefresh((n) => n + 1)} />
      </div>
    </div>
  );
}
