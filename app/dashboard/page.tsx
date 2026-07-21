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
import { PendingOrderActions } from '@/components/PendingOrderActions';
import { AccountSettings } from '@/components/AccountSettings';

export const metadata: Metadata = { title: 'Mein Bereich' };
export const dynamic = 'force-dynamic';

const STATUS_REFRESH_MS = 10 * 60 * 1000; // refresh esim status at most every 10 min

const LIFECYCLE_META: Record<EsimLifecycle, { key: TranslationKeys | null; cls: string }> = {
  new:     { key: 'life_new',    cls: 'bg-sky-100 text-sky-700' },
  in_use:  { key: 'life_in_use', cls: 'bg-green-100 text-green-700' },
  used:    { key: 'life_used',   cls: 'bg-slate-200 text-slate-600' },
  unknown: { key: null,          cls: 'bg-slate-100 text-slate-400' },
};

interface DashboardPageProps {
  searchParams?: { tab?: string };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const t = getServerT(await getServerLocale());
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

  // Fetch the user's orders.
  const { data: orders } = await service
    .from('orders')
    .select('id, status, order_type, amount_eur, iccid, short_url, qr_code_url, activation_code, smdp_address, apn, top_up_iccid, period_num, esim_status, esim_status_at, created_at, checkout_ref, tariffs(name, country_name, data_gb, validity_days, flag_emoji, tariff_type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const orderList = orders ?? [];

  // Fetch pending crypto sessions for the user
  const { data: sessions } = await service
    .from('crypto_sessions')
    .select('id, order_ids, status')
    .eq('customer_email', user.email || '');
  const activeSessions = sessions?.filter((s) => s.status === 'pending') ?? [];
  const allSessions = sessions ?? [];

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

  const tabParam = searchParams?.tab;
  const activeTab = tabParam === 'cash' ? 'cash' : tabParam === 'settings' ? 'settings' : 'esims';

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
    const resolvedId = await resolveCustomer(service, user, user.email || '');
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

      {/* Tab Switcher */}
      <div className="mb-8 border-b border-slate-200">
        <div className="flex gap-6 -mb-px">
          <Link
            href="/dashboard"
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'esims'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>📶</span>
            <span>{t('dash_my_esims')}</span>
          </Link>
          <Link
            href="/dashboard?tab=cash"
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'cash'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>💰</span>
            <span>{t('dash_tab_cash')}</span>
          </Link>
          <Link
            href="/dashboard?tab=settings"
            className={`pb-4 text-sm font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'settings'
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <span>⚙️</span>
            <span>{t('dash_tab_settings')}</span>
          </Link>
        </div>
      </div>

      {activeTab === 'esims' && (
        <>
          {/* Pending */}
          {pending.length > 0 && (
            <div className="mb-6">
              <h2 className="font-semibold text-slate-800 mb-3">{t('dash_pending')}</h2>
              <div className="space-y-3">
                {pending.map((order) => {
                  const session = activeSessions.find((s) => s.order_ids?.includes(order.id));
                  return (
                    <OrderRow
                      key={order.id}
                      order={order as unknown as OrderType}
                      t={t}
                      sessionId={session?.id}
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
              <div className="space-y-3">
                {completed.map((order) => {
                  const session = allSessions.find((s) => s.order_ids?.includes(order.id));
                  const txId = session?.id ?? (order as any).checkout_ref ?? order.id;
                  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.com').replace(/\/$/, '');
                  const isLocal = typeof window !== 'undefined' ? window.location.hostname.includes('localhost') : appUrl.includes('localhost');
                  const hostname = isLocal ? 'localhost' : (typeof window !== 'undefined' ? window.location.hostname.replace(/^www\./, '') : new URL(appUrl).hostname.replace(/^www\./, ''));
                  const esimDomain = isLocal ? null : (hostname.startsWith('esim.') ? hostname : `esim.${hostname}`);
                  const overviewUrl = order.iccid ? (isLocal ? `${appUrl}/esim-overview/${txId}/${order.iccid}` : `https://${esimDomain}/${txId}/${order.iccid}`) : null;
                  return (
                    <OrderRow
                      key={order.id}
                      order={order as unknown as OrderType}
                      t={t}
                      showEsim
                      overviewUrl={overviewUrl}
                    />
                  );
                })}
              </div>
            )}
          </div>
        </>
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
  tariffs: {
    name: string; country_name: string; data_gb: number | null;
    validity_days: number; flag_emoji: string | null; tariff_type: string | null;
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
}: {
  order: OrderType;
  t: ServerT;
  showEsim?: boolean;
  sessionId?: string;
  overviewUrl?: string | null;
}) {
  const tariff = order.tariffs;
  const isTravel = (tariff?.tariff_type ?? 'travel') === 'travel';
  const lifecycle = (order.esim_status as EsimLifecycle | null) ?? 'unknown';
  const lifeMeta = LIFECYCLE_META[lifecycle] ?? LIFECYCLE_META.unknown;
  const lifeLabel = lifeMeta.key ? t(lifeMeta.key) : '—';
  // Reloadable: travel eSIMs that are not yet a top-up order.
  const canReload = isTravel && order.order_type !== 'top_up' && !!order.iccid;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
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

      {order.iccid && showEsim && (
        <div className="border-t border-slate-100 px-4 py-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-xs text-slate-400">ICCID:</span>
          <span className="text-xs font-mono text-slate-600">{order.iccid}</span>
          <div className="ml-auto flex items-center gap-3">
            <Link href={`/dashboard/orders/${order.id}`} className="text-xs font-medium text-slate-500 hover:text-brand-700">
              {t('dash_details')}
            </Link>
            {canReload && (
              <Link
                href={`/topup?iccid=${encodeURIComponent(order.iccid)}`}
                className="rounded-lg bg-brand-50 border border-brand-200 px-3 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
              >
                {t('dash_topup')}
              </Link>
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
