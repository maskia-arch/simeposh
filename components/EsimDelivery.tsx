'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';

export interface DeliveredEsim {
  id:             string;
  countryName:    string;
  flag:           string | null;
  dataGb:         number | null;
  validityDays:   number;
  iccid:          string | null;
  shortUrl:       string | null;
  smdpAddress:    string | null;
  activationCode: string | null;
  qrCodeUrl:      string | null;
  esimStatus?:    string | null;
}

/** Build the LPA activation string a phone scans to install the eSIM. */
function lpaString(e: DeliveredEsim): string | null {
  if (e.smdpAddress && e.activationCode) {
    return `LPA:1$${e.smdpAddress}$${e.activationCode}`;
  }
  return e.shortUrl ?? null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate font-mono text-xs text-slate-700">{value}</p>
      </div>
      <button
        onClick={async () => {
          try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1200); } catch { /* ignore */ }
        }}
        className="shrink-0 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:bg-white"
      >
        {copied ? '✓' : t('esim_copy')}
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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="text-2xl">{esim.flag ?? '🌐'}</span>
        <div className="flex-1">
          <p className="font-bold text-slate-800">{esim.countryName}</p>
          <p className="text-xs text-slate-500">
            {esim.dataGb != null ? `${esim.dataGb} GB` : t('card_unlimited')} · {esim.validityDays} {t('cfg_days')}
          </p>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr] sm:items-start">
        {/* QR + download */}
        <div className="flex flex-col items-center">
          {qr ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qr} alt="eSIM Install QR" width={160} height={160} className="rounded-xl border border-slate-200" />
          ) : (
            <div className="flex h-[160px] w-[160px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-300">QR</div>
          )}
          <button
            onClick={downloadPng}
            disabled={!qr}
            className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {t('esim_download_qr')}
          </button>
        </div>

        {/* Details */}
        <div className="space-y-2">
          {esim.shortUrl && (
            <div className="rounded-lg bg-brand-50 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-500">{t('esim_install_link')}</p>
              <a href={esim.shortUrl} target="_blank" rel="noopener noreferrer" className="break-all text-sm font-medium text-brand-700 underline">
                {esim.shortUrl}
              </a>
            </div>
          )}
          {esim.iccid && <CopyField label="ICCID" value={esim.iccid} />}

          <details className="rounded-lg border border-slate-100">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-500">{t('esim_manual')}</summary>
            <div className="space-y-2 px-3 pb-3">
              {esim.smdpAddress && <CopyField label={t('esim_smdp')} value={esim.smdpAddress} />}
              {esim.activationCode && <CopyField label={t('esim_code')} value={esim.activationCode} />}
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}
