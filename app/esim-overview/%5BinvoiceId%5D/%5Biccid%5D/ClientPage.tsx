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
      if (!res.ok) throw new Error(json.error ?? (t('pay_error' as any) || 'Request failed'));
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
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100 font-sans px-4 py-8 md:py-16">
      {/* Top Navigation Bar with Language Switcher */}
      <div className="max-w-xl mx-auto flex items-center justify-between mb-8">
        <Link href="https://puresim.net" className="inline-flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-xl font-black tracking-tight text-white">PURE<span className="text-brand-500">SIM</span></span>
        </Link>

        {/* Multi-language selector dropdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-1 py-0.5 shadow-md">
          <LanguageSwitcher />
        </div>
      </div>

      {/* PureSim Header Subtitle */}
      <div className="max-w-xl mx-auto text-center mb-8">
        <span className="px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-[10px] uppercase font-bold tracking-wider text-brand-400">
          {t('esim_install_center' as any) || 'eSIM Installation Center'}
        </span>
        <h1 className="text-2xl font-extrabold text-white mt-3">
          {t('esim_ready_title' as any) || 'Your PureSim eSIM'}
        </h1>
        <p className="text-xs text-slate-400 mt-1.5 font-mono break-all select-all">ICCID: {iccid}</p>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* eSIM Plan Summary Card */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="text-4xl filter drop-shadow-sm select-none">{flag ?? '🌐'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-bold text-white truncate">{countryName}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {dataGb != null ? `${dataGb} GB` : t('card_unlimited')} · {validityDays} {t('cfg_days')}
              </p>
            </div>
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" title="Active & Ready" />
          </div>
        </div>

        {/* 1. Quick Installation Button */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <svg className="h-4.5 w-4.5 text-brand-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {t('esim_quick_install_title' as any) || '1-Click Automatic Installation'}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {deviceOs === 'ios' && (t('esim_ios_hint' as any) || 'Tap the button to install the eSIM directly on your iPhone/iPad.')}
              {deviceOs === 'android' && (t('esim_android_hint' as any) || 'Tap the button to launch automatic eSIM setup on your Android device.')}
              {deviceOs === 'desktop' && (t('esim_desktop_hint' as any) || 'Scan the QR code below with your mobile camera or open this link on your phone.')}
            </p>
          </div>

          <a
            href={lpaLink}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 py-3.5 text-center text-sm font-bold text-white shadow-lg shadow-brand-600/10 hover:shadow-brand-500/20 transition-all duration-200 cursor-pointer"
          >
            <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t('esim_auto_activate_btn' as any) || 'Activate eSIM Automatically'}
          </a>

          {deviceOs !== 'desktop' && (
            <p className="text-[10px] text-center text-slate-500 italic">
              {t('esim_os_notice' as any) || 'Note: This opens your device\'s cellular setup menu directly.'}
            </p>
          )}
        </div>

        {/* 2. QR Code display & download */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md flex flex-col items-center text-center space-y-4">
          <div>
            <h2 className="text-sm font-bold text-white">{t('esim_qr_title' as any) || 'Installation via QR Code'}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('esim_qr_sub' as any) || 'Scan this QR code using the camera of the smartphone where you want to install the eSIM.'}
            </p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl shadow-inner inline-block border border-slate-200">
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
            className="inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {t('esim_download_qr')}
          </a>

          <div className="pt-2 border-t border-slate-800/80 w-full">
            <Link
              href="https://puresim.net/blog/esim-aktivieren-schritt-fuer-schritt-anleitung"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-400 hover:text-brand-300 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              {t('esim_detailed_guide' as any) || 'Detailed Installation Guide'}
            </Link>
          </div>
        </div>

        {/* 3. Action Buttons: Check Usage & TopUp */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-md space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <svg className="h-4.5 w-4.5 text-brand-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {t('esim_mgmt_title' as any) || 'eSIM Management & Status'}
          </h2>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleCheckUsage}
              disabled={usage.loading}
              className="flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 py-3 text-xs font-bold text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {usage.loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('card_loading')}
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  {t('esim_check_usage' as any) || 'Check Data Usage'}
                </>
              )}
            </button>

            <Link
              href={`https://puresim.net/topup?iccid=${iccid}`}
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 py-3 text-xs font-bold text-brand-400 transition-colors text-center cursor-pointer"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {t('nav_topup')}
            </Link>
          </div>

          {/* Usage Results Display */}
          {usage.error && (
            <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-3.5 text-xs text-red-400 animate-fadeIn">
              {usage.error}
            </div>
          )}

          {usage.data && (
            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 space-y-3 animate-fadeIn text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>{t('esim_status_label' as any) || 'Network Status:'}</span>
                <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                  usage.data.status === 'IN_USE' || usage.data.status === 'ACTIVE'
                    ? 'bg-emerald-500/10 text-emerald-450 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-450 border border-amber-500/20'
                }`}>
                  {usage.data.status === 'IN_USE' || usage.data.status === 'ACTIVE' ? (t('esim_active' as any) || 'Active') : (t('esim_ready' as any) || 'Ready for Installation')}
                </span>
              </div>

              {/* Data usage bar (only if dataTotal > 0) */}
              {usage.data.dataTotal > 0 ? (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between font-semibold text-slate-200">
                    <span>{t('card_data')}:</span>
                    <span>{formatGb(usage.data.dataRemaining)} GB {t('esim_left' as any) || 'remaining'} / {formatGb(usage.data.dataTotal)} GB</span>
                  </div>
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-600 rounded-full transition-all duration-500"
                      style={{ width: `${100 - percentUsed}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between text-slate-200">
                  <span>{t('card_data')}:</span>
                  <span className="font-bold">{t('card_unlimited')}</span>
                </div>
              )}

              {usage.data.expiredTime && (
                <div className="flex items-center justify-between text-slate-400 pt-1.5 border-t border-slate-900">
                  <span>{t('card_validity')}:</span>
                  <span className="font-mono text-slate-250">
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
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl shadow-xl backdrop-blur-md overflow-hidden">
          <button
            onClick={() => setManualOpen(!manualOpen)}
            className="w-full flex items-center justify-between p-5 text-left font-bold text-sm text-slate-250 hover:bg-slate-800/20 transition-colors"
          >
            <span className="flex items-center gap-2">
              <svg className="h-4.5 w-4.5 text-slate-450" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              {t('esim_manual')}
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
            <div className="p-5 border-t border-slate-800/80 bg-slate-950/20 space-y-4 text-xs animate-slideDown">
              <p className="text-slate-400 leading-relaxed">
                {t('esim_manual_desc' as any) || 'If scanning the QR code is not possible, you can enter these activation details manually in your smartphone cellular settings:'}
              </p>

              {/* SM-DP+ Server */}
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wide text-[9px]">{t('esim_smdp')}</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono select-all">
                  <span className="truncate text-slate-300">{smdpAddress}</span>
                  <button
                    onClick={() => copyToClipboard(smdpAddress, 'smdp')}
                    className="shrink-0 text-[10px] font-bold text-brand-400 hover:text-brand-350 cursor-pointer"
                  >
                    {copiedField === 'smdp' ? '✓' : t('esim_copy')}
                  </button>
                </div>
              </div>

              {/* Activation Code */}
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wide text-[9px]">{t('esim_code')}</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono select-all">
                  <span className="truncate text-slate-300">{activationCode}</span>
                  <button
                    onClick={() => copyToClipboard(activationCode, 'code')}
                    className="shrink-0 text-[10px] font-bold text-brand-400 hover:text-brand-350 cursor-pointer"
                  >
                    {copiedField === 'code' ? '✓' : t('esim_copy')}
                  </button>
                </div>
              </div>

              {/* APN */}
              <div className="space-y-1">
                <span className="text-slate-500 font-semibold uppercase tracking-wide text-[9px]">APN</span>
                <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 rounded-lg p-2.5 font-mono select-all">
                  <span className="truncate text-slate-300">{apn || 'internet'}</span>
                  <button
                    onClick={() => copyToClipboard(apn || 'internet', 'apn')}
                    className="shrink-0 text-[10px] font-bold text-brand-400 hover:text-brand-350 cursor-pointer"
                  >
                    {copiedField === 'apn' ? '✓' : t('esim_copy')}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-900/40 border border-slate-800/80 p-3 text-[10px] text-slate-500 italic space-y-1">
                <p>• iOS: Settings &gt; Cellular / Mobile &gt; Add eSIM &gt; Enter Details Manually.</p>
                <p>• Android: Settings &gt; Network &gt; SIMs &gt; Add eSIM &gt; Enter Code Manually.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="max-w-xl mx-auto text-center mt-12 text-[10px] text-slate-650">
        <p>&copy; {new Date().getFullYear()} PureSim. All rights reserved.</p>
        <p className="mt-1">Encrypted & Secure eSIM Provisioning</p>
      </div>
    </main>
  );
}
