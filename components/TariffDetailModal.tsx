'use client';

import { useState } from 'react';
import { formatEur, formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { CountryFlag } from '@/components/CountryFlag';
import { CheckoutModal } from '@/components/CheckoutModal';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface OperatorEntry {
  operatorName?: string;
  networkType?:  string;
}

function getOperators(tariff: Tariff): OperatorEntry[] {
  const raw = tariff.raw_data as Record<string, unknown> | null;
  const ops = raw?.operatorList;
  return Array.isArray(ops) ? (ops as OperatorEntry[]) : [];
}

const NETWORK_COLORS: Record<string, string> = {
  '5G':  'bg-violet-100 text-violet-700 border-violet-200',
  '4G':  'bg-blue-100 text-blue-700 border-blue-200',
  'LTE': 'bg-blue-100 text-blue-700 border-blue-200',
  '3G':  'bg-slate-100 text-slate-600 border-slate-200',
  '2G':  'bg-slate-100 text-slate-500 border-slate-200',
};

const TYPE_INFO: Record<string, { icon: string; label: string; color: string; desc: string }> = {
  travel:        { icon: '✈️',  label: 'Travel',         color: 'bg-sky-50 text-sky-700 border-sky-200',           desc: 'Festes Datenvolumen, das du flexibel über die Laufzeit verbrauchen kannst.' },
  unlimited_eco: { icon: '♾️',  label: 'Unlimited Eco',  color: 'bg-emerald-50 text-emerald-700 border-emerald-200', desc: 'Tägliches Highspeed-Volumen. Nach dem Limit: unbegrenzt mit 512 kbps.' },
  unlimited_pro: { icon: '⚡',  label: 'Unlimited Pro',  color: 'bg-violet-50 text-violet-700 border-violet-200',   desc: 'Tägliches Highspeed-Volumen. Nach dem Limit: unbegrenzt mit ≥ 1 Mbps.' },
};

interface Props {
  tariff:  Tariff;
  onClose: () => void;
}

export function TariffDetailModal({ tariff, onClose }: Props) {
  const [showCheckout, setShowCheckout] = useState(false);

  const ops     = getOperators(tariff);
  const typeInfo = tariff.tariff_type ? TYPE_INFO[tariff.tariff_type] : null;
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;
  const raw = tariff.raw_data as Record<string, unknown> | null;

  if (showCheckout) {
    return <CheckoutModal tariff={tariff} orderType="new_esim" onClose={onClose} />;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl">

        {/* ── Top colour bar ── */}
        <div className={`h-1.5 w-full rounded-t-3xl ${
          tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
          tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
          'bg-gradient-to-r from-brand-500 to-brand-400'
        }`} />

        {/* ── Close button ── */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-slate-100 p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>

        <div className="p-6">

          {/* ── Country header ── */}
          <div className="mb-5 flex items-center gap-4">
            <CountryFlag countryCode={tariff.country_code} countryName={tariff.country_name} size={56} />
            <div>
              <h2 className="text-2xl font-extrabold text-slate-900">{tariff.country_name}</h2>
              {tariff.region && <p className="text-sm text-slate-400">{tariff.region}</p>}
              {typeInfo && (
                <span className={`mt-1 inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${typeInfo.color}`}>
                  {typeInfo.icon} {typeInfo.label}
                </span>
              )}
            </div>
          </div>

          {/* ── Plan name ── */}
          <p className="mb-4 text-sm text-slate-600 leading-relaxed">{tariff.name}</p>

          {/* ── Promo label ── */}
          {tariff.label && (
            <div className="mb-4">
              <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-sm font-semibold text-amber-800">
                🏷️ {tariff.label}
              </span>
            </div>
          )}

          {/* ── Key specs grid ── */}
          <div className="mb-5 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-brand-50 p-3.5 text-center border border-brand-100">
              <p className="text-xl font-bold text-brand-700">
                {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">Daten</p>
              {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
                <p className="text-[10px] text-brand-500 mt-0.5">{tariff.data_gb} GB/Tag HS</p>
              )}
            </div>
            <div className="rounded-2xl bg-slate-50 p-3.5 text-center border border-slate-200">
              <p className="text-xl font-bold text-slate-700">{tariff.validity_days}d</p>
              <p className="text-xs text-slate-500 mt-0.5">Gültigkeit</p>
            </div>
            <div className="rounded-2xl bg-green-50 p-3.5 text-center border border-green-100">
              <p className="text-xl font-bold text-green-700">{formatEur(tariff.sale_price_eur)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Preis</p>
            </div>
          </div>

          {/* ── Unlimited note ── */}
          {typeInfo && tariff.tariff_type !== 'travel' && (
            <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${typeInfo.color}`}>
              <p className="font-medium">{typeInfo.icon} {typeInfo.desc}</p>
              {tariff.tariff_type === 'unlimited_eco' && (
                <p className="mt-1 text-xs opacity-80">🔄 Das Highspeed-Volumen erneuert sich täglich um Mitternacht (UTC).</p>
              )}
              {tariff.tariff_type === 'unlimited_pro' && (
                <p className="mt-1 text-xs opacity-80">🔄 Das Highspeed-Volumen erneuert sich täglich um Mitternacht (UTC).</p>
              )}
            </div>
          )}

          {/* ── Operators / network ── */}
          {ops.length > 0 && (
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Netzbetreiber</p>
              <div className="flex flex-wrap gap-2">
                {ops.map((op, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <span className="text-sm font-medium text-slate-700">{op.operatorName}</span>
                    {op.networkType && (
                      <span className={`rounded-md border px-1.5 py-0.5 text-[10px] font-bold ${
                        NETWORK_COLORS[op.networkType.toUpperCase()] ?? NETWORK_COLORS['3G']
                      }`}>
                        {op.networkType}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── SMS support ── */}
          {raw?.smsStatus !== undefined && (
            <div className="mb-4 flex items-center gap-2 text-sm text-slate-600">
              <span>{(raw.smsStatus as number) === 1 ? '✅' : '❌'}</span>
              <span>SMS {(raw.smsStatus as number) === 1 ? 'unterstützt' : 'nicht unterstützt'}</span>
            </div>
          )}

          {/* ── Top-up eligible ── */}
          <div className="mb-5 flex items-center gap-2 text-sm text-slate-600">
            <span>{tariff.is_top_up_eligible ? '✅' : 'ℹ️'}</span>
            <span>{tariff.is_top_up_eligible ? 'Aufladbar (Top-Up möglich)' : 'Keine Aufladung – neues Paket kaufen'}</span>
          </div>

          {/* ── Activation guide ── */}
          <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">📱 Aktivierung</p>
            <ol className="space-y-1 text-xs text-slate-600">
              <li>1. Kauf abschließen – QR-Code wird per E-Mail zugestellt</li>
              <li>2. <strong>iPhone:</strong> Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code scannen</li>
              <li>3. <strong>Android:</strong> Einstellungen → Netzwerk → SIM-Karten → eSIM hinzufügen</li>
              <li>4. Datenroaming aktivieren und eSIM als Datenkarte wählen</li>
              <li>5. Gültigkeit startet mit dem ersten Daten-Login</li>
            </ol>
          </div>

          {/* ── CTA ── */}
          <button
            onClick={() => setShowCheckout(true)}
            className="w-full rounded-2xl bg-brand-600 py-4 text-base font-bold text-white hover:bg-brand-700 active:scale-[0.98] transition-all shadow-lg"
          >
            Jetzt kaufen · {formatEur(tariff.sale_price_eur)}
          </button>
        </div>
      </div>
    </div>
  );
}
