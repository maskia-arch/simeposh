'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CountryFlag } from '@/components/CountryFlag';
import { formatCurrencyEuro, formatGb } from '@/lib/utils';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { useTranslation } from '@/lib/i18n';

interface OrderDetailClientProps {
  order: {
    id: string;
    status: string;
    amount_eur: number;
    iccid: string | null;
    created_at: string;
    checkout_ref?: string | null;
    setup_token?: string | null;
  };
  tariff: {
    id?: string;
    name: string;
    country_name: string;
    country_code?: string | null;
    flag_emoji?: string | null;
    data_gb: number | null;
    validity_days: number;
  } | null;
  countryLabel: string;
  userEmail: string;
  prefix: string;
  locale: string;
  existingFeedback: { id: string; rating: number; created_at: string } | null;
}

const STATUS_KEYS: Record<string, string> = {
  completed: 'status_completed',
  paid: 'status_paid',
  provisioning: 'status_provisioning',
  pending: 'status_pending',
  failed: 'status_failed',
  refunded: 'status_refunded',
};

export function OrderDetailClient({
  order,
  tariff,
  countryLabel,
  userEmail,
  prefix,
  locale,
  existingFeedback,
}: OrderDetailClientProps) {
  const { t } = useTranslation();
  const [revealedIccid, setRevealedIccid] = useState<string | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const maskedIccid = order.iccid ? `•••• ${order.iccid.slice(-4)}` : null;
  const isPaid = ['completed', 'paid', 'provisioning'].includes(order.status) || Boolean(order.iccid);
  const installUrl = order.setup_token ? `https://esim.puresim.net/s/${order.setup_token}` : null;

  const validityDays = tariff?.validity_days ?? 1;
  const daysText = formatDaysWithUnit(validityDays, locale);
  const localizedTariffName = tariff
    ? `${countryLabel} · ${formatGb(tariff.data_gb)} · ${daysText}`
    : 'eSIM';

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(order.created_at));

  const handleRevealIccid = async () => {
    if (revealedIccid) return;
    setIsRevealing(true);
    try {
      const res = await fetch('/api/esim/reveal-iccid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      const data = await res.json();
      if (res.ok && data.iccid) {
        setRevealedIccid(data.iccid);
      }
    } catch (err) {
      console.error('Failed to reveal ICCID', err);
    } finally {
      setIsRevealing(false);
    }
  };

  const handleCopyIccid = async () => {
    let toCopy = revealedIccid;
    if (!toCopy) {
      setIsRevealing(true);
      try {
        const res = await fetch('/api/esim/reveal-iccid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ orderId: order.id }),
        });
        const data = await res.json();
        if (res.ok && data.iccid) {
          toCopy = data.iccid;
          setRevealedIccid(data.iccid);
        }
      } catch (err) {
        console.error('Failed to copy ICCID', err);
      } finally {
        setIsRevealing(false);
      }
    }

    if (toCopy) {
      try {
        await navigator.clipboard.writeText(toCopy);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      } catch (err) {
        console.error('Clipboard copy failed', err);
      }
    }
  };

  const handleResendEmail = async () => {
    setResendStatus('sending');
    try {
      const res = await fetch('/api/orders/resend-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });
      if (res.ok) {
        setResendStatus('sent');
        setTimeout(() => setResendStatus('idle'), 4000);
      } else {
        setResendStatus('error');
        setTimeout(() => setResendStatus('idle'), 4000);
      }
    } catch {
      setResendStatus('error');
      setTimeout(() => setResendStatus('idle'), 4000);
    }
  };

  const statusLabel = STATUS_KEYS[order.status]
    ? t(STATUS_KEYS[order.status] as any)
    : order.status;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-28 md:py-12">
      {/* Back button */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`${prefix}/dashboard`}
          className="min-h-[44px] inline-flex items-center text-sm font-semibold text-brand-600 hover:text-brand-800 transition-colors"
        >
          ← {t('dash_back' as any) || (locale === 'de' ? 'Mein Bereich' : 'Dashboard')}
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            {t('order_details_title' as any) || (locale === 'de' ? 'Bestelldetails' : 'Order Details')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('order_number' as any) || (locale === 'de' ? 'Bestellnummer' : 'Order #')}: #{order.id.slice(0, 8)} · {formattedDate}
          </p>
        </div>

        {/* Localized PDF Receipt Button */}
        <a
          href={`/api/orders/${order.id}/receipt`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-400 transition-all shadow-xs cursor-pointer"
        >
          <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{t('receipt_pdf_btn' as any) || (locale === 'de' ? 'Beleg (PDF)' : 'Receipt (PDF)')}</span>
        </a>
      </div>

      {/* Primary Action Banner: Setup & Install eSIM */}
      {installUrl && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-brand-500/20 border border-brand-400/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-300">
              📱 {t('esim_setup_center' as any) || (locale === 'de' ? 'Interaktive eSIM Einrichtungsseite' : 'Interactive eSIM Setup')}
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {t('esim_setup_banner_title' as any) || (locale === 'de' ? 'Installation & Datenverbrauch' : 'Installation & Data Usage')}
          </h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-md">
            {t('esim_setup_banner_desc' as any) || (locale === 'de'
              ? 'Die QR-Code Aktivierung, automatische 1-Klick Einrichtung, der Live-Datenverbrauch sowie die manuellen Zugangsdaten befinden sich auf deiner persönlichen Einrichtungsseite.'
              : 'QR code activation, 1-click automatic install, live data usage checks, and manual connection details are on your personal setup page.')}
          </p>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all cursor-pointer"
            >
              <span>{t('esim_install_now_btn' as any) || (locale === 'de' ? 'Jetzt installieren' : 'Install now')}</span>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Notice: QR code sent to email with resend button */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-700">
          <svg className="h-5 w-5 text-brand-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <span>
            {locale === 'de'
              ? `QR-Code wurde an ${userEmail} gesendet.`
              : `QR code was sent to ${userEmail}.`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleResendEmail}
          disabled={resendStatus === 'sending'}
          className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 rounded-lg hover:bg-slate-100 transition-colors inline-flex items-center gap-1 cursor-pointer"
        >
          {resendStatus === 'sending'
            ? '...'
            : resendStatus === 'sent'
            ? '✓ ' + (locale === 'de' ? 'Erneut gesendet!' : 'Resent!')
            : resendStatus === 'error'
            ? '✕ ' + (locale === 'de' ? 'Fehler' : 'Error')
            : (t('resend_email_btn' as any) || (locale === 'de' ? 'E-Mail erneut senden' : 'Resend Email'))}
        </button>
      </div>

      {/* Tariff & Order Specifications */}
      {tariff && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 overflow-hidden shadow-xs">
              <CountryFlag countryCode={tariff.country_code || tariff.country_name} countryName={countryLabel} size={36} />
            </div>
            <div>
              <p className="text-base font-extrabold text-slate-900">{countryLabel}</p>
              <p className="text-xs font-bold text-brand-600 mt-0.5">{localizedTariffName}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">{t('card_data' as any) || (locale === 'de' ? 'Daten' : 'Data')}</p>
              <p className="text-sm font-bold text-slate-800">{formatGb(tariff.data_gb)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">{t('card_validity' as any) || (locale === 'de' ? 'Gültigkeit' : 'Validity')}</p>
              <p className="text-sm font-bold text-slate-800">{daysText}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">{t('dash_paid' as any) || (locale === 'de' ? 'Bezahlt' : 'Paid')}</p>
              <p className="text-sm font-bold text-slate-800">{formatCurrencyEuro(order.amount_eur, locale)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-slate-500 font-medium">{t('dash_status' as any) || (locale === 'de' ? 'Status' : 'Status')}</p>
              <p className="text-sm font-bold text-emerald-700 capitalize">{statusLabel}</p>
            </div>

            {/* Masked ICCID with Reveal and Copy */}
            {order.iccid && (
              <div className="col-span-2 pt-3 border-t border-slate-100 space-y-1.5">
                <p className="text-slate-500 font-semibold select-none">ICCID</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-800 select-all tracking-wider bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                    {revealedIccid || maskedIccid}
                  </span>
                  {!revealedIccid ? (
                    <button
                      type="button"
                      onClick={handleRevealIccid}
                      disabled={isRevealing}
                      className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-brand-600 hover:text-brand-800 underline underline-offset-2 cursor-pointer inline-flex items-center"
                      aria-label={`${t('esim_reveal_btn' as any) || 'Volle ICCID anzeigen für'} ${countryLabel}`}
                    >
                      {isRevealing ? '...' : (t('esim_reveal_btn' as any) || (locale === 'de' ? 'Anzeigen' : 'Show'))}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={handleCopyIccid}
                    className="min-h-[44px] px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer inline-flex items-center gap-1 transition-colors"
                    aria-label={`${t('esim_copy_btn' as any) || 'ICCID kopieren für'} ${countryLabel}`}
                  >
                    {isCopied ? (
                      <>
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span className="text-emerald-700">{t('copied' as any) || (locale === 'de' ? 'Kopiert' : 'Copied')}</span>
                      </>
                    ) : (
                      <>
                        <span>📋</span>
                        <span>{t('copy' as any) || (locale === 'de' ? 'Kopieren' : 'Copy')}</span>
                      </>
                    )}
                  </button>
                  <span role="status" aria-live="polite" className="sr-only">
                    {isCopied ? (t('copied' as any) || 'Kopiert') : ''}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verified Feedback CTA Banner */}
      {existingFeedback ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
              <span>✓</span> {locale === 'de'
                ? `Du hast diesen Kauf bewertet (${existingFeedback.rating} ★)`
                : `You rated this purchase (${existingFeedback.rating} ★)`}
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">
              {locale === 'de' ? 'Vielen Dank für dein Feedback zu dieser Bestellung!' : 'Thank you for your review!'}
            </p>
          </div>
          <Link
            href={`${prefix}/reviews`}
            className="min-h-[44px] inline-flex items-center rounded-xl border border-emerald-300 bg-white px-4 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0"
          >
            {locale === 'de' ? 'Reviews ansehen' : 'View reviews'}
          </Link>
        </div>
      ) : isPaid ? (
        <div className="mb-6 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                🎁 1% eSIM Cash
              </span>
              <span className="text-amber-500 text-xs">★ ★ ★ ★ ★</span>
            </div>
            <p className="font-bold text-slate-800 text-sm">
              {locale === 'de' ? 'Wie zufrieden bist du mit deiner eSIM?' : 'How satisfied are you with your eSIM?'}
            </p>
            <p className="text-xs text-slate-600 mt-0.5">
              {locale === 'de'
                ? `Teile deine Erfahrung in 1 Minute und erhalte ${formatCurrencyEuro((Number(order.amount_eur) || 0) * 0.01, locale)} (1%) direkt als eSIM Cash gutgeschrieben!`
                : `Share your review and earn 1% cashback (${formatCurrencyEuro((Number(order.amount_eur) || 0) * 0.01, locale)}) directly to your eSIM Cash balance!`}
            </p>
          </div>
          <Link
            href={`${prefix}/reviews/new?orderId=${order.id}`}
            prefetch={false}
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all shrink-0 hover:shadow-md active:scale-95 cursor-pointer"
          >
            <span>⭐</span> {locale === 'de' ? 'Jetzt bewerten (+1% Cash)' : 'Review now (+1% Cash)'}
          </Link>
        </div>
      ) : null}

      {/* Secondary Actions */}
      <div className="flex flex-wrap gap-3 pt-2">
        {order.iccid && (
          <Link
            href={`${prefix}/topup?orderId=${order.id}`}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-sm cursor-pointer"
          >
            <span>📶</span>
            <span>{t('dash_topup' as any) || (locale === 'de' ? 'eSIM aufladen' : 'Top up eSIM')}</span>
          </Link>
        )}
        <Link
          href={`${prefix}/tariffs`}
          className="min-h-[44px] inline-flex items-center rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
        >
          {t('topup_buy_new_esim' as any) || (locale === 'de' ? 'Neue eSIM kaufen' : 'Buy new eSIM')}
        </Link>
      </div>
    </div>
  );
}
