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
  paymentMemo: string | null;
  receivedAmount?: number;
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
  cancel_btn:   { en: 'Cancel Payment', de: 'Zahlung abbrechen' },
  confirm_cancel: { en: 'Are you sure you want to cancel this checkout? Your cart will be preserved.', de: 'Möchtest du diesen Checkout wirklich abbrechen? Dein Warenkorb bleibt erhalten.' },
  i_paid_btn:   { en: 'I have paid', de: 'Ich habe bezahlt' },
  checking_payment: { en: 'Checking payment…', de: 'Zahlung wird geprüft…' },
  no_payment_yet: { en: 'No transaction detected yet. Please ensure you sent the exact amount.', de: 'Noch keine Transaktion erkannt. Bitte stelle sicher, dass du den genauen Betrag gesendet hast.' },
  memo:         { en: 'Payment Comment / Memo', de: 'Zahlungskommentar / Verwendungszweck' },
  memo_warn:    {
    en: 'IMPORTANT: You MUST include the exact comment above in your transaction, or your payment cannot be detected!',
    de: 'WICHTIG: Sie MÜSSEN den obigen Kommentar exakt in Ihrer Transaktion angeben, da die Zahlung sonst nicht erkannt wird!'
  },
  exact_memo_warn: { en: 'A unique comment is required to match your payment.', de: 'Ein eindeutiger Kommentar ist erforderlich, um deine Zahlung zuzuordnen.' },
  fee_warning: {
    en: 'IMPORTANT: Make sure you send enough to cover any transaction or transfer fees. Network fees must be fully covered by the sender.',
    de: 'WICHTIG: Stelle sicher, dass du genug sendest, um eventuelle Netzwerk- oder Transfergebühren zu decken. Die Transaktionsgebühren müssen vollständig vom Sender getragen werden.'
  },
  underpayment: {
    en: 'Partial payment detected: We received {received} {coin}, but {expected} {coin} is required. Please send the remaining {remaining} {coin} to complete the order.',
    de: 'Teilzahlung erkannt: Wir haben {received} {coin} empfangen, es sind jedoch {expected} {coin} erforderlich. Bitte sende die verbleibenden {remaining} {coin}, um die Bestellung abzuschließen.'
  },
  confirming_status: { en: 'Confirming', de: 'Bestätigung läuft' },
  detected_title:    { en: '📥 Payment detected!', de: '📥 Zahlung erkannt!' },
  detected_desc:     {
    en: 'We successfully detected your transaction on the Litecoin network. We are now waiting for the required confirmation on the blockchain.',
    de: 'Wir haben deine Transaktion im Litecoin-Netzwerk erfolgreich erkannt. Wir warten nun auf die erforderliche Bestätigung auf der Blockchain.'
  },
  detected_hint:     {
    en: 'You can leave this page open or close it – your order will be processed automatically as soon as the confirmation is complete.',
    de: 'Du kannst diese Seite geöffnet lassen oder schließen – deine Bestellung wird automatisch verarbeitet, sobald die Bestätigung abgeschlossen ist.'
  }
};

interface CoinTheme {
  primary: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  badgeBg: string;
  logo: string;
}

