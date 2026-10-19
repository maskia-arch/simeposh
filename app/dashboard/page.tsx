import type { Metadata }      from 'next';
import { redirect }            from 'next/navigation';
import Link                    from 'next/link';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';
import { claimGuestOrders, resolveCustomer } from '@/lib/customers';
import { queryEsimLifecycle, type EsimLifecycle } from '@/lib/esimaccess/client';
import { getServerT, getServerLocale, type ServerT } from '@/lib/i18n/server';
import type { TranslationKeys } from '@/lib/i18n/translations/en';
import { resolveEsimCashAccount } from '@/lib/cashback';
import EsimCashDashboard from '@/components/EsimCashDashboard';
import { CustomerTicketsDashboard } from '@/components/CustomerTicketsDashboard';
import { PendingOrderActions } from '@/components/PendingOrderActions';
import { AccountSettings } from '@/components/AccountSettings';
import { getEsimOverviewUrl } from '@/lib/url';
import { generateFeedbackToken } from '@/lib/feedback/token';
import { getTopUpEligibility } from '@/lib/topup';
import { countryCodeToSlug } from '@/lib/destinations-shared';

export const metadata: Metadata = { title: 'Mein Bereich' };
export const dynamic = 'force-dynamic';

const STATUS_REFRESH_MS = 10 * 60 * 1000; // refresh esim status at most every 10 min

