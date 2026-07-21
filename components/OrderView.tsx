'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { EsimDelivery, type DeliveredEsim } from '@/components/EsimDelivery';
import { formatEur } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

interface OrderItem extends DeliveredEsim {
  status: string;
}

interface StatusResp {
  found:     boolean;
  allDone?:  boolean;
  totalPaid?: number;
  orders:    OrderItem[];
}

export function OrderView({ orderRef }: { orderRef: string }) {
  const { t } = useTranslation();
  const [data, setData]   = useState<StatusResp | null>(null);
  const [tries, setTries] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/order/status?ref=${encodeURIComponent(orderRef)}`, { cache: 'no-store' });
      const json = await res.json() as StatusResp;
      setData(json);
      if (json.allDone && pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    } catch { /* keep polling */ }
    setTries((t) => t + 1);
  }, [orderRef]);

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 4000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [fetchStatus]);

  const orders     = data?.orders ?? [];
  const completed  = orders.filter((o) => o.status === 'completed');
  const provisioning = orders.filter((o) => o.status !== 'completed' && o.status !== 'failed');
  const failed     = orders.filter((o) => o.status === 'failed');
  const allDone    = data?.allDone ?? false;

  // Not found yet (webhook/redirect race) → keep waiting a bit
  if (data && !data.found) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <p className="mb-4 text-5xl">⏳</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{t('op_processing_title')}</h1>
        <p className="text-slate-500">{t('op_processing_sub')}</p>
        {tries > 8 && (
          <Link href="/dashboard" className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700">
            {t('op_to_orders')}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 md:py-16">
      {/* Top Banner */}
      <div className={`mb-8 rounded-3xl p-6 text-center border shadow-lg transition-all ${
        allDone && failed.length === 0
          ? 'bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200/80 shadow-emerald-500/5'
          : 'bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 border-amber-200/80 shadow-amber-500/5'
      }`}>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100">
          <span className="text-3xl">{allDone && failed.length === 0 ? '✨' : '⏳'}</span>
        </div>
        <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">
          {allDone && failed.length === 0
            ? (completed.length > 1 ? t('op_ready_many', { count: completed.length }) : t('op_ready_one'))
            : t('op_provisioning_title')}
        </h1>
        <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
          {allDone ? t('op_ready_sub') : t('op_provisioning_sub')}
        </p>
        {data?.totalPaid != null && data.totalPaid > 0 && (
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
            <span>{t('op_paid')}:</span>
            <span className="font-extrabold text-brand-600">{formatEur(data.totalPaid)}</span>
          </div>
        )}
      </div>

      {/* Delivered eSIMs */}
      <div className="space-y-6">
        {completed.map((o) => <EsimDelivery key={o.id} esim={o} />)}

        {provisioning.map((o) => (
          <div key={o.id} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <svg className="h-6 w-6 animate-spin text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <div>
              <p className="font-extrabold text-slate-800">{o.flag ?? '🌐'} {o.countryName}</p>
              <p className="text-xs text-slate-500 mt-0.5">{t('op_provisioning_item')}</p>
            </div>
          </div>
        ))}

        {failed.map((o) => (
          <div key={o.id} className="rounded-3xl border border-red-200 bg-red-50/80 p-6 shadow-sm">
            <p className="font-bold text-red-800">{o.flag ?? '🌐'} {o.countryName} – {t('op_failed_item')}</p>
            <p className="text-xs text-red-600 mt-1">{t('op_failed_sub')}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-95">
          {t('op_to_orders')}
        </Link>
        <Link href="/tariffs" className="rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95">
          {t('op_buy_more')}
        </Link>
      </div>
    </div>
  );
}
