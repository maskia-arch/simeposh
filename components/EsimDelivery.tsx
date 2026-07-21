'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';
import { formatGb } from '@/lib/utils';

export interface DeliveredEsim {
  id:             string;
  countryName:    string;
  flag:           string | null;
  dataGb:         number | null;
  validityDays:   number;
  iccid:          string | null;
  apn:            string | null;
  shortUrl?:      string | null;
  smdpAddress:    string | null;
  activationCode: string | null;
  qrCodeUrl:      string | null;
  esimStatus?:    string | null;
  overviewUrl?:   string | null;
}

/** Build the LPA activation string a phone scans to install the eSIM. */
function lpaString(e: DeliveredEsim): string | null {
  if (e.smdpAddress && e.activationCode) {
    return `LPA:1$${e.smdpAddress}$${e.activationCode}`;
  }
  return null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2 transition-colors hover:bg-slate-100/70 min-w-0 w-full">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        <p className="truncate font-mono text-xs text-slate-800 font-medium">{value}</p>
      </div>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
        }}
        className="shrink-0 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-brand-600 transition-all active:scale-95 cursor-pointer"
      >
        {copied ? '✓ Kopiert' : t('esim_copy')}
      </button>
    </div>
  );
}

export function EsimDelivery({ esim }: { esim: DeliveredEsim }) {
  const { t } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const content = lpaString(esim);

  useEffect(() => {
    if (!content) { setQr(null); return; }
    QRCode.toDataURL(content, { width: 512, margin: 2, errorCorrectionLevel: 'M' })
      .then(setQr)
      .catch(() => setQr(null));
  }, [content]);

  function downloadPng() {
    if (!qr) return;
    const a = document.createElement('a');
    a.href = qr;
    a.download = `esim-${esim.iccid ?? 'install'}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  const formattedVolume = formatGb(esim.dataGb, t('card_unlimited'));

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm transition-all min-w-0 w-full overflow-hidden">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl filter drop-shadow-sm select-none shrink-0">{esim.flag ?? '🌐'}</span>
          <div className="min-w-0">
            <h3 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{esim.countryName}</h3>
            <div className="mt-0.5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-md bg-brand-50 border border-brand-200/60 px-2 py-0.5 text-xs font-bold text-brand-700">
                {formattedVolume}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {esim.validityDays} {t('cfg_days')}
              </span>
            </div>
          </div>
        </div>

        {esim.esimStatus === 'in_use' || esim.esimStatus === 'active' ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            ● {t('life_in_use')}
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700 shrink-0" title="180 Tage Aktivierungsfrist ab Kauf">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            {t('life_new')} (180 Tage Aktivierungsfrist)
          </div>
        )}
      </div>

      {/* Main Responsive Grid: Prominent QR Code + Action Details */}
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] items-start min-w-0">
        {/* Center QR Code Display */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-4 shadow-sm text-center w-full max-w-[280px] mx-auto md:max-w-none">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
            📱 QR-Code Scannen
          </p>
          
          <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-inner inline-block">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="eSIM Installation QR Code"
                width={180}
                height={180}
                className="rounded-xl mx-auto"
              />
            ) : (
              <div className="flex h-[180px] w-[180px] items-center justify-center rounded-xl border border-dashed border-slate-300 text-xs font-medium text-slate-400">
                Generiere QR-Code...
              </div>
            )}
          </div>

          <button
            onClick={downloadPng}
            disabled={!qr}
            className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 px-3 py-2.5 text-xs font-bold text-white shadow-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            QR-Code als PNG
          </button>
        </div>

        {/* Action Details & Installation Page Link */}
        <div className="space-y-3.5 min-w-0 w-full">
          {/* Prominent eSIM Overview Page Banner */}
          {esim.overviewUrl && (
            <div className="rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 p-4 text-white shadow-md space-y-3 min-w-0 w-full">
              <div className="flex flex-wrap items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <span className="inline-block rounded-md bg-white/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-white">
                    📱 Interaktive Einrichungsseite
                  </span>
                  <h4 className="mt-1 text-sm font-bold text-white truncate">Deine persönliche eSIM Installationsseite</h4>
                </div>
                <a
                  href={esim.overviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white text-brand-700 hover:bg-slate-100 px-3.5 py-2 text-xs font-extrabold shadow-sm transition-all active:scale-95 cursor-pointer shrink-0"
                >
                  Öffnen ↗
                </a>
              </div>
              
              <div className="rounded-xl bg-black/20 border border-white/20 p-2.5 flex items-center justify-between gap-2 min-w-0 w-full">
                <p className="truncate min-w-0 flex-1 font-mono text-[11px] text-white/90">{esim.overviewUrl}</p>
                <button
                  onClick={async () => {
                    try { await navigator.clipboard.writeText(esim.overviewUrl!); } catch { /* ignore */ }
                  }}
                  className="shrink-0 rounded-lg bg-white/20 hover:bg-white/30 px-2.5 py-1 text-xs font-bold text-white transition-colors cursor-pointer"
                >
                  Kopieren
                </button>
              </div>
            </div>
          )}

          {/* ICCID Field */}
          {esim.iccid && <CopyField label="ICCID (Seriennummer)" value={esim.iccid} />}

          {/* Manual Installation Accordion */}
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 transition-all min-w-0 w-full">
            <summary className="flex cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 hover:text-brand-600 transition-colors">
              <span className="flex items-center gap-2 truncate">
                <svg className="h-4 w-4 text-slate-400 group-open:text-brand-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                {t('esim_manual')} (Falls QR-Code nicht scannbar)
              </span>
              <svg className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="space-y-2 px-4 pb-4 pt-1 border-t border-slate-200/60 min-w-0">
              {esim.smdpAddress && <CopyField label={t('esim_smdp')} value={esim.smdpAddress} />}
              {esim.activationCode && <CopyField label={t('esim_code')} value={esim.activationCode} />}
              <CopyField label="APN (Zugangspunkt)" value={esim.apn || 'internet'} />
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
