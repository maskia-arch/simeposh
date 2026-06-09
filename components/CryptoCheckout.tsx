'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';

interface SessionState {
  id: string; coin: string; coinName: string; status: string;
  walletAddress: string; cryptoAmount: string; paymentUri: string;
  amountEur: number; baseEur: number; surchargePct: number; surchargeFixedEur: number;
  confirmations: number; confirmationsRequired: number; txHash: string | null;
  remainingMs: number; ref: string | null;
}

const STR: Record<string, Record<string, string>> = {
  title:        { en: 'Pay with', de: 'Bezahlen mit' },
  send_exact:   { en: 'Send EXACTLY this amount', de: 'Sende GENAU diesen Betrag' },
  to_address:   { en: 'to this address', de: 'an diese Adresse' },
  amount:       { en: 'Amount', de: 'Betrag' },
  address:      { en: 'Address', de: 'Adresse' },
  copy:         { en: 'Copy', de: 'Kopieren' },
  copied:       { en: 'Copied ✓', de: 'Kopiert ✓' },
  fee_hint:     { en: 'Incl. {pct}% network compensation fee', de: 'Inkl. {pct}% Netzwerk-Ausgleichsgebühr' },
  fee_fixed:    { en: 'Incl. {eur} € processing fee', de: 'Inkl. {eur} € Bearbeitungsgebühr' },
  expires_in:   { en: 'Expires in', de: 'Läuft ab in' },
  waiting:      { en: 'Waiting for payment…', de: 'Warte auf Zahlung…' },
  detected:     { en: 'Payment detected – confirming', de: 'Zahlung erkannt – Bestätigung' },
  paid:         { en: 'Payment successful!', de: 'Zahlung erfolgreich!' },
  paid_sub:     { en: 'Your eSIMs are being delivered…', de: 'Deine eSIMs werden ausgeliefert…' },
  expired:      { en: 'This payment window has expired.', de: 'Dieses Zahlungsfenster ist abgelaufen.' },
  expired_sub:  { en: 'Please start a new checkout.', de: 'Bitte starte einen neuen Checkout.' },
  exact_warn:   { en: 'The amount must match to the last digit — it is your payment ID.', de: 'Der Betrag muss bis zur letzten Stelle stimmen — er ist deine Zahlungs-ID.' },
  open_wallet:  { en: 'Open in wallet', de: 'In Wallet öffnen' },
  new_checkout: { en: 'New checkout', de: 'Neuer Checkout' },
};

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function Copyable({ value, label, s }: { value: string; label: string; s: (k: keyof typeof STR) => string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-mono text-sm text-slate-800">{value}</p>
      </div>
      <button
        onClick={async () => { try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* */ } }}
        className="shrink-0 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
      >
        {copied ? s('copied') : s('copy')}
      </button>
    </div>
  );
}

export function CryptoCheckout({ sessionId }: { sessionId: string }) {
  const { locale } = useTranslation();
  const s = (k: keyof typeof STR) => (STR[k][locale] ?? STR[k].en);

  const [sess, setSess]   = useState<SessionState | null>(null);
  const [qr, setQr]       = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as SessionState;
      setSess(data);
      setRemaining(data.remainingMs);
      if (data.status === 'paid') {
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => { window.location.href = data.ref ? `/order?ref=${data.ref}` : '/dashboard'; }, 1500);
      }
      if (data.status === 'expired') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch { /* keep polling */ }
  }, [sessionId]);

  useEffect(() => {
    poll();
    pollRef.current = setInterval(poll, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [poll]);

  // Local 1s countdown tick
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // QR from the payment URI
  useEffect(() => {
    if (!sess?.paymentUri) return;
    QRCode.toDataURL(sess.paymentUri, { width: 512, margin: 2 }).then(setQr).catch(() => setQr(null));
  }, [sess?.paymentUri]);

  if (!sess) {
    return <div className="mx-auto max-w-md px-4 py-20 text-center text-slate-400">…</div>;
  }

  const status = remaining <= 0 && sess.status === 'pending' ? 'expired' : sess.status;

  // ── Terminal states ──
  if (status === 'paid') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">✅</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('paid')}</h1>
        <p className="text-slate-500">{s('paid_sub')}</p>
      </div>
    );
  }
  if (status === 'expired' || status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">⌛</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('expired')}</h1>
        <p className="mb-6 text-slate-500">{s('expired_sub')}</p>
        <a href="/cart" className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors">{s('new_checkout')}</a>
      </div>
    );
  }

  const feeNote = sess.surchargePct > 0
    ? s('fee_hint').replace('{pct}', String(sess.surchargePct))
    : sess.surchargeFixedEur > 0
      ? s('fee_fixed').replace('{eur}', sess.surchargeFixedEur.toFixed(2))
      : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        {/* Header + countdown */}
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-lg font-bold text-slate-900">{s('title')} {sess.coinName}</h1>
          <span className={`rounded-full px-3 py-1 text-sm font-bold tabular-nums ${remaining < 120_000 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
            ⏱ {fmtTime(remaining)}
          </span>
        </div>

        {feeNote && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
            ⚠ {feeNote}
          </p>
        )}

        {/* QR */}
        <div className="mb-4 flex flex-col items-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="Payment QR" width={200} height={200} className="rounded-xl border border-slate-200" />
          ) : (
            <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-300">QR</div>
          )}
          <a href={sess.paymentUri} className="mt-3 text-xs font-medium text-brand-600 hover:text-brand-800">{s('open_wallet')} →</a>
        </div>

        <p className="mb-3 text-center text-sm text-slate-600">
          <strong>{s('send_exact')}</strong> {s('to_address')}:
        </p>

        {/* Amount + address */}
        <div className="space-y-2">
          <Copyable label={`${s('amount')} (${sess.coin})`} value={sess.cryptoAmount} s={s} />
          <Copyable label={s('address')} value={sess.walletAddress} s={s} />
        </div>

        <p className="mt-3 text-center text-[11px] text-slate-400">≈ {sess.amountEur.toFixed(2)} € · {s('exact_warn')}</p>

        {/* Live status */}
        <div className="mt-5 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 text-center">
          {status === 'detected' ? (
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-amber-700">
              <Spinner /> {s('detected')} ({sess.confirmations}/{sess.confirmationsRequired})
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm font-medium text-slate-600">
              <Spinner /> {s('waiting')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
