'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { EsimDelivery, type DeliveredEsim } from '@/components/EsimDelivery';
import { TopUpDelivery } from '@/components/TopUpDelivery';
import { CountryFlag } from '@/components/CountryFlag';
import { formatEur } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';
import { CheckoutFeedbackWidget } from '@/components/CheckoutFeedbackWidget';

interface OrderItem extends DeliveredEsim {
  status: string;
  orderType?: string;
  topUpIccid?: string | null;
  tariffName?: string | null;
  amountEur?: number | null;
}

interface StatusResp {
  found:          boolean;
  allDone?:       boolean;
  isPaid?:        boolean;
  paymentStatus?: string;
  totalPaid?:     number;
  orders:         OrderItem[];
}

export function OrderView({ orderRef }: { orderRef: string }) {
  const { t, locale } = useTranslation();
  const [data, setData]   = useState<StatusResp | null>(null);
  const [tries, setTries] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | 'all'>('all');
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

  const orders       = data?.orders ?? [];
  const completed    = orders.filter((o) => o.status === 'completed');
  const topUps       = completed.filter((o) => o.orderType === 'top_up');
  const newEsims     = completed.filter((o) => o.orderType !== 'top_up');
  const isAllTopUp   = completed.length > 0 && newEsims.length === 0;
  const isAllNew     = completed.length > 0 && topUps.length === 0;
  const isMixed      = newEsims.length > 0 && topUps.length > 0;

  const provisioning = orders.filter((o) => o.status === 'paid' || o.status === 'provisioning');
  const failed       = orders.filter((o) => o.status === 'failed');
  const allDone      = data?.allDone ?? false;
  const isPaid       = data?.isPaid ?? orders.some(o => o.status === 'paid' || o.status === 'completed' || o.status === 'provisioning');
  const isExpired    = data?.paymentStatus === 'expired' || data?.paymentStatus === 'cancelled' || (orders.length > 0 && orders.every(o => o.status === 'expired' || o.status === 'cancelled'));
  const isPending    = !isPaid && !isExpired && orders.some(o => o.status === 'pending');

  // Clear cart upon successful order completion so badge resets to 0
  useEffect(() => {
    if (isPaid || allDone || completed.length > 0) {
      try {
        localStorage.removeItem('esim_cart');
        window.dispatchEvent(new Event('cart-updated'));
      } catch { /* ignore */ }
    }
  }, [isPaid, allDone, completed.length]);

  const getBannerTitle = () => {
    if (!allDone || failed.length > 0) return t('op_provisioning_title');
    if (isAllTopUp) {
      return topUps.length > 1
        ? (t('op_topup_ready_many', { count: topUps.length }) || `${topUps.length} eSIMs erfolgreich aufgeladen!`)
        : (t('op_topup_ready_one') || 'eSIM erfolgreich aufgeladen!');
    }
    if (isMixed) {
      return t('op_mixed_ready_title') || 'Bestellung erfolgreich bereitgestellt!';
    }
    return completed.length > 1
      ? t('op_ready_many', { count: completed.length })
      : t('op_ready_one');
  };

  const getBannerSub = () => {
    if (!allDone || failed.length > 0) return t('op_provisioning_sub');
    if (isAllTopUp) {
      return t('op_topup_ready_sub') || 'Das gebuchte Datenpaket wurde direkt auf deiner bestehenden eSIM gutgeschrieben. Kein neuer QR-Code nötig!';
    }
    if (isMixed) {
      return t('op_mixed_ready_sub') || 'Deine neuen eSIMs sind bereit zur Installation und deine bestehenden eSIMs wurden aufgeladen.';
    }
    return t('op_ready_sub');
  };

  // Not found yet (webhook/redirect race) → keep waiting a bit
  if (data && !data.found) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
          <svg className="h-7 w-7 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
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
      {isExpired ? (
        <div className="mb-8 rounded-3xl p-6 text-center border shadow-lg bg-gradient-to-b from-rose-50/80 via-white to-rose-50/30 border-rose-200/80 shadow-rose-500/5 min-h-[170px]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-rose-100">
            <svg className="h-7 w-7 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">
            Zahlungszeit abgelaufen
          </h1>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mb-4">
            Für diese Bestellung wurde innerhalb des Zeitfensters kein Zahlungseingang festgestellt. Es wurde kein Betrag abgebucht.
          </p>
          <Link href="/tariffs" className="inline-block rounded-xl bg-brand-600 px-6 py-2.5 text-xs font-extrabold text-white hover:bg-brand-700 transition-colors shadow-sm">
            Neuen Tarif wählen →
          </Link>
        </div>
      ) : isPending ? (
        <div className="mb-8 rounded-3xl p-6 text-center border shadow-lg bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 border-amber-200/80 shadow-amber-500/5 min-h-[170px]">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100">
            <svg className="h-7 w-7 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">
            Warte auf Zahlungseingang...
          </h1>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed">
            Deine Bestellung ist eingegangen. Sobald deine Zahlung bestätigt wird, wird deine eSIM automatisch eingerichtet.
          </p>
        </div>
      ) : (
        <div className={`mb-8 rounded-3xl p-6 text-center border shadow-lg transition-all min-h-[170px] ${
          allDone && failed.length === 0
            ? 'bg-gradient-to-b from-emerald-50/80 via-white to-emerald-50/30 border-emerald-200/80 shadow-emerald-500/5'
            : 'bg-gradient-to-b from-amber-50/80 via-white to-amber-50/30 border-amber-200/80 shadow-amber-500/5'
        }`}>
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md border border-slate-100">
            {allDone && failed.length === 0 ? (
              <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="h-7 w-7 text-amber-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
          </div>
          <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-900">
            {getBannerTitle()}
          </h1>
          <p className="text-xs font-mono font-bold text-slate-500 mt-1">
            {t('order_number_label')}: #{orderRef.slice(0, 8)}
          </p>
          <p className="text-xs text-slate-600 max-w-lg mx-auto leading-relaxed mt-1">
            {getBannerSub()}
          </p>
          {data?.totalPaid != null && data.totalPaid > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              <span>{t('op_paid')}:</span>
              <span className="font-extrabold text-brand-600">{formatEur(data.totalPaid, locale)}</span>
            </div>
          )}
        </div>
      )}

      {/* Multi-eSIM Quick Filter Bar for bulk orders */}
      {completed.length > 1 && (
        <div className="mb-6 rounded-2xl bg-slate-100/80 border border-slate-200 p-2 flex flex-wrap items-center gap-1.5 shadow-sm">
          <span className="px-2 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 shrink-0">
            {t('order_bulk_title', { count: completed.length })}
          </span>
          <button
            onClick={() => setSelectedIndex('all')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              selectedIndex === 'all'
                ? 'bg-brand-600 text-white shadow-sm'
                : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
            }`}
          >
            {t('order_show_all', { count: completed.length })}
          </button>
          {completed.map((o, idx) => (
            <button
              key={o.id}
              onClick={() => setSelectedIndex(idx)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedIndex === idx
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-200/80 border border-slate-200/60'
              }`}
            >
              <CountryFlag countryCode={o.flag || o.countryName} countryName={o.countryName} size={18} className="shrink-0" />
              <span>
                #{idx + 1} {o.countryName} {o.orderType === 'top_up' ? '(Refill)' : ''}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Delivered Items */}
      <div className="space-y-6">
        {selectedIndex !== 'all' ? (
          completed[selectedIndex] && (
            completed[selectedIndex].orderType === 'top_up' ? (
              <TopUpDelivery
                key={completed[selectedIndex].id}
                item={completed[selectedIndex]}
                index={selectedIndex + 1}
                totalCount={completed.length}
              />
            ) : (
              <EsimDelivery
                key={completed[selectedIndex].id}
                esim={completed[selectedIndex]}
                index={selectedIndex + 1}
                totalCount={completed.length}
              />
            )
          )
        ) : isMixed ? (
          <div className="space-y-8">
            {/* 1. New eSIMs Section */}
            {newEsims.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="text-sm font-extrabold text-slate-800">
                    {t('op_section_new_esims') || '📱 Neue eSIMs'} ({newEsims.length})
                  </span>
                </div>
                <div className="space-y-6">
                  {newEsims.map((o, idx) => (
                    <EsimDelivery key={o.id} esim={o} index={idx + 1} totalCount={newEsims.length} />
                  ))}
                </div>
              </div>
            )}

            {/* 2. Top-Ups Section */}
            {topUps.length > 0 && (
              <div className="space-y-4 pt-2">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <span className="text-sm font-extrabold text-slate-800">
                    {t('op_section_topups') || '🔄 Aufgeladene eSIMs'} ({topUps.length})
                  </span>
                </div>
                <div className="space-y-6">
                  {topUps.map((o, idx) => (
                    <TopUpDelivery key={o.id} item={o} index={idx + 1} totalCount={topUps.length} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : isAllTopUp ? (
          <div className="space-y-6">
            {topUps.map((o, idx) => (
              <TopUpDelivery key={o.id} item={o} index={idx + 1} totalCount={topUps.length} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {newEsims.map((o, idx) => (
              <EsimDelivery key={o.id} esim={o} index={idx + 1} totalCount={newEsims.length} />
            ))}
          </div>
        )}

        {provisioning.map((o) => (
          <div key={o.id} className="flex items-center gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-md">
            <svg className="h-6 w-6 animate-spin text-brand-600 shrink-0" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <div>
              <p className="font-extrabold text-slate-800">{o.flag ?? '🌐'} {o.countryName} {o.orderType === 'top_up' ? '(Refill)' : ''}</p>
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

      {/* Direct In-Checkout / Post-Purchase Feedback Widget */}
      {isPaid && (
        <CheckoutFeedbackWidget orderRef={orderRef} className="mt-8" />
      )}

      <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-center">
        <p className="text-xs text-slate-600 font-medium mb-2">{t('order_support_q')}</p>
        <button
          type="button"
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('open-ticket-modal', {
                detail: {
                  invoiceId: orderRef,
                  subject: `${t('order_support_q')} / Ref: ${orderRef}`,
                  category: 'general',
                }
              }));
            } catch (err) {
              console.error('Open ticket error:', err);
            }
          }}
          className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-white px-4 py-2.5 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors shadow-xs cursor-pointer"
        >
          {t('order_support_btn')}
        </button>
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/dashboard" className="min-h-[44px] inline-flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-3.5 text-xs font-extrabold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all active:scale-95">
          {t('op_to_orders')}
        </Link>
        <Link href="/tariffs" className="min-h-[44px] inline-flex items-center justify-center rounded-2xl border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all active:scale-95">
          {t('op_buy_more')}
        </Link>
      </div>
    </div>
  );
}
