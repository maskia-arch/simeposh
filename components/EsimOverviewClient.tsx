'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

interface ClientPageProps {
  iccid: string;
  smdpAddress: string;
  activationCode: string;
  apn: string;
  qrCodeDataUrl: string;
  countryName: string;
  flag: string | null;
  dataGb: number | null;
  validityDays: number;
  token?: string;
  siblingEsims?: { iccid: string; countryName: string; flag: string | null }[];
}

export function ClientPage({
  iccid,
  smdpAddress,
  activationCode,
  apn,
  qrCodeDataUrl,
  countryName,
  flag,
  dataGb,
  validityDays,
  token,
  siblingEsims,
}: ClientPageProps) {
  const { t } = useTranslation();
  const [deviceOs, setDeviceOs] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [usage, setUsage] = useState<{
    loading: boolean;
    data: {
      status: string;
      dataRemaining: number;
      dataTotal: number;
      expiredTime: string;
    } | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);

  // Helper function to safely fetch translated text or fall back to default
  const tr = (key: string, defaultText: string) => {
    const val = t(key as any);
    if (!val || val === key) return defaultText;
    return val;
  };

  useEffect(() => {
    // Basic OS detection
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOs('ios');
    } else if (/android/.test(ua)) {
      setDeviceOs('android');
    } else {
      setDeviceOs('desktop');
    }
  }, []);

  const lpaLink = `LPA:1$${smdpAddress}$${activationCode}`;

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleCheckUsage = async () => {
    setUsage({ loading: true, data: null, error: null });
    try {
      const res = await fetch(`/api/esim/usage?iccid=${iccid}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? (tr('pay_error', 'Abfrage fehlgeschlagen')));
      setUsage({ loading: false, data: json, error: null });
    } catch (err: any) {
      setUsage({ loading: false, data: null, error: err.message });
    }
  };

  const formatGb = (bytes: number) => {
    return (bytes / 1_073_741_824).toFixed(2);
  };

  const percentUsed = usage.data
    ? Math.max(0, Math.min(100, ((usage.data.dataTotal - usage.data.dataRemaining) / usage.data.dataTotal) * 100))
    : 0;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 font-sans px-4 py-8 md:py-14 antialiased">
      {/* Top Navigation Bar with Official Shop Logo & Language Switcher */}
      <div className="max-w-xl mx-auto flex items-center justify-between mb-10 pb-4 border-b border-slate-800/80">
        <Link href="https://puresim.net" className="flex items-center gap-2.5 font-bold text-lg shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PureSim Logo" className="h-10 w-10 object-contain transition-transform group-hover:scale-105" />
          <span className="text-2xl font-bold tracking-tight">
            <span className="text-[#1d4ed8]">Pur</span>
            <span className="text-[#0ea5e9]">eSim</span>
          </span>
        </Link>

        {/* Multi-language selector dropdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-2 py-1 shadow-lg backdrop-blur-md">
          <LanguageSwitcher />
        </div>
      </div>

      {/* PureSim Header Title */}
      <div className="max-w-xl mx-auto text-center mb-8">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[11px] uppercase font-extrabold tracking-wider text-brand-400">
          <span className="h-1.5 w-1.5 rounded-full bg-brand-400 animate-ping" />
          {tr('esim_install_center', 'eSIM Einrichtungszentrum')}
        </span>
        <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-3">
          {tr('esim_ready_title', 'Deine PureSim eSIM')}
        </h1>

        {/* Monospace ICCID Bar */}
        <div className="mt-3 inline-flex items-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-300 font-mono shadow-sm">
          <span className="text-slate-500 font-semibold select-none">ICCID:</span>
          <span className="select-all font-bold tracking-wider text-slate-200">{iccid}</span>
          <button
            onClick={() => copyToClipboard(iccid, 'iccid')}
            className="ml-1 text-[11px] font-bold text-brand-400 hover:text-brand-300 cursor-pointer transition-colors"
          >
            {copiedField === 'iccid' ? '✓' : tr('esim_copy', 'Kopieren')}
          </button>
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Sibling eSIM Switcher for Multi-eSIM / Bulk Orders */}
        {siblingEsims && siblingEsims.length > 1 && (
          <div className="bg-slate-900/80 border border-brand-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>📦</span>
                <span>Weitere eSIMs aus dieser Bestellung ({siblingEsims.length} total)</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {siblingEsims.map((s, idx) => {
                const isCurrent = s.iccid === iccid;
                const siblingUrl = token ? `https://esim.puresim.net/${token}/${s.iccid}` : '#';
                return (
                  <Link
                    key={s.iccid}
                    href={siblingUrl}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      isCurrent
                        ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <span>{s.flag ?? '🌐'}</span>
                    <span>eSIM #{idx + 1}: {s.countryName}</span>
                    {isCurrent && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-extrabold">Aktiv</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* eSIM Plan Summary Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center text-3xl shadow-inner shrink-0">
              {flag ?? '🌐'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-extrabold text-white truncate">{countryName}</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {dataGb != null ? `${dataGb} GB` : tr('card_unlimited', 'Unbegrenzt')} · {validityDays} {tr('cfg_days', 'Tage')}
              </p>
              <p className="text-[11px] font-medium text-sky-400 mt-1 flex items-center gap-1.5">
                <span>⌛</span> 180 Tage Zeit zur Installation ab Kaufdatum
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[11px] font-bold text-emerald-400 shrink-0">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              {tr('life_new', 'Bereit zur Installation')}
            </div>
          </div>
        </div>

        {/* 1. Quick Installation Button */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {tr('esim_quick_install_title', '1-Klick Automatische Installation')}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-1.5">
              {deviceOs === 'ios' && tr('esim_ios_hint', 'Tippe auf den Button, um die eSIM direkt auf deinem iPhone/iPad zu installieren.')}
              {deviceOs === 'android' && tr('esim_android_hint', 'Tippe auf den Button, um die automatische Einrichtung auf deinem Android-Gerät zu starten.')}
              {deviceOs === 'desktop' && tr('esim_desktop_hint', 'Scanne den QR-Code unten mit der Kamera deines Smartphones oder öffne diesen Link auf deinem Handy.')}
            </p>
          </div>

          <a
            href={lpaLink}
            className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 active:scale-[0.99] py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all duration-200 cursor-pointer"
          >
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {tr('esim_auto_activate_btn', 'eSIM automatisch installieren')}
          </a>

          {deviceOs !== 'desktop' && (
            <p className="text-[11px] text-center text-slate-400 italic">
              {tr('esim_os_notice', 'Hinweis: Öffnet direkt das Mobilfunk-Einrichtungsmenü deines Geräts.')}
            </p>
          )}
        </div>

        {/* 2. QR Code display & download */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md flex flex-col items-center text-center space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">{tr('esim_qr_title', 'Installation per QR-Code')}</h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-1">
              {tr('esim_qr_sub', 'Scanne diesen QR-Code mit der Kamera des Smartphones, auf dem du die eSIM installieren möchtest.')}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl shadow-2xl inline-block border-2 border-slate-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrCodeDataUrl}
              alt="eSIM Installation QR Code"
              width={200}
              height={200}
              className="rounded-lg"
            />
          </div>

          <a
            href={qrCodeDataUrl}
            download={`puresim-esim-${iccid}.png`}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {tr('esim_download_qr', 'QR-Code herunterladen')}
          </a>

          <div className="pt-3 border-t border-slate-800/80 w-full">
            <Link
              href="https://puresim.net/blog/esim-aktivieren-schritt-fuer-schritt-anleitung"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {tr('esim_detailed_guide', 'Schritt-für-Schritt Installationsanleitung')} →
            </Link>
          </div>
        </div>

        {/* 3. Action Buttons: Check Usage & TopUp */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {tr('esim_mgmt_title', 'eSIM Verwaltung & Status')}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCheckUsage}
              disabled={usage.loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 py-3 text-xs font-bold text-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-sm"
            >
              {usage.loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {tr('card_loading', 'Wird geladen...')}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {tr('esim_check_usage', 'Datenverbrauch prüfen')}
                </>
              )}
            </button>

            <Link
              href={`https://puresim.net/topup?iccid=${iccid}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 py-3 text-xs font-bold text-brand-400 transition-all text-center cursor-pointer shadow-sm"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {tr('nav_topup', 'eSIM aufladen')}
            </Link>
          </div>

          {/* Usage Results Display */}
          {usage.error && (
            <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-3.5 text-xs text-red-400 animate-fadeIn">
              {usage.error}
            </div>
          )}

          {usage.data && (
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3 animate-fadeIn text-xs shadow-inner">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-semibold">{tr('esim_status_label', 'Netzwerk-Status:')}</span>
                <span className={`font-bold px-2.5 py-0.5 rounded text-[10px] uppercase ${
                  usage.data.status === 'IN_USE' || usage.data.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                }`}>
                  {usage.data.status === 'IN_USE' || usage.data.status === 'ACTIVE'
                    ? tr('life_in_use', 'Aktiv')
                    : tr('life_new', 'Bereit zur Installation')}
                </span>
              </div>

              {/* Data usage bar (only if dataTotal > 0) */}
              {usage.data.dataTotal > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{tr('card_data', 'Daten')}:</span>
                    <span>{formatGb(usage.data.dataRemaining)} GB {tr('esim_left', 'verbleibend')} / {formatGb(usage.data.dataTotal)} GB</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-brand-500 to-indigo-500 rounded-full transition-all duration-500"
                      style={{ width: `${100 - percentUsed}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-200">
                  <span>{tr('card_data', 'Daten')}:</span>
                  <span className="font-bold">{tr('card_unlimited', 'Unbegrenzt')}</span>
                </div>
              )}

              {usage.data.expiredTime && (
                <div className="flex items-center justify-between text-slate-400 pt-2 border-t border-slate-900">
                  <span>{tr('card_validity', 'Gültigkeit')}:</span>
                  <span className="font-mono text-slate-200 font-medium">
                    {new Date(usage.data.expiredTime).toLocaleDateString('de-DE', {
                      day: '2-digit',
                      month: '2-digit',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. Manual Installation Accordion */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-md overflow-hidden">
          <button
            onClick={() => setManualOpen(!manualOpen)}
            className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-slate-200 hover:bg-slate-800/30 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {tr('esim_manual', 'Manuelle Zugangsdaten')}
            </span>
            <span className="text-slate-400">
              {manualOpen ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </span>
          </button>

          {manualOpen && (
            <div className="p-5 border-t border-slate-800/80 bg-slate-950/40 space-y-4 text-xs animate-slideDown">
              <p className="text-slate-300 leading-relaxed">
                {tr('esim_manual_desc', 'Falls das Scannen des QR-Codes nicht möglich ist, kannst du diese Aktivierungsdaten manuell in den Mobilfunk-Einstellungen deines Smartphones eingeben:')}
              </p>

              {/* SM-DP+ Server */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">{tr('esim_smdp', 'SM-DP+ Server')}</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono select-all">
                  <span className="truncate text-slate-200">{smdpAddress}</span>
                  <button
                    onClick={() => copyToClipboard(smdpAddress, 'smdp')}
                    className="shrink-0 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                  >
                    {copiedField === 'smdp' ? '✓ Kopiert' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>

              {/* Activation Code */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">{tr('esim_code', 'Aktivierungscode')}</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono select-all">
                  <span className="truncate text-slate-200">{activationCode}</span>
                  <button
                    onClick={() => copyToClipboard(activationCode, 'code')}
                    className="shrink-0 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                  >
                    {copiedField === 'code' ? '✓ Kopiert' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>

              {/* APN */}
              <div className="space-y-1">
                <span className="text-slate-400 font-semibold uppercase tracking-wide text-[10px]">APN</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono select-all">
                  <span className="truncate text-slate-200">{apn || 'internet'}</span>
                  <button
                    onClick={() => copyToClipboard(apn || 'internet', 'apn')}
                    className="shrink-0 text-xs font-bold text-brand-400 hover:text-brand-300 cursor-pointer"
                  >
                    {copiedField === 'apn' ? '✓ Kopiert' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/60 border border-slate-800 p-3.5 text-[11px] text-slate-400 space-y-1">
                <p>• <strong>iOS:</strong> Einstellungen &gt; Mobilfunk &gt; eSIM hinzufügen &gt; Details manuell eingeben.</p>
                <p>• <strong>Android:</strong> Einstellungen &gt; Netzwerk &gt; SIM-Karten &gt; eSIM hinzufügen &gt; Code manuell eingeben.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-xl mx-auto text-center mt-12 pt-6 border-t border-slate-900 text-xs text-slate-500">
        <Link href="https://puresim.net" className="inline-flex items-center gap-2 font-bold justify-center mb-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PureSim Logo" className="h-6 w-6 object-contain" />
          <span className="text-lg font-bold tracking-tight">
            <span className="text-[#1d4ed8]">Pur</span>
            <span className="text-[#0ea5e9]">eSim</span>
          </span>
        </Link>
        <p>&copy; {new Date().getFullYear()} PureSim. Alle Rechte vorbehalten.</p>
        <p className="mt-1 text-[11px] text-slate-600">Verschlüsselte & sichere eSIM-Bereitstellung</p>
      </div>
    </main>
  );
}
