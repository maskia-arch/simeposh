'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';
import { formatGb } from '@/lib/utils';
import { CountryFlag } from '@/components/CountryFlag';
import { isoName } from '@/lib/tariff-display';
import { getEsimQuickInstallLink, getRawLpaString, detectDeviceOs, type DeviceOs } from '@/lib/esim-install';
import { getGuideUrl } from '@/lib/guide-links';

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
    <div className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 border border-slate-200/90 px-3 py-2 transition-colors hover:bg-slate-100/70 min-w-0 w-full">
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="truncate font-mono text-xs text-slate-900 font-semibold">{value}</p>
      </div>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          } catch { /* ignore */ }
        }}
        className="shrink-0 min-h-[44px] min-w-[70px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-brand-600 transition-all active:scale-95 cursor-pointer"
        aria-label={`${label} ${t('esim_copy')}`}
      >
        {copied ? `✓ ${t('cash_copied')}` : t('esim_copy')}
      </button>
    </div>
  );
}

export function EsimDelivery({
  esim,
  index,
  totalCount,
}: {
  esim: DeliveredEsim;
  index?: number;
  totalCount?: number;
}) {
  const { t, locale } = useTranslation();
  const [qr, setQr] = useState<string | null>(null);
  const [deviceOs, setDeviceOs] = useState<DeviceOs>('desktop');
  const [copiedQuick, setCopiedQuick] = useState(false);
  const [copiedOverview, setCopiedOverview] = useState(false);
  const [guideTab, setGuideTab] = useState<'ios' | 'android'>('ios');

  const content = lpaString(esim);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  useEffect(() => {
    const os = detectDeviceOs();
    setDeviceOs(os);
    if (os === 'android') {
      setGuideTab('android');
    }
  }, []);

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
  const countryNameLocalized = (esim.flag && esim.flag.length === 2)
    ? isoName(esim.flag, locale)
    : esim.countryName;

  const topupUrl = esim.iccid ? `${prefix}/topup?iccid=${esim.iccid}` : `${prefix}/topup`;

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 shadow-xl shadow-slate-200/40 backdrop-blur-sm transition-all min-w-0 w-full overflow-hidden relative">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 min-w-0">
        <div className="flex items-center gap-3 min-w-0">
          <CountryFlag countryCode={esim.flag || esim.countryName} countryName={countryNameLocalized} size={36} className="rounded-lg shadow-sm shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight truncate">{countryNameLocalized}</h3>
              {index && totalCount && totalCount > 1 && (
                <span className="rounded-md bg-slate-900 text-white px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0 shadow-xs">
                  {t('esim_index_of', { index, totalCount })}
                </span>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center rounded-md bg-brand-50 border border-brand-200/60 px-2 py-0.5 text-xs font-bold text-brand-700">
                {formattedVolume}
              </span>
              <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                {esim.validityDays} {t('cfg_days')}
              </span>
            </div>
          </div>
        </div>

        {esim.esimStatus === 'in_use' || esim.esimStatus === 'active' ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 shrink-0">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('life_in_use')}</span>
          </div>
        ) : (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 border border-sky-200 px-3 py-1.5 text-xs font-bold text-sky-700 shrink-0">
            <span className="h-2 w-2 rounded-full bg-sky-500 animate-pulse" />
            <span>{t('status_ready_to_install')}</span>
          </div>
        )}
      </div>

      {/* Main Responsive Grid: Prominent QR Code + Action Details */}
      <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)] items-start min-w-0">
        {/* Center QR Code Display */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-white border border-slate-200 p-4 shadow-sm text-center w-full max-w-[280px] mx-auto md:max-w-none">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-600">
            {t('esim_qr_scan_title')}
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
                {t('cart_loading')}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={downloadPng}
            disabled={!qr}
            className="mt-3.5 w-full min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 active:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>{t('esim_download_qr')}</span>
          </button>
        </div>

        {/* Action Details & Primary Button */}
        <div className="space-y-4 min-w-0 w-full">
          {/* Primary Action Button: 1-Click Install in #2563eb */}
          {esim.smdpAddress && esim.activationCode ? (
            <a
              href={getEsimQuickInstallLink(esim.smdpAddress, esim.activationCode, deviceOs)}
              onClick={async (e) => {
                if (deviceOs === 'desktop') {
                  e.preventDefault();
                  const raw = getRawLpaString(esim.smdpAddress!, esim.activationCode!);
                  try {
                    await navigator.clipboard.writeText(raw);
                    setCopiedQuick(true);
                    setTimeout(() => setCopiedQuick(false), 2000);
                  } catch { /* ignore */ }
                }
              }}
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 py-3 px-5 text-center text-sm font-extrabold text-white shadow-md shadow-brand-600/20 transition-all cursor-pointer"
            >
              <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>{copiedQuick ? `✓ ${t('cash_copied')}` : t('btn_install_auto')}</span>
            </a>
          ) : esim.overviewUrl ? (
            <a
              href={esim.overviewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 active:bg-brand-800 py-3 px-5 text-center text-sm font-extrabold text-white shadow-md shadow-brand-600/20 transition-all cursor-pointer"
            >
              <span>{t('btn_install')}</span>
              <span aria-hidden="true">↗</span>
            </a>
          ) : null}

          {/* Interactive Installation Page Card (Secondary) */}
          {esim.overviewUrl && (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2 min-w-0 w-full">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                    {t('esim_interactive_page')}
                  </p>
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {t('esim_personal_page')}
                  </p>
                </div>
                <a
                  href={esim.overviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 min-h-[44px] inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-800 shadow-2xs transition-all cursor-pointer"
                >
                  <span>{t('esim_open')}</span>
                  <span aria-hidden="true">↗</span>
                </a>
              </div>
              <div className="rounded-xl bg-white border border-slate-200 px-3 py-2 flex items-center justify-between gap-2 min-w-0 w-full">
                <p className="truncate min-w-0 flex-1 font-mono text-[11px] text-slate-600">{esim.overviewUrl}</p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(esim.overviewUrl!);
                      setCopiedOverview(true);
                      setTimeout(() => setCopiedOverview(false), 1400);
                    } catch { /* ignore */ }
                  }}
                  className="shrink-0 min-h-[44px] min-w-[70px] inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 transition-colors cursor-pointer"
                  aria-label={t('cash_copy')}
                >
                  {copiedOverview ? `✓ ${t('cash_copied')}` : t('cash_copy')}
                </button>
              </div>
            </div>
          )}

          {/* ICCID Field */}
          {esim.iccid && <CopyField label="ICCID" value={esim.iccid} />}

          {/* Manual Installation Details */}
          <details className="group rounded-2xl border border-slate-200 bg-slate-50/50 transition-all min-w-0 w-full">
            <summary className="flex min-h-[44px] cursor-pointer items-center justify-between px-4 py-3 text-xs font-bold text-slate-700 hover:text-brand-600 transition-colors">
              <span className="flex items-center gap-2 truncate">
                <svg className="h-4 w-4 text-slate-400 group-open:text-brand-600 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                <span className="truncate">{t('esim_manual_hint')} ({t('esim_manual_sub')})</span>
              </span>
              <svg className="h-4 w-4 text-slate-400 group-open:rotate-180 transition-transform shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="space-y-2.5 px-4 pb-4 pt-1 border-t border-slate-200/60 min-w-0">
              {esim.smdpAddress && <CopyField label={t('esim_smdp')} value={esim.smdpAddress} />}
              {esim.activationCode && <CopyField label={t('esim_code')} value={esim.activationCode} />}
              <CopyField label={t('esim_apn_label')} value={esim.apn || 'isp'} />
            </div>
          </details>

          {/* Step-by-Step Instructions Tabs */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 min-w-0">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  guideTab === 'ios'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Apple iOS (iPhone)
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  guideTab === 'android'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Android
              </button>
            </div>

            <ol className="space-y-2 text-xs text-slate-700 leading-relaxed list-decimal list-inside pl-1">
              {guideTab === 'ios' ? (
                <>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_ios_step1')}</span></li>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_ios_step2')}</span></li>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_ios_step3')}</span></li>
                </>
              ) : (
                <>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_android_step1')}</span></li>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_android_step2')}</span></li>
                  <li className="font-medium"><span className="text-slate-900 font-semibold">{t('order_android_step3')}</span></li>
                </>
              )}
            </ol>

            {/* Roaming & APN Line */}
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-semibold text-slate-700">
                📶 {t('order_roaming_apn_line')}
              </span>
              <Link
                href={`${prefix}/faq`}
                className="min-h-[44px] inline-flex items-center text-brand-600 hover:text-brand-800 font-bold underline underline-offset-2"
              >
                FAQ →
              </Link>
            </div>

            {/* Localized Blog Guide Link */}
            <div className="pt-1">
              <Link
                href={getGuideUrl(locale)}
                className="min-h-[44px] inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-800 transition-colors"
              >
                {t('order_guide_link')}
              </Link>
            </div>
          </div>

          {/* Top-Up and Telegram Links */}
          <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <Link
              href={topupUrl}
              className="min-h-[44px] inline-flex items-center text-brand-600 hover:text-brand-800 font-bold transition-colors"
            >
              {t('order_topup_link')}
            </Link>
            <a
              href="https://t.me/PureSim"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-1.5 text-slate-600 hover:text-brand-600 font-semibold transition-colors"
            >
              <svg className="h-4 w-4 text-sky-500 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
              </svg>
              <span>{t('order_telegram_news')}</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
