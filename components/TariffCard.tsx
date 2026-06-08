'use client';

import { formatEur, formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { useTranslation } from '@/lib/i18n';
import { CountryFlag } from '@/components/CountryFlag';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface OperatorEntry {
  operatorName?: string;
  networkType?:  string;
}

function getOperators(tariff: Tariff): OperatorEntry[] {
  const raw = tariff.raw_data as Record<string, unknown> | null;
  const ops = raw?.operatorList;
  return Array.isArray(ops) ? (ops as OperatorEntry[]).slice(0, 3) : [];
}

function bestNetwork(ops: OperatorEntry[]): string | null {
  const types = ops.map((o) => (o.networkType ?? '').toUpperCase());
  if (types.some((t) => t.includes('5G')))                       return '5G';
  if (types.some((t) => t.includes('4G') || t.includes('LTE')))  return '4G';
  if (types.some((t) => t.includes('3G')))                       return '3G';
  return null;
}

const NET_COLOR: Record<string, string> = {
  '5G': 'bg-violet-100 text-violet-700',
  '4G': 'bg-blue-100 text-blue-700',
  '3G': 'bg-slate-100 text-slate-600',
};

const TYPE_BADGE: Record<string, { icon: string; labelKey: 'badge_travel'|'badge_eco'|'badge_pro'; cls: string; descKey: 'type_travel_desc'|'type_eco_desc'|'type_pro_desc' }> = {
  travel:        { icon: '✈️', labelKey: 'badge_travel', descKey: 'type_travel_desc', cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  unlimited_eco: { icon: '♾️', labelKey: 'badge_eco',    descKey: 'type_eco_desc',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  unlimited_pro: { icon: '⚡', labelKey: 'badge_pro',    descKey: 'type_pro_desc',    cls: 'bg-violet-50 text-violet-700 border-violet-200' },
};

interface TariffCardProps {
  tariff:      Tariff;
  onBuy:       (tariff: Tariff) => void;
  onDetail?:   (tariff: Tariff) => void;
  loading?:    boolean;
}

export function TariffCard({ tariff, onBuy, onDetail, loading }: TariffCardProps) {
  const { t }   = useTranslation();
  const badge   = tariff.tariff_type ? TYPE_BADGE[tariff.tariff_type] : null;
  const ops     = getOperators(tariff);
  const network = bestNetwork(ops);
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;

  return (
    <div
      className="group relative flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:border-brand-300 hover:shadow-md overflow-hidden cursor-pointer"
      onClick={() => onDetail?.(tariff)}
    >
      {/* ── Type colour strip ── */}
      <div className={`h-1 w-full ${
        tariff.tariff_type === 'unlimited_pro' ? 'bg-gradient-to-r from-violet-500 to-purple-400' :
        tariff.tariff_type === 'unlimited_eco' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' :
        'bg-gradient-to-r from-brand-500 to-brand-400'
      }`} />

      <div className="p-5 flex flex-col flex-1">

        {/* ── Flag + Country ── */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <CountryFlag countryCode={tariff.country_code} countryName={tariff.country_name} size={40} />
            <div>
              <p className="font-bold text-slate-800 leading-tight">{tariff.country_name}</p>
              {tariff.region && <p className="text-xs text-slate-400 mt-0.5">{tariff.region}</p>}
            </div>
          </div>

          {/* Type badge top-right */}
          {badge && (
            <span
              title={t(badge.descKey)}
              className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${badge.cls}`}
            >
              {badge.icon} {t(badge.labelKey)}
            </span>
          )}
        </div>

        {/* ── Promo label ── */}
        {tariff.label && (
          <div className="mb-2">
            <span className="inline-flex items-center rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
              🏷️ {tariff.label}
            </span>
          </div>
        )}

        {/* ── Specs ── */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl bg-brand-50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-brand-700 leading-tight">
              {isUnlimited ? '∞' : formatGb(tariff.data_gb)}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t('card_data')}</p>
            {isUnlimited && tariff.data_gb && Number(tariff.data_gb) > 0 && (
              <p className="text-[10px] text-brand-500">{tariff.data_gb} GB/Tag</p>
            )}
          </div>
          <div className="rounded-xl bg-slate-50 px-3 py-2.5 text-center">
            <p className="text-lg font-bold text-slate-700 leading-tight">
              {tariff.validity_days}<span className="text-sm">{t('card_days')}</span>
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{t('card_validity')}</p>
          </div>
        </div>

        {/* ── Speed note ── */}
        {tariff.tariff_type === 'unlimited_eco' && (
          <p className="mb-2 text-xs text-emerald-700 bg-emerald-50 rounded-lg px-2.5 py-1 leading-tight">
            ♾️ Nach Limit: 512 kbps
          </p>
        )}
        {tariff.tariff_type === 'unlimited_pro' && (
          <p className="mb-2 text-xs text-violet-700 bg-violet-50 rounded-lg px-2.5 py-1 leading-tight">
            ⚡ Nach Limit: ≥ 1 Mbps
          </p>
        )}

        {/* ── Operators + network badge ── */}
        {(ops.length > 0 || network) && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5 min-h-[22px]">
            {network && (
              <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${NET_COLOR[network] ?? ''}`}>
                {network}
              </span>
            )}
            {ops.length > 0 && (
              <span className="text-[11px] text-slate-400 truncate">
                📡 {ops.map((o) => o.operatorName).filter(Boolean).join(' · ')}
              </span>
            )}
          </div>
        )}

        {/* ── Price + CTA ── */}
        <div className="mt-auto flex items-center justify-between pt-3 border-t border-slate-100">
          <p className="text-xl font-extrabold text-slate-900">
            {formatEur(tariff.sale_price_eur)}
          </p>
          <div className="flex gap-2">
            {onDetail && (
              <button
                onClick={(e) => { e.stopPropagation(); onDetail(tariff); }}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                title="Details"
              >
                ℹ️
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onBuy(tariff); }}
              disabled={loading}
              className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 active:scale-95 disabled:opacity-60"
            >
              {loading ? t('card_loading') : t('card_buy')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
