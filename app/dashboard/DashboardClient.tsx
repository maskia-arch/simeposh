'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { formatEur, formatGb, formatCurrencyEuro } from '@/lib/utils';
import { formatPercent } from '@/lib/i18n/plural';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { countryCodeToSlug } from '@/lib/destinations-shared';
import { getEsimOverviewUrl } from '@/lib/url';
import { generateFeedbackToken } from '@/lib/feedback/token';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import type { EsimLifecycle } from '@/lib/esimaccess/client';
import { CustomerTicketsDashboard } from '@/components/CustomerTicketsDashboard';
import EsimCashDashboard from '@/components/EsimCashDashboard';
import { AccountSettings } from '@/components/AccountSettings';
import { PendingOrderActions } from '@/components/PendingOrderActions';

const LIFECYCLE_META: Record<EsimLifecycle, { key: TranslationKeys | null; cls: string }> = {
  new:     { key: 'life_new',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  in_use:  { key: 'life_in_use', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  used:    { key: 'life_used',   cls: 'bg-slate-200 text-slate-600' },
  unknown: { key: 'life_new',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
};

const STATUS_KEY: Record<string, TranslationKeys> = {
  completed: 'status_completed', paid: 'status_paid', provisioning: 'status_provisioning',
  pending: 'status_pending', failed: 'status_failed', refunded: 'status_refunded',
};

export interface OrderType {
  id:           string;
  status:       string;
  order_type:   string;
  amount_eur:   number;
  iccid:        string | null;
  short_url:    string | null;
  top_up_iccid: string | null;
  period_num:   number | null;
  esim_status:  string | null;
  esim_status_at?: string | null;
  created_at:   string;
  checkout_ref?: string | null;
  eligibility?: {
    allowed: boolean;
    reason: 'ok' | 'limit_reached' | 'not_supported';
    used: number;
    remaining: number;
    mode: 'data_and_validity' | 'validity_only' | 'none';
  } | null;
  tariffs: {
    id?: string;
    slug?: string | null;
    name: string;
    country_name: string;
    country_code?: string | null;
    data_gb: number | null;
    validity_days: number;
    flag_emoji: string | null;
    tariff_type: string | null;
  } | null;
}

export interface PopularDestination {
  code: string;
  name: string;
  slug: string;
  flag: string;
  minPrice: number;
}

interface DashboardClientProps {
  user: any;
  profile: any;
  orderList: OrderType[];
  pending: OrderType[];
  completed: OrderType[];
  allSessions: Array<{ id: string; order_ids: string[]; status: string }>;
  esimMap: Record<string, { iccid: string; topup_count: number }>;
  reviewedOrderIds: string[];
  cashAccount: any;
  cashTransactions: any[];
  popularDestinations: PopularDestination[];
  isAdmin: boolean;
  missingDiscountTariffs: any[];
  discountMinDaysSetting: string | null;
  defaultDiscountRuleSetting: string | null;
  initialTab: string;
  prefix: string;
  locale: string;
}

export function DashboardClient({
  user,
  profile,
  orderList,
  pending,
  completed,
  allSessions,
  esimMap,
  reviewedOrderIds: initialReviewed,
  cashAccount,
  cashTransactions,
  popularDestinations,
  isAdmin,
  missingDiscountTariffs,
  discountMinDaysSetting,
  defaultDiscountRuleSetting,
  initialTab,
  prefix,
  locale,
}: DashboardClientProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'esims' | 'cash' | 'tickets' | 'settings'>(
    initialTab === 'cash' ? 'cash' : initialTab === 'tickets' ? 'tickets' : initialTab === 'settings' ? 'settings' : 'esims'
  );

  const activeTabRef = useRef<HTMLButtonElement | null>(null);

  // Tab switching without full page reload: update state and URL pushState smoothly
  const handleTabChange = useCallback((tab: 'esims' | 'cash' | 'tickets' | 'settings') => {
    setActiveTab(tab);
    const newUrl = tab === 'esims' ? `${prefix}/dashboard` : `${prefix}/dashboard?tab=${tab}`;
    window.history.pushState({ tab }, '', newUrl);

    // Update document title dynamically in browser
    let metaTitle = t('dash_meta_esims');
    if (tab === 'cash') metaTitle = t('dash_meta_cash');
    else if (tab === 'tickets') metaTitle = t('dash_meta_tickets');
    else if (tab === 'settings') metaTitle = t('dash_meta_settings');
    document.title = `${metaTitle} | PureSim`;
  }, [prefix, t]);

  // Support browser back/forward buttons
  useEffect(() => {
    const onPopState = () => {
      const p = new URLSearchParams(window.location.search).get('tab');
      const nextTab = p === 'cash' ? 'cash' : p === 'tickets' ? 'tickets' : p === 'settings' ? 'settings' : 'esims';
      setActiveTab(nextTab);
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Smooth scroll active tab into view on narrow screens
  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeTab]);

  const reviewedOrderIdsSet = new Set(initialReviewed);

  // Single H1 determination per tab
  const tabH1 = activeTab === 'cash'
    ? t('dash_h1_cash')
    : activeTab === 'tickets'
    ? t('dash_h1_tickets')
    : activeTab === 'settings'
    ? t('dash_h1_settings')
    : t('dash_h1_esims');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-12 pb-28 sm:pb-16">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{tabH1}</h1>
          <p className="text-slate-600 text-sm mt-1">{user.email}</p>
        </div>
        <Link
          href={`${prefix}/tariffs`}
          className="rounded-xl bg-brand-600 px-5 min-h-[44px] inline-flex items-center justify-center text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-2xs self-start sm:self-auto cursor-pointer"
        >
          {t('dash_new_esim')}
        </Link>
      </div>

      {/* Admin Warning: Missing Discount Rules */}
      {isAdmin && missingDiscountTariffs.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm text-red-900" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0" aria-hidden="true">⚠️</span>
            <div className="space-y-1.5 flex-1 min-w-0">
              <h3 className="font-extrabold text-base text-red-800">
                Admin-Warnung: {missingDiscountTariffs.length} aktive Unlimited-Tarife ohne gültige Rabattregel!
              </h3>
              <p className="text-xs text-red-700 leading-relaxed">
                Diese Tarife haben keinen <code className="font-mono bg-red-100 px-1 py-0.5 rounded text-red-800">discount_rule_code</code> zugewiesen oder die hinterlegte Rabattregel besitzt keine aktiven Staffelstufen. Kunden sehen für diese Länder keinen Staffelrabatt.
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5 pt-1">
                {Array.from(new Set(missingDiscountTariffs.map((t) => `${t.country_name} (${t.country_code})`))).map((c) => (
                  <span key={c} className="inline-flex items-center rounded-md bg-white border border-red-200 px-2 py-0.5 text-xs font-semibold text-red-800 shadow-2xs">
                    {c}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Overview */}
      {isAdmin && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span aria-hidden="true">⚙️</span> Unlimited-Staffelrabatt Konfiguration (system_settings)
            </h3>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Admin Only</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-slate-700 block mb-1">Minimale Rabattlaufzeit (unlimited_discount_min_days):</span>
              <p className="text-sm font-extrabold text-brand-700">{discountMinDaysSetting ?? '4'} Tage</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Bei 1–{Math.max(1, (Number(discountMinDaysSetting) || 4) - 1)} Tagen gilt kein Rabatt. Staffel greift ab Tag {discountMinDaysSetting ?? '4'}.</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-slate-700 block mb-1">Standard-Rabattregel (unlimited_default_discount_rule):</span>
              <p className="text-sm font-mono font-extrabold text-slate-800">{defaultDiscountRuleSetting || 'UNLIMITED_PLAN_DISC'}</p>
              <p className="text-[11px] text-slate-600 mt-0.5">Wird beim Produkt-Sync für Tarife ohne Regel aus der Datenbank zugewiesen.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats - Contrast >= 4.5:1 with accessible SVG icons */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
          <div className="flex justify-center mb-1 text-slate-400">
            <svg className="w-5 h-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-brand-700">{orderList.length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">{t('dash_orders')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
          <div className="flex justify-center mb-1 text-green-500">
            <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700">{completed.length}</p>
          <p className="text-xs font-semibold text-slate-600 mt-1">{t('dash_active')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 text-center shadow-2xs">
          <div className="flex justify-center mb-1 text-slate-500">
            <svg className="w-5 h-5 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-slate-800">
            {formatCurrencyEuro(completed.reduce((s, o) => s + (o.amount_eur ?? 0), 0), locale)}
          </p>
          <p className="text-xs font-semibold text-slate-600 mt-1">{t('dash_total')}</p>
        </div>
      </div>

      {/* Horizontally scrollable accessible Tabs (touch targets >= 44px) */}
      <div className="border-b border-slate-200 mb-6">
        <nav
          role="tablist"
          aria-label="Dashboard Navigation"
          className="flex overflow-x-auto scrollbar-none gap-2 sm:gap-6 -mx-4 sm:mx-0 px-4 sm:px-0"
        >
          {/* Meine eSIMs */}
          <button
            ref={activeTab === 'esims' ? activeTabRef : null}
            role="tab"
            aria-selected={activeTab === 'esims'}
            onClick={() => handleTabChange('esims')}
            className={`min-h-[44px] flex items-center gap-2 px-3 sm:px-1 py-2.5 font-semibold text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === 'esims'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>{t('dash_tab_esims')}</span>
          </button>

          {/* eSIM Cash */}
          <button
            ref={activeTab === 'cash' ? activeTabRef : null}
            role="tab"
            aria-selected={activeTab === 'cash'}
            onClick={() => handleTabChange('cash')}
            className={`min-h-[44px] flex items-center gap-2 px-3 sm:px-1 py-2.5 font-semibold text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === 'cash'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            <span>{t('dash_tab_cash')}</span>
            {cashAccount && Number(cashAccount.balance_eur) > 0 && (
              <span className="bg-amber-100 text-amber-900 text-xs px-2 py-0.5 rounded-full font-bold">
                {formatCurrencyEuro(Number(cashAccount.balance_eur), locale)}
              </span>
            )}
          </button>

          {/* Support */}
          <button
            ref={activeTab === 'tickets' ? activeTabRef : null}
            role="tab"
            aria-selected={activeTab === 'tickets'}
            onClick={() => handleTabChange('tickets')}
            className={`min-h-[44px] flex items-center gap-2 px-3 sm:px-1 py-2.5 font-semibold text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === 'tickets'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
            <span>{t('dash_tab_tickets')}</span>
          </button>

          {/* Einstellungen */}
          <button
            ref={activeTab === 'settings' ? activeTabRef : null}
            role="tab"
            aria-selected={activeTab === 'settings'}
            onClick={() => handleTabChange('settings')}
            className={`min-h-[44px] flex items-center gap-2 px-3 sm:px-1 py-2.5 font-semibold text-sm whitespace-nowrap border-b-2 -mb-px transition-colors cursor-pointer ${
              activeTab === 'settings'
                ? 'border-brand-600 text-brand-600 font-bold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{t('dash_tab_settings')}</span>
          </button>
        </nav>
      </div>

      {/* Tab Panels */}
      {activeTab === 'esims' && (
        <div role="tabpanel" aria-labelledby="tab-esims">
          {/* Pending orders / checkouts */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-slate-800 mb-3">{t('dash_pending')}</h2>
              <div className="space-y-3">
                {pending.map((order) => {
                  const session = allSessions.find((s) => s.order_ids?.includes(order.id));
                  return (
                    <DashboardOrderRow
                      key={order.id}
                      order={order}
                      t={t}
                      sessionId={session?.id}
                      userEmail={user.email}
                      prefix={prefix}
                      locale={locale}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Completed eSIMs List or Empty State */}
          {orderList.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 sm:p-12 text-center bg-white shadow-2xs">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">{t('dash_empty')}</h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-sm mx-auto">
                {t('dash_empty_cta')}
              </p>

              {/* 3 Popular Destinations with "ab {Preis}" */}
              <div className="mt-6 mb-6">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3">
                  {t('dash_empty_popular_title')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {popularDestinations.map((dest) => (
                    <Link
                      key={dest.code}
                      href={`${prefix}/esim/${dest.slug}`}
                      className="flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-brand-300 hover:shadow-xs transition-all min-h-[44px] group text-left cursor-pointer"
                    >
                      <span className="text-2xl shrink-0" aria-hidden="true">{dest.flag}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate group-hover:text-brand-600 transition-colors">
                          {dest.name}
                        </p>
                        <p className="text-xs text-slate-500 font-medium">
                          {t('dash_empty_popular_from')} {formatCurrencyEuro(dest.minPrice, locale)}
                        </p>
                      </div>
                      <span className="text-slate-400 group-hover:text-brand-600 transition-colors text-sm font-bold" aria-hidden="true">→</span>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Unlimited Builder Link */}
              <div className="pt-2">
                <Link
                  href={`${prefix}/unlimited`}
                  className="inline-flex items-center justify-center min-h-[44px] text-xs sm:text-sm font-bold text-brand-700 hover:text-brand-900 hover:underline px-4 py-2 cursor-pointer"
                >
                  {t('dash_empty_builder_cta')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {completed.map((order) => {
                const session = allSessions.find((s) => s.order_ids?.includes(order.id));
                const txId = session?.id ?? (order as any).checkout_ref ?? order.id;
                const overviewUrl = order.iccid ? getEsimOverviewUrl(txId, order.iccid) : null;
                const esimRecord = order.iccid ? (esimMap[order.iccid] ?? { iccid: order.iccid, topup_count: 0 }) : null;

                return (
                  <DashboardOrderRow
                    key={order.id}
                    order={order}
                    t={t}
                    showEsim
                    overviewUrl={overviewUrl}
                    isReviewed={reviewedOrderIdsSet.has(order.id)}
                    userEmail={user.email}
                    esimRecord={esimRecord}
                    prefix={prefix}
                    locale={locale}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Support Tab */}
      {activeTab === 'tickets' && user.email && (
        <div role="tabpanel" aria-labelledby="tab-tickets">
          <CustomerTicketsDashboard userEmail={user.email} />
        </div>
      )}

      {/* eSIM Cash Tab */}
      {activeTab === 'cash' && cashAccount && (
        <div role="tabpanel" aria-labelledby="tab-cash">
          <EsimCashDashboard account={cashAccount} transactions={cashTransactions} />
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <div role="tabpanel" aria-labelledby="tab-settings">
          <AccountSettings user={user} profile={profile} />
        </div>
      )}
    </div>
  );
}

function statusBadge(status: string, t: any) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700', paid: 'bg-amber-100 text-amber-700',
    provisioning: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-600',
    failed: 'bg-red-100 text-red-700', refunded: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}
    </span>
  );
}

function DashboardOrderRow({
  order,
  t,
  showEsim,
  sessionId,
  overviewUrl,
  isReviewed,
  userEmail,
  esimRecord,
  prefix = '',
  locale = 'de',
}: {
  order: OrderType;
  t: any;
  showEsim?: boolean;
  sessionId?: string;
  overviewUrl?: string | null;
  isReviewed?: boolean;
  userEmail?: string | null;
  esimRecord?: { iccid: string; topup_count: number } | null;
  prefix?: string;
  locale?: string;
}) {
  const tariff = order.tariffs;
  const lifecycle = (order.esim_status as EsimLifecycle | null) ?? 'unknown';
  const lifeMeta = LIFECYCLE_META[lifecycle] ?? LIFECYCLE_META.unknown;
  const lifeLabel = lifeMeta.key ? t(lifeMeta.key) : '—';

  // Calculate top-up eligibility strictly using single source of truth (precomputed on server)
  const eligibility = (showEsim && order.iccid) ? (order.eligibility ?? null) : null;

  const used = eligibility?.used ?? 0;
  const remaining = eligibility?.remaining ?? 9;
  const isLimitReached = eligibility?.reason === 'limit_reached' || used >= 9;
  const isNotSupported = eligibility?.reason === 'not_supported';
  const isWarning = used >= 7;

  // Resolve country destination URL for "Neue eSIM bestellen" / "Neue eSIM kaufen"
  const countryCode = tariff?.country_code;
  const countrySlug = countryCode ? (countryCodeToSlug(countryCode) || countryCode.toLowerCase()) : null;
  const originCountryUrl = countrySlug ? `${prefix}/esim/${countrySlug}` : `${prefix}/tariffs`;

  const valueText = t('topup_limit_used', { used });
  let remainingText = '';
  if (remaining === 0) {
    remainingText = t('topup_limit_remaining_none');
  } else if (remaining === 1) {
    remainingText = t('topup_limit_remaining_singular');
  } else {
    remainingText = t('topup_limit_remaining', { remaining });
  }

  const formattedDate = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(order.created_at));

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
      {/* Top order summary */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-2xl" aria-hidden="true">{tariff?.flag_emoji ?? '🌐'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-800 text-sm truncate">
            {tariff?.country_name ?? 'Unbekannt'}
            {order.order_type === 'top_up' && (
              <span className="ml-2 text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">Top-Up</span>
            )}
          </p>
          <p className="text-xs text-slate-500 mt-0.5">
            {tariff ? `${formatGb(tariff.data_gb)} · ${formatDaysWithUnit(order.period_num ?? tariff.validity_days, locale)}` : ''}
            {' · '}{formattedDate}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showEsim && order.iccid && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${lifeMeta.cls}`} title="eSIM">
              {lifeLabel}
            </span>
          )}
          {statusBadge(order.status, t)}
          <span className="font-bold text-slate-800 text-sm">
            {formatCurrencyEuro(order.amount_eur, locale)}
          </span>
        </div>
      </div>

      {/* eSIM Details & 9-Segment Progressbar */}
      {showEsim && order.status === 'completed' && order.iccid && !isNotSupported && (
        <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className={`font-bold ${isWarning ? 'text-amber-800' : 'text-slate-800'}`}>
              {valueText}
            </span>
            <span className={`text-[11px] font-medium ${isWarning ? 'text-amber-700' : 'text-slate-500'}`}>
              {remainingText}
            </span>
          </div>

          {/* 9 Segments */}
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={9}
            aria-valuenow={used}
            aria-valuetext={valueText}
            className="flex items-center gap-1 w-full"
          >
            {Array.from({ length: 9 }).map((_, idx) => {
              const isFilled = idx < used;
              let segmentBg = 'bg-slate-200';
              if (isFilled) {
                segmentBg = isWarning ? 'bg-amber-500' : 'bg-brand-600';
              }
              return (
                <div
                  key={idx}
                  className={`h-2 flex-1 rounded-full transition-all duration-300 ${segmentBg}`}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 9/9 Limit Reached Info Box */}
      {showEsim && order.status === 'completed' && isLimitReached && (
        <div className="bg-amber-50 border-t border-amber-200 p-4 space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="text-lg shrink-0" aria-hidden="true">⚠️</span>
            <p className="text-xs text-amber-900 leading-relaxed font-medium">
              {t('topup_limit_reached_box')}
            </p>
          </div>
          <div>
            <Link
              href={originCountryUrl}
              className="btn-primary min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center font-bold px-4 py-2 text-xs cursor-pointer"
            >
              {t('topup_order_new_esim')}
            </Link>
          </div>
        </div>
      )}

      {/* Actions footer (touch targets >= 44px) */}
      {showEsim && order.status === 'completed' && (
        <div className="border-t border-slate-100 px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {order.iccid ? (
            <div className="flex items-center gap-1.5 py-1">
              <span className="text-xs text-slate-400">ICCID:</span>
              <span className="text-xs font-mono text-slate-600">{order.iccid}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 py-1">
              <span className="text-xs text-slate-400">Bestellung: #{order.id.slice(0, 8)}</span>
            </div>
          )}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            {isReviewed ? (
              <span className="min-h-[44px] inline-flex items-center rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700 gap-1">
                <span>✓</span> Bewertet
              </span>
            ) : (
              <Link
                href={`/reviews/new?orderId=${order.id}&token=${generateFeedbackToken(order.id, userEmail)}`}
                className="min-h-[44px] inline-flex items-center rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/80 border border-amber-300 px-3 py-1.5 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs gap-1 cursor-pointer"
                title="Jetzt bewerten und 1% eSIM Cash Belohnung sichern"
              >
                <span>🎁</span> Bewerten (+1% Cash)
              </Link>
            )}

            <Link
              href={`/dashboard/orders/${order.id}`}
              className="min-h-[44px] inline-flex items-center px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-brand-700 transition-colors cursor-pointer"
            >
              {t('dash_details')}
            </Link>

            {/* Reload button / badges */}
            {order.iccid && (
              <>
                {isNotSupported ? (
                  <div className="inline-flex items-center gap-2 min-h-[44px]">
                    <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-500">
                      {t('topup_not_supported_badge')}
                    </span>
                    <Link
                      href={originCountryUrl}
                      className="min-h-[44px] inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-800 underline underline-offset-2 px-1 cursor-pointer"
                    >
                      {t('topup_buy_new_esim')}
                    </Link>
                  </div>
                ) : isLimitReached ? (
                  <button
                    disabled
                    aria-disabled="true"
                    className="min-h-[44px] inline-flex items-center rounded-lg bg-slate-100 border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60 pointer-events-none"
                  >
                    {t('dash_topup')}
                  </button>
                ) : (
                  <Link
                    href={`${prefix}/topup?orderId=${order.id}&iccid=${encodeURIComponent(order.iccid)}`}
                    className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-brand-50 border border-brand-200 px-3.5 py-1.5 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors cursor-pointer"
                  >
                    {t('dash_topup')}
                  </Link>
                )}
              </>
            )}

            {overviewUrl && (
              <a
                href={overviewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[44px] inline-flex items-center justify-center rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 transition-colors cursor-pointer"
              >
                Installieren
              </a>
            )}
          </div>
        </div>
      )}

      {sessionId && (
        <div className="border-t border-slate-100 px-4 pb-4">
          <PendingOrderActions sessionId={sessionId} />
        </div>
      )}
    </div>
  );
}
