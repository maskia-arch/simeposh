'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { CountryFlag } from '@/components/CountryFlag';
import { formatGb } from '@/lib/utils';
import { getEsimQuickInstallLink } from '@/lib/esim-install';
import { CheckoutFeedbackWidget } from '@/components/CheckoutFeedbackWidget';

export interface SiblingEsim {
  setupToken?: string;
  iccid?: string;
  countryName: string;
  flag: string | null;
}

interface ClientPageProps {
  orderId?: string;
  maskedIccid?: string;
  hasIccid?: boolean;
  setupToken?: string;
  iccid?: string;
  smdpAddress: string;
  activationCode: string;
  apn: string;
  qrCodeDataUrl: string;
  countryName: string;
  flag: string | null;
  dataGb: number | null;
  validityDays: number;
  token?: string;
  siblingEsims?: SiblingEsim[];
}

export function ClientPage({
  orderId,
  maskedIccid = '',
  hasIccid = true,
  setupToken,
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
  const { t, locale } = useTranslation();
  const [deviceOs, setDeviceOs] = useState<'ios' | 'android' | 'desktop'>('desktop');
  const [revealedIccid, setRevealedIccid] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState<'ios' | 'android' | null>(null);
  const [canTopup, setCanTopup] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const [usage, setUsage] = useState<{
    loading: boolean;
    data: {
      status: string;
      esimStatus?: string;
      smdpStatus?: string;
      dataRemaining: number;
      dataTotal: number;
      dataUsed?: number;
      expiredTime: string;
      usageUpdatedAt?: string;
      createdAt?: string;
    } | null;
    error: string | null;
  }>({ loading: false, data: null, error: null });

  const tr = (key: string, defaultText: string, vars?: Record<string, string | number>) => {
    const val = t(key as any, vars);
    if (!val || val === key) {
      if (vars) {
        let str = defaultText;
        Object.entries(vars).forEach(([k, v]) => {
          str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        });
        return str;
      }
      return defaultText;
    }
    return val;
  };

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/iphone|ipad|ipod/.test(ua)) {
      setDeviceOs('ios');
      setGuideOpen('ios');
    } else if (/android/.test(ua)) {
      setDeviceOs('android');
      setGuideOpen('android');
    } else {
      setDeviceOs('desktop');
      setGuideOpen('ios');
    }

    if (setupToken || orderId) {
      handleCheckUsage();

      const topupQuery = orderId ? `orderId=${encodeURIComponent(orderId)}` : `setupToken=${encodeURIComponent(setupToken || '')}`;
      fetch(`/api/topup/packages?${topupQuery}`)
        .then((res) => res.json())
        .then((data) => {
          if (Array.isArray(data.packages) && data.packages.length > 0) {
            setCanTopup(true);
          } else {
            setCanTopup(false);
          }
        })
        .catch(() => setCanTopup(false));
    }
  }, [setupToken, orderId]);

  const lpaLink = getEsimQuickInstallLink(smdpAddress, activationCode, deviceOs);

  const fetchFullIccid = async (): Promise<string | null> => {
    if (revealedIccid) return revealedIccid;
    setRevealing(true);
    try {
      const q = setupToken ? `setupToken=${encodeURIComponent(setupToken)}` : `orderId=${encodeURIComponent(orderId || '')}`;
      const res = await fetch(`/api/esim/reveal-iccid?${q}`);
      const data = await res.json();
      if (res.ok && data.iccid) {
        setRevealedIccid(data.iccid);
        return data.iccid;
      }
      return null;
    } catch {
      return null;
    } finally {
      setRevealing(false);
    }
  };

  const handleRevealClick = async () => {
    if (revealedIccid) {
      setRevealedIccid(null);
      setLiveAnnouncement(locale === 'de' ? 'ICCID maskiert' : 'ICCID hidden');
    } else {
      const full = await fetchFullIccid();
      if (full) {
        setLiveAnnouncement(locale === 'de' ? 'ICCID aufgedeckt' : 'ICCID revealed');
      }
    }
  };

  const handleCopyIccid = async () => {
    let textToCopy = revealedIccid;
    if (!textToCopy) {
      textToCopy = await fetchFullIccid();
    }
    if (textToCopy) {
      try {
        await navigator.clipboard.writeText(textToCopy);
        setCopiedField('iccid');
        setLiveAnnouncement(locale === 'de' ? 'ICCID in die Zwischenablage kopiert' : 'ICCID copied to clipboard');
        setTimeout(() => setCopiedField(null), 2000);
      } catch (err) {
        console.error('Failed to copy', err);
      }
    }
  };

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
      const q = setupToken ? `setupToken=${encodeURIComponent(setupToken)}` : `orderId=${encodeURIComponent(orderId || '')}`;
      const res = await fetch(`/api/esim/usage?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? (tr('pay_error', 'Abfrage fehlgeschlagen')));
      setUsage({ loading: false, data: json, error: null });
    } catch (err: any) {
      setUsage({ loading: false, data: null, error: err.message });
    }
  };

  const createdAtTime = usage.data?.createdAt ? new Date(usage.data.createdAt).getTime() : 0;
  const hoursInOnboarding = createdAtTime > 0 ? (Date.now() - createdAtTime) / (1000 * 60 * 60) : 0;
  const rawEsimStatus = (usage.data?.status || usage.data?.esimStatus || '').toUpperCase();
  const isInUse = rawEsimStatus === 'IN_USE' || rawEsimStatus === 'ACTIVE';
  const smdpStatusUpper = (usage.data?.smdpStatus || '').toUpperCase();
  const isNotDeleted = smdpStatusUpper !== 'DELETED';

  // Format "Installieren bis" date
  const expireDateFormatted = usage.data?.expiredTime
    ? new Intl.DateTimeFormat(locale === 'de' ? 'de-DE' : 'en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Europe/Berlin',
      }).format(new Date(usage.data.expiredTime))
    : null;

  return (
    <main className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black text-slate-100 font-sans px-4 py-8 md:py-14 antialiased">
      {/* Top Navigation Bar with Official Shop Logo & Language Switcher */}
      <div className="max-w-xl mx-auto flex items-center justify-between mb-10 pb-4 border-b border-slate-800/80 relative z-50">
        <Link href="https://puresim.net" className="flex items-center gap-2.5 font-bold text-lg shrink-0 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PureSim Logo" className="h-10 w-10 object-contain transition-transform group-hover:scale-105" />
          <span className="text-2xl font-bold tracking-tight text-[#1d4ed8]">
            PureSim
          </span>
        </Link>

        <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-1.5 py-0.5 shadow-lg backdrop-blur-md">
          <LanguageSwitcher variant="dark" />
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

        {/* Masked ICCID Bar with Reveal & Copy Buttons */}
        {hasIccid && (
          <div className="mt-3 inline-flex flex-wrap items-center justify-center gap-2 bg-slate-900/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-mono shadow-sm">
            <span className="text-slate-500 font-semibold select-none">ICCID:</span>
            <span className="select-all font-bold tracking-wider text-slate-200">
              {revealedIccid || maskedIccid || '•••• 8524'}
            </span>
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={handleRevealClick}
                disabled={revealing}
                aria-label={revealedIccid ? tr('iccid_hide', 'ICCID ausblenden') : tr('iccid_reveal', 'ICCID anzeigen')}
                className="min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {revealing ? '...' : revealedIccid ? tr('iccid_hide', 'Ausblenden') : tr('iccid_reveal', 'Anzeigen')}
              </button>
              <button
                type="button"
                onClick={handleCopyIccid}
                aria-label={tr('esim_copy', 'ICCID kopieren')}
                className="min-h-[44px] min-w-[44px] px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-600/30 text-brand-300 hover:text-white hover:bg-brand-600 transition-colors cursor-pointer inline-flex items-center justify-center"
              >
                {copiedField === 'iccid' ? '✓ ' + tr('cash_copied', 'Kopiert!') : tr('esim_copy', 'Kopieren')}
              </button>
            </div>
          </div>
        )}

        <div role="status" aria-live="polite" className="sr-only">
          {liveAnnouncement}
        </div>
      </div>

      <div className="max-w-xl mx-auto space-y-6">
        {/* Sibling eSIM Switcher for Multi-eSIM / Bulk Orders */}
        {siblingEsims && siblingEsims.length > 1 && (
          <div className="bg-slate-900/80 border border-brand-500/30 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <span>📦</span>
                <span>{tr('esim_other_esims', `Weitere eSIMs aus dieser Bestellung (${siblingEsims.length} total)`, { count: siblingEsims.length })}</span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {siblingEsims.map((s, idx) => {
                const isCurrent = s.setupToken === setupToken;
                return (
                  <Link
                    key={s.setupToken}
                    href={`/s/${s.setupToken}`}
                    className={`min-h-[44px] px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                      isCurrent
                        ? 'bg-brand-600 border-brand-500 text-white shadow-md'
                        : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-900'
                    }`}
                  >
                    <CountryFlag countryCode={s.flag || s.countryName} countryName={s.countryName} size={20} className="shrink-0" />
                    <span>eSIM #{idx + 1}: {s.countryName}</span>
                    {isCurrent && <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-extrabold">{tr('life_in_use', 'Aktiv')}</span>}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* eSIM Plan Summary Card */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-center shadow-inner shrink-0 overflow-hidden">
              <CountryFlag countryCode={flag || countryName} countryName={countryName} size={48} className="rounded-xl shadow-md" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xl font-extrabold text-white truncate">{countryName}</p>
              <p className="text-xs text-slate-300 font-medium mt-0.5">
                {formatGb(dataGb, tr('card_unlimited', 'Unbegrenzt'))} · {validityDays} {tr('cfg_days', 'Tage')}
              </p>
              {expireDateFormatted && (
                <p className="text-[11px] font-medium text-amber-400 mt-1 flex items-center gap-1.5">
                  <span>📅</span> {locale === 'de' ? `Installieren bis: ${expireDateFormatted}` : `Install before: ${expireDateFormatted}`}
                </p>
              )}
            </div>
            <div className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold shrink-0 ${
              isInUse
                ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
                : 'bg-sky-500/10 border border-sky-500/20 text-sky-400'
            }`}>
              <span className={`h-2 w-2 rounded-full ${isInUse ? 'bg-emerald-400 animate-ping' : 'bg-sky-400 animate-pulse'}`} />
              {isInUse ? tr('life_in_use', 'Aktiv (In Use)') : tr('life_new', 'Bereit zur Installation')}
            </div>
          </div>
        </div>

        {/* 1. Quick Direct Install (Mobile only) */}
        {lpaLink && (
          <div className="bg-gradient-to-r from-brand-600 to-blue-600 rounded-2xl p-5 shadow-2xl text-center space-y-3">
            <p className="text-white font-black text-sm">
              {tr('esim_direct_btn_title', 'Direkt auf diesem Smartphone aktivieren')}
            </p>
            <p className="text-xs text-blue-100 max-w-sm mx-auto leading-relaxed">
              {deviceOs === 'ios'
                ? tr('esim_ios_hint', 'Tippe auf den Button, um die eSIM direkt in den Mobilfunk-Einstellungen deines iPhones hinzuzufügen.')
                : tr('esim_android_hint', 'Tippe auf den Button, um den eSIM-Installationsassistenten deines Android-Geräts zu starten.')}
            </p>
            <a
              href={lpaLink}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-white px-6 py-3 text-sm font-bold text-slate-900 shadow-md hover:bg-slate-100 active:scale-95 transition-all w-full sm:w-auto cursor-pointer"
            >
              <span>⚡</span> {tr('esim_install_now', 'eSIM jetzt aktivieren')}
            </a>
          </div>
        )}

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
            download={`puresim-esim-${orderId ? orderId.slice(-6) : 'qr'}.png`}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 px-5 py-2.5 text-xs font-bold text-slate-200 transition-all cursor-pointer shadow-md"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {tr('esim_download_qr', 'QR-Code herunterladen')}
          </a>

          {/* Collapsible Quick Step Guide (iOS & Android) */}
          <div className="w-full text-left pt-3 border-t border-slate-800/80 space-y-2">
            <button
              type="button"
              onClick={() => setGuideOpen(guideOpen === 'ios' ? null : 'ios')}
              className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-850/60 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🍏</span> Apple iOS (iPhone / iPad) Anleitung
              </span>
              <span>{guideOpen === 'ios' ? '▲' : '▼'}</span>
            </button>
            {guideOpen === 'ios' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>1. Öffne <strong>Einstellungen &gt; Mobilfunk</strong>.</p>
                <p>2. Tippe auf <strong>eSIM hinzufügen</strong>.</p>
                <p>3. Wähle <strong>QR-Code verwenden</strong> und scanne den Code oben.</p>
                <p>4. Aktiviere <strong>Datenroaming</strong> für deine neue Reise-eSIM.</p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setGuideOpen(guideOpen === 'android' ? null : 'android')}
              className="w-full min-h-[44px] flex items-center justify-between p-3 rounded-xl bg-slate-850/60 hover:bg-slate-800 border border-slate-800 text-xs font-bold text-slate-200 transition-colors cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <span>🤖</span> Google Android (Samsung / Pixel) Anleitung
              </span>
              <span>{guideOpen === 'android' ? '▲' : '▼'}</span>
            </button>
            {guideOpen === 'android' && (
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p>1. Öffne <strong>Einstellungen &gt; Netzwerk &amp; Internet &gt; SIMs</strong>.</p>
                <p>2. Tippe auf <strong>+</strong> oder <strong>eSIM hinzufügen</strong>.</p>
                <p>3. Scanne den QR-Code mit der Kamera.</p>
                <p>4. Aktiviere <strong>Mobile Daten</strong> und <strong>Roaming</strong>.</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. Action Buttons: Check Usage & TopUp */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {tr('esim_mgmt_title', 'eSIM Verwaltung & Status')}
          </h2>

          <div className={canTopup ? 'grid grid-cols-2 gap-3' : 'w-full'}>
            <button
              onClick={handleCheckUsage}
              disabled={usage.loading}
              className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-slate-900 border border-slate-700 py-3 text-xs font-bold text-slate-200 transition-all disabled:opacity-50 cursor-pointer shadow-sm w-full"
            >
              {usage.loading ? (
                <span>{tr('card_loading', 'Wird geladen...')}</span>
              ) : (
                <span>{tr('esim_check_usage', 'Datenverbrauch prüfen')}</span>
              )}
            </button>

            {canTopup && (
              <Link
                href={orderId ? `/topup?orderId=${encodeURIComponent(orderId)}` : '/topup'}
                className="min-h-[44px] flex items-center justify-center gap-2 rounded-xl bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/40 py-3 text-xs font-bold text-brand-400 transition-all text-center cursor-pointer shadow-sm"
              >
                <span>+ {tr('nav_topup', 'eSIM aufladen')}</span>
              </Link>
            )}
          </div>

          {usage.error && (
            <div className="rounded-xl bg-red-950/40 border border-red-900/50 p-3.5 text-xs text-red-400 animate-fadeIn">
              {usage.error}
            </div>
          )}
        </div>

        {/* 4. Manual Activation Codes Accordion */}
        <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setManualOpen(!manualOpen)}
            className="w-full min-h-[44px] flex items-center justify-between text-left cursor-pointer"
          >
            <div>
              <p className="text-sm font-bold text-white">{tr('esim_manual_title', 'Manuelle Aktivierungsdaten')}</p>
              <p className="text-xs text-slate-400 mt-0.5">{tr('esim_manual_sub', 'Falls du den QR-Code nicht scannen kannst')}</p>
            </div>
            <span className="text-slate-400 text-sm font-bold">{manualOpen ? '▲' : '▼'}</span>
          </button>

          {manualOpen && (
            <div className="mt-4 pt-4 border-t border-slate-800 space-y-3 animate-fadeIn text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">{tr('esim_smdp', 'SM-DP+ Adresse')}</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={smdpAddress}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono select-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(smdpAddress, 'smdp')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    {copiedField === 'smdp' ? '✓' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">{tr('esim_act_code', 'Aktivierungscode')}</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={activationCode}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono select-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(activationCode, 'act')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    {copiedField === 'act' ? '✓' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">APN</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={apn}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 font-mono select-all text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apn, 'apn')}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition-colors cursor-pointer"
                  >
                    {copiedField === 'apn' ? '✓' : tr('esim_copy', 'Kopieren')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Support Ticket Section */}
      <div className="rounded-2xl border border-brand-500/30 bg-gradient-to-r from-brand-950/40 via-indigo-950/40 to-slate-900 p-5 text-center mt-8 max-w-xl mx-auto">
        <p className="font-semibold text-slate-200 text-sm">{tr('esim_support_title', 'Brauchst du Hilfe bei der Aktivierung dieser eSIM?')}</p>
        <p className="text-xs text-slate-400 mt-1 mb-3">{tr('esim_support_sub', 'Unser Support-Team hilft dir persönlich bei allen Fragen zur Installation weiter.')}</p>
        <button
          type="button"
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('open-ticket-modal', {
                detail: {
                  invoiceId: token || orderId || '',
                  subject: `Hilfe bei eSIM Aktivierung (${countryName} / eSIM: ${maskedIccid || '•••• 8524'})`,
                  category: 'activation',
                }
              }));
            } catch (err) {
              console.error('Open ticket error:', err);
            }
          }}
          className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-brand-500 transition-all cursor-pointer"
        >
          <span>🎫</span> {tr('esim_open_ticket_btn', 'Support-Ticket zu dieser eSIM öffnen')}
        </button>
      </div>

      {/* Verified Feedback Review Widget */}
      <CheckoutFeedbackWidget orderId={orderId} orderRef={setupToken || token} dark className="mt-8 max-w-xl mx-auto" />

      {/* Footer Branding */}
      <div className="max-w-xl mx-auto text-center mt-12 pt-6 border-t border-slate-900 text-xs text-slate-500">
        <Link href="https://puresim.net" className="inline-flex items-center gap-2 font-bold justify-center mb-2 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="PureSim Logo" className="h-6 w-6 object-contain" />
          <span className="text-lg font-bold tracking-tight text-[#1d4ed8]">
            PureSim
          </span>
        </Link>
        <p>&copy; {new Date().getFullYear()} PureSim. {tr('footer_copy', 'Alle Rechte vorbehalten.').replace('© {year} PureSim. ', '')}</p>
        <p className="mt-1 text-[11px] text-slate-600">{tr('esim_secure_notice', 'Verschlüsselte & sichere eSIM-Bereitstellung')}</p>
      </div>
    </main>
  );
}
