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
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Banner */}
      <div className={`mb-8 rounded-2xl p-6 text-center ${allDone && failed.length === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <p className="mb-3 text-5xl">{allDone && failed.length === 0 ? '✅' : '⏳'}</p>
        <h1 className="mb-1 text-2xl font-bold text-slate-900">
          {allDone && failed.length === 0
            ? (completed.length > 1 ? t('op_ready_many', { count: completed.length }) : t('op_ready_one'))
            : t('op_provisioning_title')}
        </h1>
        <p className="text-sm text-slate-600">
          {allDone ? t('op_ready_sub') : t('op_provisioning_sub')}
        </p>
        {data?.totalPaid != null && data.totalPaid > 0 && (
          <p className="mt-2 text-sm font-semibold text-slate-700">{t('op_paid')}: {formatEur(data.totalPaid)}</p>
        )}
      </div>

      {/* Delivered eSIMs */}
      <div className="space-y-4">
        {completed.map((o) => <EsimDelivery key={o.id} esim={o} />)}

        {provisioning.map((o) => (
          <div key={o.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5">
            <svg className="h-5 w-5 animate-spin text-brand-600" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 00-8 8h4z" />
            </svg>
            <div>
              <p className="font-medium text-slate-800">{o.flag ?? '🌐'} {o.countryName}</p>
              <p className="text-xs text-slate-500">{t('op_provisioning_item')}</p>
            </div>
          </div>
        ))}

        {failed.map((o) => (
          <div key={o.id} className="rounded-2xl border border-red-200 bg-red-50 p-5">
            <p className="font-medium text-red-800">{o.flag ?? '🌐'} {o.countryName} – {t('op_failed_item')}</p>
            <p className="text-xs text-red-600 mt-1">{t('op_failed_sub')}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          {t('op_to_orders')}
        </Link>
        <Link href="/tariffs" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          {t('op_buy_more')}
        </Link>
      </div>
    </div>
  );
}
