'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { PriceReviewPanel } from './PriceReviewPanel';

// ── Types ──────────────────────────────────────────────────────────────────────

interface StatusResponse {
  syncId:        string;
  status:        'running' | 'completed' | 'failed';
  pct:           number;
  elapsed_ms:    number;
  remaining_ms:  number;
  total:         number;
  upserted:      number;
  errors:        number;
  price_changes: number;
  usd_eur_rate:  number | null;
  duration_ms:   number | null;
  error_message: string | null;
  completed_at:  string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmtMs(ms: number): string {
  if (ms <= 0)          return '< 1s';
  if (ms < 60_000)      return `~${Math.ceil(ms / 1000)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.ceil((ms % 60_000) / 1000);
  return s > 0 ? `~${m}min ${s}s` : `~${m}min`;
}

function fmtDuration(ms: number): string {
  if (ms < 1000)   return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60_000).toFixed(1)}min`;
}

// ── Progress Bar component ─────────────────────────────────────────────────────

function ProgressBar({ pct, status }: { pct: number; status: StatusResponse['status'] }) {
  const color =
    status === 'failed'    ? 'bg-red-500' :
    status === 'completed' ? 'bg-green-500' :
    'bg-brand-500';

  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
      <div
        className={`h-full rounded-full transition-all duration-500 ${color} ${status === 'running' ? 'animate-none' : ''}`}
        style={{ width: `${Math.max(2, pct)}%` }}
      />
      {/* Shimmer effect while running */}
      {status === 'running' && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)',
            animation: 'shimmer 1.8s infinite',
            width: `${Math.max(2, pct)}%`,
          }}
        />
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function SyncPage() {
  const [syncState,  setSyncState]  = useState<'idle' | 'running' | 'completed' | 'failed'>('idle');
  const [status,     setStatus]     = useState<StatusResponse | null>(null);
  const [log,        setLog]        = useState<string[]>([]);
  const [syncId,     setSyncId]     = useState<string | null>(null);
  const [refresh,    setRefresh]    = useState(0);

  const pollRef   = useRef<ReturnType<typeof setInterval> | null>(null);
  const logEndRef = useRef<HTMLDivElement | null>(null);

  function addLog(msg: string) {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString('de-DE')}] ${msg}`]);
  }

  // Auto-scroll log
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log]);

  // Polling function
  const pollStatus = useCallback(async (id: string) => {
    try {
      const res  = await fetch(`/api/admin/sync/status?syncId=${encodeURIComponent(id)}`);
      if (!res.ok) return;
      const data = await res.json() as StatusResponse;
      setStatus(data);

      if (data.status === 'completed') {
        setSyncState('completed');
        stopPolling();
        addLog(`✅ Sync abgeschlossen in ${fmtDuration(data.duration_ms ?? 0)}`);
        addLog(`📦 ${data.total.toLocaleString('de-DE')} Pakete verarbeitet`);
        addLog(`💾 ${data.upserted.toLocaleString('de-DE')} Upserted · ${data.errors} Fehler`);
        addLog(`💱 USD/EUR: ${data.usd_eur_rate?.toFixed(4) ?? '–'}`);
        if ((data.price_changes ?? 0) > 0) {
          addLog(`⚠️  ${data.price_changes} Preisänderungen warten auf Bestätigung ↓`);
        } else {
          addLog('✅ Keine Preisänderungen');
        }
        setRefresh(n => n + 1);
      } else if (data.status === 'failed') {
        setSyncState('failed');
        stopPolling();
        addLog(`❌ Fehler: ${data.error_message ?? 'Unbekannt'}`);
      }
    } catch {
      // Network hiccup – keep polling
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  // Cleanup on unmount
  useEffect(() => () => stopPolling(), []);

  async function handleSync() {
    stopPolling();
    setSyncState('running');
    setStatus(null);
    setLog([]);
    addLog('Starte Produkt-Sync im Hintergrund…');
    addLog('Verbinde mit esimaccess API…');

    try {
      const res  = await fetch('/api/admin/sync', { method: 'POST' });
      const data = await res.json() as { syncId: string; status: string };

      if (!res.ok || !data.syncId) {
        addLog(`❌ Start fehlgeschlagen: ${JSON.stringify(data)}`);
        setSyncState('failed');
        return;
      }

      const id = data.syncId;
      setSyncId(id);
      addLog(`🚀 Sync gestartet (ID: ${id.slice(0, 16)}…)`);
      addLog('⏳ Lade alle Pakete von esimaccess (kann 1–3 Minuten dauern)…');

      // Start polling every 3 seconds
      pollRef.current = setInterval(() => pollStatus(id), 3_000);

    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`❌ Netzwerkfehler: ${msg}`);
      setSyncState('failed');
    }
  }

  const isRunning = syncState === 'running';
  const pct       = status?.pct ?? (isRunning ? 2 : 0);

  return (
    <div>
      {/* Shimmer keyframe */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Produkt-Sync</h1>
        <p className="mt-1 text-sm text-slate-500">
          Lädt Travel-, Unlimited-Eco- und Unlimited-Pro-Tarife von esimaccess und synchronisiert die Datenbank.
          Der Sync läuft vollständig im Hintergrund – du kannst die Seite geöffnet lassen oder weiterarbeiten.
        </p>
      </div>

      {/* Category cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {[
          { icon: '✈️',  title: 'Travel',        desc: 'Festes Datenvolumen, weltweit' },
          { icon: '♾️',  title: 'Unlimited Eco', desc: 'Unbegrenzt, FUP ≤ 512 kbps' },
          { icon: '⚡',  title: 'Unlimited Pro', desc: 'Unbegrenzt, FUP ≥ 1 Mbps' },
        ].map((c) => (
          <div key={c.title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-3xl mb-2">{c.icon}</p>
            <p className="font-semibold text-slate-800">{c.title}</p>
            <p className="text-xs text-slate-500 mt-1">{c.desc}</p>
          </div>
        ))}
      </div>

      {/* Sync trigger card */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-slate-800">Sync starten</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Läuft vollständig im Hintergrund. Preisänderungen werden zur Bestätigung vorgelegt.
            </p>
          </div>
          <button
            onClick={handleSync}
            disabled={isRunning}
            className="shrink-0 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isRunning ? (
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

        {/* Progress bar (shown while running or completed) */}
        {syncState !== 'idle' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {syncState === 'completed' ? '✅ Abgeschlossen' :
                 syncState === 'failed'    ? '❌ Fehlgeschlagen' :
                 pct < 20 ? '📡 Verbinde & lade Pakete…' :
                 pct < 95 ? `💾 Speichere Pakete… (${status?.upserted?.toLocaleString('de-DE') ?? '…'} / ${status?.total?.toLocaleString('de-DE') ?? '…'})` :
                 '🔄 Abschließend verarbeiten…'}
              </span>
              <span className="font-semibold text-slate-700 tabular-nums">{pct}%</span>
            </div>

            <ProgressBar pct={pct} status={
              syncState === 'completed' ? 'completed' :
              syncState === 'failed'    ? 'failed' : 'running'
            } />

            {/* ETA row */}
            {syncState === 'running' && status && status.remaining_ms > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-1.5">
                <span>⏱</span>
                <span>Noch ca. <strong className="text-slate-600">{fmtMs(status.remaining_ms)}</strong></span>
                <span className="text-slate-300">·</span>
                <span>Vergangen: {fmtMs(status.elapsed_ms)}</span>
              </p>
            )}

            {/* Stats while running */}
            {isRunning && status && status.total > 0 && (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {[
                  { label: 'Pakete geladen',  value: status.total.toLocaleString('de-DE') },
                  { label: 'Gespeichert',     value: status.upserted.toLocaleString('de-DE') },
                  { label: 'Fehler',          value: status.errors.toString() },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-slate-50 border border-slate-200 p-2 text-center">
                    <p className="text-sm font-bold text-slate-700 tabular-nums">{s.value}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Completed result */}
        {syncState === 'completed' && status && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
              {[
                { label: 'Gesamt',           value: status.total.toLocaleString('de-DE') },
                { label: 'Upserted',         value: status.upserted.toLocaleString('de-DE') },
                { label: 'Fehler',           value: status.errors.toString() },
                { label: 'USD/EUR',          value: status.usd_eur_rate?.toFixed(4) ?? '–' },
                { label: 'Preisänderungen',  value: status.price_changes.toString() },
              ].map(s => (
                <div key={s.label} className="rounded-xl bg-white border border-green-100 p-3">
                  <p className="text-xl font-bold text-green-700 tabular-nums">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
            {status.duration_ms && (
              <p className="mt-3 text-xs text-center text-green-700">
                Gesamtdauer: <strong>{fmtDuration(status.duration_ms)}</strong>
              </p>
            )}
          </div>
        )}

        {/* Failed result */}
        {syncState === 'failed' && status?.error_message && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="font-semibold text-red-800 mb-1">❌ Sync fehlgeschlagen</p>
            <p className="text-sm text-red-700 font-mono break-all">{status.error_message}</p>
          </div>
        )}

        {/* Live log */}
        {log.length > 0 && (
          <div className="rounded-xl bg-slate-900 p-4 font-mono text-xs space-y-1 max-h-40 overflow-y-auto">
            {log.map((line, i) => (
              <div key={i} className={
                line.includes('❌') ? 'text-red-400' :
                line.includes('✅') ? 'text-green-400' :
                line.includes('⚠️') ? 'text-amber-400' :
                line.includes('🚀') ? 'text-brand-400' :
                'text-slate-300'
              }>{line}</div>
            ))}
            {isRunning && <div className="text-brand-400 animate-pulse">▋</div>}
            <div ref={logEndRef} />
          </div>
        )}
      </div>

      {/* Price review section */}
      <div className="mt-8">
        <h2 className="mb-4 text-lg font-bold text-slate-900">📊 Preisänderungen prüfen</h2>
        <PriceReviewPanel key={refresh} onRefresh={() => setRefresh(n => n + 1)} />
      </div>
    </div>
  );
}