const LIFECYCLE_META: Record<EsimLifecycle, { key: TranslationKeys | null; cls: string }> = {
  new:     { key: 'life_new',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
  in_use:  { key: 'life_in_use', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
  used:    { key: 'life_used',   cls: 'bg-slate-200 text-slate-600' },
  unknown: { key: 'life_new',    cls: 'bg-sky-50 text-sky-700 border border-sky-200' },
};

interface DashboardPageProps {
  searchParams?: { tab?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const service = createServiceClient();

  // Claim any guest orders & cash accounts made with this email before registering.
  if (user.email) {
    await claimGuestOrders(service, user.id, user.email);
  }

  // Resolve or create user's eSIM Cash account automatically.
  let cashAccount = null;
  let cashTransactions: any[] = [];
  if (user.email) {
    try {
      cashAccount = await resolveEsimCashAccount(service, user.email, user.id);
      
      const { data: txs } = await service
        .from('esim_cash_transactions')
        .select('*')
        .eq('email', user.email.trim().toLowerCase())
        .order('created_at', { ascending: false })
        .limit(50);
      cashTransactions = txs ?? [];
    } catch (err) {
      console.error('[dashboard] Failed to resolve eSIM Cash account:', err);
    }
  }

  // Fetch the user's orders with tariff details needed for top-up eligibility check.
  const { data: orders } = await service
    .from('orders')
    .select('id, status, order_type, amount_eur, iccid, short_url, qr_code_url, activation_code, smdp_address, apn, top_up_iccid, period_num, esim_status, esim_status_at, created_at, checkout_ref, tariffs(id, slug, name, country_name, country_code, data_gb, validity_days, flag_emoji, tariff_type, active_type, support_top_up_type, raw_data)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const orderList = orders ?? [];

  const userEmailClean = (user.email || '').trim().toLowerCase();
  // Fetch pending crypto sessions for the user
  const { data: sessions } = await service
    .from('crypto_sessions')
    .select('id, order_ids, status')
    .eq('customer_email', userEmailClean);
  const activeSessions = sessions?.filter((s) => s.status === 'pending') ?? [];
  const allSessions = sessions ?? [];

  // Fetch eSIM top-up records from authoritative esims table
  const iccids = Array.from(new Set(orderList.map((o) => o.iccid).filter(Boolean))) as string[];
  const esimMap = new Map<string, { iccid: string; topup_count: number }>();
  if (iccids.length > 0) {
    const { data: esimRows } = await service
      .from('esims')
      .select('iccid, topup_count')
      .in('iccid', iccids);
    if (esimRows) {
      esimRows.forEach((row) => esimMap.set(row.iccid, row));
    }
  }

  // ── Refresh eSIM lifecycle status from esimaccess (rate-limited) ──
  const now = Date.now();
  const toRefresh = orderList.filter((o) =>
    o.status === 'completed' && o.iccid &&
    (!o.esim_status_at || now - new Date(o.esim_status_at).getTime() > STATUS_REFRESH_MS),
  );
  if (toRefresh.length > 0) {
    await Promise.allSettled(
      toRefresh.map(async (o) => {
        const lifecycle = await queryEsimLifecycle(o.iccid!);
        o.esim_status = lifecycle; // reflect immediately in this render
        await service.from('orders')
          .update({ esim_status: lifecycle, esim_status_at: new Date().toISOString() })
          .eq('id', o.id);
      }),
    );
  }

  const completed = orderList.filter((o) => o.status === 'completed');
  const pending   = orderList.filter((o) => ['pending', 'paid', 'provisioning'].includes(o.status));

  // Check which completed orders have already been reviewed by the customer
  let reviewedOrderIds = new Set<string>();
  const completedIds = completed.map((o) => o.id);
  if (completedIds.length > 0) {
    try {
      const { data: fbData } = await (service.from('feedbacks' as any))
        .select('order_id')
        .in('order_id', completedIds);
      if (fbData) {
        reviewedOrderIds = new Set((fbData as any[]).map((f: any) => f.order_id));
      }
    } catch (err) {
      console.error('[dashboard] feedbacks fetch error:', err);
    }
  }

  const tabParam = searchParams?.tab;
  const activeTab = tabParam === 'cash' ? 'cash' : tabParam === 'tickets' ? 'tickets' : tabParam === 'settings' ? 'settings' : 'esims';

  // Resolve user profile row from database
  let profile = null;
  const { data: profileData } = await service
    .from('users')
    .select('full_name, phone, billing_address, two_factor_enabled, is_verified')
    .eq('id', user.id)
    .single();

  if (profileData) {
    profile = profileData;
  } else {
    // If user row is missing, resolve it and re-query
    const resolvedId = await resolveCustomer(service, user, userEmailClean);
    if (resolvedId) {
      const { data: retryData } = await service
        .from('users')
        .select('full_name, phone, billing_address, two_factor_enabled, is_verified')
        .eq('id', user.id)
        .single();
      profile = retryData;
    }
  }

  const resolvedProfile = (profile ?? {
    full_name: user.user_metadata?.full_name ?? '',
    phone: '',
    billing_address: '',
    two_factor_enabled: false,
    is_verified: false,
  }) as any;

  // Admin detection & check for Unlimited tariffs missing discount rules or with empty tiers
  const adminEmail = (process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kaozpicks@gmail.com').toLowerCase();
  const isAdmin = user.email?.toLowerCase() === adminEmail || (user as any).app_metadata?.role === 'admin' || (user as any).user_metadata?.is_admin === true;

  let missingDiscountTariffs: Array<{ id: string; name: string; package_code: string; country_name: string; country_code: string; data_gb: number | null; discount_rule_code: string | null }> = [];
  let discountMinDaysSetting: string | null = null;
  let defaultDiscountRuleSetting: string | null = null;
  if (isAdmin) {
    try {
      const { data: allActive } = await service
        .from('tariffs')
        .select('id, name, package_code, country_name, country_code, data_gb, discount_rule_code, tariff_type')
        .eq('is_active', true);

      const unlimitedActive = (allActive ?? []).filter(
        (t: any) => t.tariff_type?.startsWith('unlimited')
      );

      if (unlimitedActive && unlimitedActive.length > 0) {
        const ruleCodes = Array.from(new Set(unlimitedActive.map((t: any) => t.discount_rule_code).filter(Boolean)));
        const validRules = new Set<string>();
        if (ruleCodes.length > 0) {
          const { data: rules } = await service
            .from('discount_rules')
            .select('discount_rule_code, period_rules')
            .in('discount_rule_code', ruleCodes);
          if (rules) {
            for (const r of rules) {
              const pr = typeof r.period_rules === 'string' ? JSON.parse(r.period_rules) : r.period_rules;
              if (Array.isArray(pr) && pr.length > 0) {
                validRules.add(r.discount_rule_code);
              }
            }
          }
        }
        missingDiscountTariffs = (unlimitedActive as any[]).filter(
          (t) => !t.discount_rule_code || !validRules.has(t.discount_rule_code)
        );
      }

      const { data: settingsRows } = await service
        .from('system_settings')
        .select('key, value')
        .in('key', ['unlimited_discount_min_days', 'unlimited_default_discount_rule']);
      if (settingsRows) {
        for (const row of settingsRows) {
          if (row.key === 'unlimited_discount_min_days') discountMinDaysSetting = row.value;
          if (row.key === 'unlimited_default_discount_rule') defaultDiscountRuleSetting = row.value;
        }
      }
    } catch (checkErr) {
      console.error('[dashboard] Admin tariff discount check failed:', checkErr);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{t('dash_title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{user.email}</p>
        </div>
        <Link href="/tariffs" className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          {t('dash_new_esim')}
        </Link>
      </div>

      {/* Admin Warning: Missing Discount Rules */}
      {isAdmin && missingDiscountTariffs.length > 0 && (
        <div className="mb-8 rounded-2xl border-2 border-red-300 bg-red-50 p-5 shadow-sm text-red-900" role="alert">
          <div className="flex items-start gap-3">
            <span className="text-2xl shrink-0">⚠️</span>
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
              <details className="mt-3 bg-white/90 rounded-xl border border-red-200 p-3">
                <summary className="text-xs font-bold text-red-800 cursor-pointer select-none hover:text-red-950">
                  Tabelle der betroffenen Tarife ({missingDiscountTariffs.length})
                </summary>
                <div className="mt-2.5 overflow-x-auto max-h-60 scrollbar-thin">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="border-b border-red-200 bg-red-50/70 text-[11px] font-extrabold uppercase text-red-900 sticky top-0">
                      <tr>
                        <th className="py-1.5 px-2">Land</th>
                        <th className="py-1.5 px-2">Tarifname / Code</th>
                        <th className="py-1.5 px-2">Datenvolumen</th>
                        <th className="py-1.5 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-100">
                      {missingDiscountTariffs.map((t) => (
                        <tr key={t.id} className="hover:bg-red-50/50">
                          <td className="py-1.5 px-2 font-medium">{t.country_name} ({t.country_code})</td>
                          <td className="py-1.5 px-2 font-mono text-[11px]">{t.name} <span className="text-slate-400">({t.package_code})</span></td>
                          <td className="py-1.5 px-2 font-medium">{t.data_gb ? `${t.data_gb} GB/Tag` : 'Unlimited'}</td>
                          <td className="py-1.5 px-2 text-red-700 font-semibold text-[11px]">
                            {!t.discount_rule_code ? 'Kein Code zugewiesen' : 'Regel ohne Stufen'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </div>
          </div>
        </div>
      )}

      {/* Admin Settings Overview */}
      {isAdmin && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <span>⚙️</span> Unlimited-Staffelrabatt Konfiguration (system_settings)
            </h3>
            <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">Admin Only</span>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-slate-700 block mb-1">Minimale Rabattlaufzeit (unlimited_discount_min_days):</span>
              <p className="text-sm font-extrabold text-brand-700">{discountMinDaysSetting ?? '4'} Tage</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Bei 1–{Math.max(1, (Number(discountMinDaysSetting) || 4) - 1)} Tagen gilt kein Rabatt. Staffel greift ab Tag {discountMinDaysSetting ?? '4'}.</p>
            </div>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
              <span className="font-bold text-slate-700 block mb-1">Standard-Rabattregel (unlimited_default_discount_rule):</span>
              <p className="text-sm font-mono font-extrabold text-slate-800">{defaultDiscountRuleSetting || 'UNLIMITED_PLAN_DISC'}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Wird beim Produkt-Sync für Tarife ohne Regel aus der Datenbank zugewiesen.</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-brand-700">{orderList.length}</p>
          <p className="text-xs text-slate-500 mt-1">{t('dash_orders')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{completed.length}</p>
          <p className="text-xs text-slate-500 mt-1">{t('dash_active')}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center">
          <p className="text-2xl font-bold text-slate-700">
            {formatEur(completed.reduce((s, o) => s + (o.amount_eur ?? 0), 0))}
          </p>
          <p className="text-xs text-slate-500 mt-1">{t('dash_total')}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        <Link
          href="/dashboard"
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'esims' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          {t('dash_my_esims')}
        </Link>
        <Link
          href="/dashboard?tab=cash"
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'cash' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>💎</span>
          <span>{t('dash_tab_cash')}</span>
          {cashAccount && (Number(cashAccount.balance_eur) > 0) && (
            <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full font-bold">
              {formatEur(Number(cashAccount.balance_eur))}
            </span>
          )}
        </Link>
        <Link
          href="/dashboard?tab=tickets"
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'tickets' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>🎫</span>
          <span>Support</span>
        </Link>
        <Link
          href="/dashboard?tab=settings"
          className={`pb-3 font-semibold text-sm transition-colors border-b-2 -mb-px flex items-center gap-1.5 ${
            activeTab === 'settings' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <span>⚙️</span>
          <span>{t('dash_tab_settings')}</span>
        </Link>
      </div>

      {activeTab === 'esims' && (
        <>
          {/* Pending orders / checkouts */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="font-semibold text-slate-800 mb-3">{t('dash_pending')}</h2>
              <div className="space-y-3">
                {pending.map((order) => {
                  const session = allSessions.find((s) => s.order_ids?.includes(order.id));
                  return (
                    <OrderRow
                      key={order.id}
                      order={order as unknown as OrderType}
                      t={t}
                      sessionId={session?.id}
                      userEmail={user.email}
                      prefix={prefix}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* eSIMs */}
          <div>
            <h2 className="font-semibold text-slate-800 mb-3">{t('dash_my_esims')}</h2>
            {orderList.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                <p className="text-4xl mb-3">📡</p>
                <p className="font-medium">{t('dash_empty')}</p>
                <Link href="/tariffs" className="mt-3 inline-block text-sm font-medium text-brand-600 hover:text-brand-800">
                  {t('dash_empty_cta')}
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {completed.map((order) => {
                  const session = allSessions.find((s) => s.order_ids?.includes(order.id));
                  const txId = session?.id ?? (order as any).checkout_ref ?? order.id;
                  const overviewUrl = order.iccid ? getEsimOverviewUrl(txId, order.iccid) : null;
                  const esimRecord = order.iccid ? (esimMap.get(order.iccid) ?? { iccid: order.iccid, topup_count: 0 }) : null;

                  return (
                    <OrderRow
                      key={order.id}
                      order={order as unknown as OrderType}
                      t={t}
                      showEsim
                      overviewUrl={overviewUrl}
                      isReviewed={reviewedOrderIds.has(order.id)}
                      userEmail={user.email}
                      esimRecord={esimRecord}
                      prefix={prefix}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'tickets' && user.email && (
        <CustomerTicketsDashboard userEmail={user.email} />
      )}

      {activeTab === 'cash' && cashAccount && (
        <EsimCashDashboard account={cashAccount} transactions={cashTransactions} />
      )}

      {activeTab === 'settings' && (
        <AccountSettings user={user} profile={resolvedProfile} />
      )}
    </div>
  );
}

type OrderType = {
  id:           string;
  status:       string;
  order_type:   string;
  amount_eur:   number;
  iccid:        string | null;
  short_url:    string | null;
  top_up_iccid: string | null;
  period_num:   number | null;
  esim_status:  string | null;
  created_at:   string;
  checkout_ref?: string | null;
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
    active_type?: number | null;
    support_top_up_type?: number | null;
    raw_data?: any;
  } | null;
};

const STATUS_KEY: Record<string, TranslationKeys> = {
  completed: 'status_completed', paid: 'status_paid', provisioning: 'status_provisioning',
  pending: 'status_pending', failed: 'status_failed', refunded: 'status_refunded',
};

function statusBadge(status: string, t: ServerT) {
  const map: Record<string, string> = {
    completed: 'bg-green-100 text-green-700', paid: 'bg-amber-100 text-amber-700',
    provisioning: 'bg-amber-100 text-amber-700', pending: 'bg-slate-100 text-slate-600',
    failed: 'bg-red-100 text-red-700', refunded: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-600'}`}>
      {STATUS_KEY[status] ? t(STATUS_KEY[status]) : status}
    </span>
  );
}

function OrderRow({
  order,
  t,
  showEsim,
  sessionId,
  overviewUrl,
  isReviewed,
  userEmail,
  esimRecord,
  prefix = '',
}: {
  order: OrderType;
  t: ServerT;
  showEsim?: boolean;
  sessionId?: string;
  overviewUrl?: string | null;
  isReviewed?: boolean;
  userEmail?: string | null;
  esimRecord?: { iccid: string; topup_count: number } | null;
  prefix?: string;
}) {
  const tariff = order.tariffs;
  const lifecycle = (order.esim_status as EsimLifecycle | null) ?? 'unknown';
  const lifeMeta = LIFECYCLE_META[lifecycle] ?? LIFECYCLE_META.unknown;
  const lifeLabel = lifeMeta.key ? t(lifeMeta.key) : '—';

  // Calculate top-up eligibility strictly using single source of truth
  const eligibility = (showEsim && order.iccid)
    ? getTopUpEligibility(esimRecord, tariff)
    : null;

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

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
      {/* Top order summary */}
      <div className="flex flex-wrap items-center gap-3 p-4">
        <span className="text-2xl">{tariff?.flag_emoji ?? '🌐'}</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">
            {tariff?.country_name ?? 'Unbekannt'}
            {order.order_type === 'top_up' && (
              <span className="ml-2 text-xs bg-brand-100 text-brand-700 rounded-full px-2 py-0.5">Top-Up</span>
            )}
          </p>
          <p className="text-xs text-slate-500">
            {tariff ? `${formatGb(tariff.data_gb)} · ${order.period_num ?? tariff.validity_days}d` : ''}
            {' · '}{new Date(order.created_at).toLocaleDateString('de-DE')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {showEsim && order.iccid && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${lifeMeta.cls}`} title="eSIM">
              {lifeLabel}
            </span>
          )}
          {statusBadge(order.status, t)}
          <span className="font-semibold text-slate-800 text-sm">{formatEur(order.amount_eur)}</span>
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
              className="btn-primary min-h-[44px] w-full sm:w-auto inline-flex items-center justify-center font-bold px-4 py-2 text-xs"
            >
              {t('topup_order_new_esim')}
            </Link>
          </div>
        </div>
      )}

      {/* Actions footer */}
      {showEsim && order.status === 'completed' && (
        <div className="border-t border-slate-100 px-4 py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {order.iccid ? (
            <>
              <span className="text-xs text-slate-400">ICCID:</span>
              <span className="text-xs font-mono text-slate-600">{order.iccid}</span>
            </>
          ) : (
            <span className="text-xs text-slate-400">Bestellung: #{order.id.slice(0, 8)}</span>
          )}

          <div className="ml-auto flex items-center gap-2.5 flex-wrap">
            {isReviewed ? (
              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-bold text-emerald-700 flex items-center gap-1">
                <span>✓</span> Bewertet
              </span>
            ) : (
              <Link
                href={`/reviews/new?orderId=${order.id}&token=${generateFeedbackToken(order.id, userEmail)}`}
                className="rounded-lg bg-gradient-to-r from-amber-50 to-amber-100/80 border border-amber-300 px-2.5 py-1 text-xs font-bold text-amber-900 hover:bg-amber-100 transition-colors shadow-2xs flex items-center gap-1"
                title="Jetzt bewerten und 1% eSIM Cash Belohnung sichern"
              >
                <span>🎁</span> Bewerten (+1% Cash)
              </Link>
            )}

            <Link href={`/dashboard/orders/${order.id}`} className="text-xs font-medium text-slate-500 hover:text-brand-700">
              {t('dash_details')}
            </Link>

            {/* Reload button / badges */}
            {order.iccid && (
              <>
                {isNotSupported ? (
                  <div className="inline-flex items-center gap-2">
                    <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">
                      {t('topup_not_supported_badge')}
                    </span>
                    <Link
                      href={originCountryUrl}
                      className="text-xs font-bold text-brand-600 hover:text-brand-800 underline underline-offset-2"
                    >
                      {t('topup_buy_new_esim')}
                    </Link>
                  </div>
                ) : isLimitReached ? (
                  <button
                    disabled
                    aria-disabled="true"
                    className="rounded-lg bg-slate-100 border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-400 cursor-not-allowed opacity-60 pointer-events-none"
                  >
                    {t('dash_topup')}
                  </button>
                ) : (
                  <Link
                    href={`/topup?iccid=${encodeURIComponent(order.iccid)}`}
                    className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
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
                className="rounded-lg bg-brand-600 px-3 py-1 text-xs font-semibold text-white hover:bg-brand-700 transition-colors"
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