const COIN_THEMES: Record<string, CoinTheme> = {
  BTC: {
    primary: '#F7931A',
    bgLight: 'bg-amber-50/35',
    borderLight: 'border-amber-200/60',
    textDark: 'text-amber-900',
    badgeBg: 'bg-amber-100 text-amber-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  },
  LTC: {
    primary: '#345D9D',
    bgLight: 'bg-slate-50/50',
    borderLight: 'border-slate-200/60',
    textDark: 'text-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800',
    logo: 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png',
  },
  ETH: {
    primary: '#627EEA',
    bgLight: 'bg-indigo-50/35',
    borderLight: 'border-indigo-200/60',
    textDark: 'text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  },
  SOL: {
    primary: '#14F195',
    bgLight: 'bg-teal-50/35',
    borderLight: 'border-teal-200/60',
    textDark: 'text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-800',
    logo: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  },
  USDT: {
    primary: '#26A17B',
    bgLight: 'bg-emerald-50/35',
    borderLight: 'border-emerald-200/60',
    textDark: 'text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    logo: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  },
  USDC: {
    primary: '#2775CA',
    bgLight: 'bg-sky-50/35',
    borderLight: 'border-sky-200/60',
    textDark: 'text-sky-900',
    badgeBg: 'bg-sky-100 text-sky-800',
    logo: 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  },
  TON: {
    primary: '#0088CC',
    bgLight: 'bg-cyan-50/35',
    borderLight: 'border-cyan-200/60',
    textDark: 'text-cyan-955',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    logo: 'https://coin-images.coingecko.com/coins/images/17980/large/photo_2024-09-10_17.09.00.jpeg',
  },
  TRX: {
    primary: '#FF000F',
    bgLight: 'bg-rose-50/35',
    borderLight: 'border-rose-200/60',
    textDark: 'text-rose-900',
    badgeBg: 'bg-rose-100 text-rose-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png',
  },
};

const DEFAULT_THEME: CoinTheme = {
  primary: '#4F46E5',
  bgLight: 'bg-slate-50/50',
  borderLight: 'border-slate-200/50',
  textDark: 'text-slate-800',
  badgeBg: 'bg-slate-100 text-slate-800',
  logo: '',
};

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function Copyable({ value, label, s, theme }: { value: string; label: string; s: (k: keyof typeof STR) => string; theme: CoinTheme }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${theme.bgLight} ${theme.borderLight}`}>
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

  const [cancelling, setCancelling] = useState(false);
  const [verifying, setVerifying]   = useState(false);
  const [verifyMsg, setVerifyMsg]   = useState('');
  const [verifyMsgType, setVerifyMsgType] = useState<'success' | 'error' | ''>('');

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

  const handleCancel = async () => {
    if (!confirm(s('confirm_cancel'))) return;
    setCancelling(true);
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        window.location.href = '/cart';
      } else {
        alert('Fehler beim Abbrechen.');
        setCancelling(false);
      }
    } catch {
      alert('Fehler beim Abbrechen.');
      setCancelling(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg('');
    setVerifyMsgType('');
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'POST' });
      const data = await res.json() as SessionState;
      if (res.ok && data) {
        setSess(data);
        if (data.status === 'paid' || data.status === 'detected') {
          setVerifyMsgType('success');
          if (data.status === 'paid') {
            if (pollRef.current) clearInterval(pollRef.current);
            window.location.href = data.ref ? `/order?ref=${data.ref}` : '/dashboard';
          }
        } else {
          setVerifyMsgType('error');
          setVerifyMsg(s('no_payment_yet'));
        }
      } else {
        setVerifyMsgType('error');
        setVerifyMsg(s('no_payment_yet'));
      }
    } catch {
      setVerifyMsgType('error');
      setVerifyMsg(s('no_payment_yet'));
    } finally {
      setVerifying(false);
    }
  };

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

  const theme = COIN_THEMES[sess.coin] || DEFAULT_THEME;

  const expectedNum = Number(sess.cryptoAmount);
  const receivedNum = sess.receivedAmount || 0;
  const decimalLimit = sess.coin === 'TON' ? 9 : (['SOL', 'USDT', 'USDC', 'TRX'].includes(sess.coin) ? 6 : 8);
  const remainingNum = Math.max(0, Number((expectedNum - receivedNum).toFixed(decimalLimit)));
  const receivedStr = receivedNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  const remainingStr = remainingNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');

  const feeNote = sess.surchargePct > 0
    ? s('fee_hint').replace('{pct}', String(sess.surchargePct))
    : sess.surchargeFixedEur > 0
      ? s('fee_fixed').replace('{eur}', sess.surchargeFixedEur.toFixed(2))
      : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className={`rounded-3xl border bg-white p-6 shadow-sm border-slate-200`}>
        {/* Header + countdown */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {theme.logo && (
              <img src={theme.logo} alt={sess.coin} className="h-6 w-6 object-contain" />
            )}
            <h1 className="text-base font-bold text-slate-900">{s('title')} {sess.coinName}</h1>
          </div>
          {status === 'detected' ? (
            <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold animate-pulse">
              ⏳ {s('confirming_status')}
            </span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${remaining < 120_000 ? 'bg-red-100 text-red-700 animate-pulse' : theme.badgeBg}`}>
              ⏱ {fmtTime(remaining)}
            </span>
          )}
        </div>

        {feeNote && status !== 'detected' && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
            ⚠ {feeNote}
          </p>
        )}

        {/* QR */}
        {status !== 'detected' && (
          <div className="mb-4 flex flex-col items-center">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Payment QR" width={200} height={200} className="rounded-xl border border-slate-200" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-300">QR</div>
            )}
            <a href={sess.paymentUri} style={{ color: theme.primary }} className="mt-3 text-xs font-bold hover:opacity-80 transition-opacity">{s('open_wallet')} →</a>
          </div>
        )}

        {status !== 'detected' && (
          <>
            <p className="mb-3 text-center text-sm text-slate-600">
              <strong>{s('send_exact')}</strong> {s('to_address')}:
            </p>

            {/* Amount + address + optional memo */}
            <div className="space-y-2">
              <Copyable label={`${s('amount')} (${sess.coin})`} value={sess.cryptoAmount} s={s} theme={theme} />
              <Copyable label={s('address')} value={sess.walletAddress} s={s} theme={theme} />
              {sess.paymentMemo && (
                <Copyable label={s('memo')} value={sess.paymentMemo} s={s} theme={theme} />
              )}
            </div>

            {sess.paymentMemo && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-red-50/50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-700 leading-relaxed animate-pulse">
                  ⚠ {s('memo_warn')}
                </div>
                <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-3.5 py-2.5 text-xs font-semibold text-amber-800 leading-relaxed">
                  ⚠ {s('fee_warning')}
                </div>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-slate-400">
              ≈ {sess.amountEur.toFixed(2)} € · {sess.paymentMemo ? s('exact_memo_warn') : s('exact_warn')}
            </p>
          </>
        )}

        {status === 'detected' && (
          <div className="mb-6 rounded-2xl bg-blue-50/60 border border-blue-100 p-4 text-xs text-blue-800 leading-relaxed shadow-sm">
            <p className="font-bold mb-1 text-sm">{s('detected_title')}</p>
            <p>{s('detected_desc')}</p>
            <p className="mt-2 text-slate-500">{s('detected_hint')}</p>
          </div>
        )}

        {/* Live status */}
        <div className={`mt-5 rounded-xl border px-4 py-3 text-center ${theme.bgLight} ${theme.borderLight}`}>
          {status === 'detected' ? (
            <p className={`flex items-center justify-center gap-2 text-sm font-bold ${theme.textDark}`}>
              <Spinner color={theme.primary} /> {s('detected')} ({sess.confirmations}/{sess.confirmationsRequired})
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <Spinner color={theme.primary} /> {s('waiting')}
            </p>
          )}
        </div>

        {receivedNum > 0 && remainingNum > 0 && status !== 'paid' && status !== 'detected' && (
          <div className="mt-4 rounded-xl bg-red-50 border border-red-200 p-3.5 text-xs font-semibold text-red-700 leading-relaxed shadow-sm">
            ⚠ {s('underpayment')
                .replace('{received}', receivedStr)
                .replace('{expected}', sess.cryptoAmount)
                .replace('{remaining}', remainingStr)
                .replaceAll('{coin}', sess.coin)}
          </div>
        )}

        {/* Action Buttons */}
        {status !== 'detected' && (
          <div className="mt-6 space-y-2">
            <button
              onClick={handleVerify}
              disabled={verifying || cancelling}
              style={{ backgroundColor: theme.primary }}
              className="flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white hover:opacity-90 active:scale-[0.99] disabled:opacity-60 transition-all shadow-md"
            >
              {verifying ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
                  </svg>
                  {s('checking_payment')}
                </>
              ) : (
                s('i_paid_btn')
              )}
            </button>

            <button
              onClick={handleCancel}
              disabled={verifying || cancelling}
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:opacity-50 transition-colors"
            >
              {cancelling ? '...' : s('cancel_btn')}
            </button>
          </div>
        )}

        {/* Verification Messages */}
        {verifyMsg && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-xs font-medium ${verifyMsgType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {verifyMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ color }: { color?: string }) {
  return (
    <svg className="h-4 w-4 animate-spin" style={{ color: color || '#4F46E5' }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
    </svg>
  );
}
