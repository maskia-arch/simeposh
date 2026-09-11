'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CountryFlag } from '@/components/CountryFlag';
import { formatEur, formatGb } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import type { DeliveredEsim } from '@/components/EsimDelivery';

export interface TopUpItem extends DeliveredEsim {
  orderType?: string;
  topUpIccid?: string | null;
  tariffName?: string | null;
  amountEur?: number | null;
}

export function TopUpDelivery({
  item,
  index,
  totalCount,
}: {
  item: TopUpItem;
  index?: number;
  totalCount?: number;
}) {
  const { t } = useTranslation();
  const [copiedIccid, setCopiedIccid] = useState(false);

  const iccid = item.topUpIccid || item.iccid || '';

  const copyIccid = async () => {
    if (!iccid) return;
    try {
      await navigator.clipboard.writeText(iccid);
      setCopiedIccid(true);
      setTimeout(() => setCopiedIccid(false), 2000);
    } catch {}
  };

  return (
    <div className="rounded-3xl border border-emerald-200/80 bg-white p-6 shadow-sm overflow-hidden relative">
      {/* Top Accent line */}
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600" />

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <CountryFlag
            countryCode={item.flag || item.countryName}
            countryName={item.countryName}
            size={36}
            className="shrink-0"
          />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900">
                {item.tariffName || `${item.countryName} Top-Up`}
              </h2>
              {totalCount && totalCount > 1 && (
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                  #{index}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{item.countryName}</p>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-xs font-bold text-emerald-700 shadow-sm">
          <span>✅</span> {t('topup_status_active') || 'Erfolgreich aufgeladen'}
        </span>
      </div>

      {/* Info Grid */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('topup_data_label')}</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            {item.dataGb ? formatGb(item.dataGb) : 'Unbegrenzt'}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('topup_validity_label')}</p>
          <p className="text-sm font-black text-slate-900 mt-0.5">
            {item.validityDays} {t('cfg_days')}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">{t('topup_price_label')}</p>
          <p className="text-sm font-black text-brand-600 mt-0.5">
            {formatEur(item.amountEur)}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Status</p>
          <p className="text-sm font-black text-emerald-600 mt-0.5">
            {t('topup_badge_ready')}
          </p>
        </div>
      </div>

      {/* Recharged ICCID display */}
      <div className="mt-4 rounded-2xl bg-emerald-50/50 border border-emerald-100 p-3.5 flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
            {t('topup_recharged_iccid_label')}
          </p>
          <p className="font-mono text-xs font-bold text-slate-800 tracking-wide mt-0.5">
            {iccid || '—'}
          </p>
        </div>

        {iccid && (
          <button
            onClick={copyIccid}
            className="rounded-xl border border-emerald-200 bg-white px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 active:scale-95 transition-all shadow-sm flex items-center gap-1 cursor-pointer"
          >
            {copiedIccid ? (
              <><span>✓</span> {t('topup_copied')}</>
            ) : (
              <><span>📋</span> {t('topup_copy')}</>
            )}
          </button>
        )}
      </div>

      {/* Helpful explanation box */}
      <div className="mt-4 rounded-2xl bg-blue-50/60 border border-blue-100 p-4 text-xs text-blue-900 leading-relaxed space-y-1.5">
        <p className="font-bold flex items-center gap-1.5 text-blue-950">
          <span>ℹ️</span> {t('topup_no_qr_title') || 'Kein neuer QR-Code erforderlich'}
        </p>
        <p className="text-blue-800/90">
          {t('topup_no_qr_desc') ||
            'Das gebuchte Datenvolumen wurde deiner bereits installierten eSIM gutgeschrieben. Deine Verbindung funktioniert wie gewohnt weiter.'}
        </p>
      </div>

      {/* Overview Button */}
      {item.overviewUrl && (
        <div className="mt-4 flex justify-end">
          <Link
            href={item.overviewUrl}
            target="_blank"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-brand-600 hover:text-brand-700 hover:underline"
          >
            <span>📊</span> {t('topup_check_usage') || 'Verbrauch & Restvolumen einsehen'} →
          </Link>
        </div>
      )}
    </div>
  );
}
