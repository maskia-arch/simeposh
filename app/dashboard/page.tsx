import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { claimGuestOrders, resolveCustomer } from '@/lib/customers';
import { queryEsimLifecycle } from '@/lib/esimaccess/client';
import { getServerT, getServerLocale } from '@/lib/i18n/server';
import { resolveEsimCashAccount } from '@/lib/cashback';
import { isUserAdmin } from '@/lib/auth/isAdmin';
import { isoName } from '@/lib/tariff-display';
import { getTopUpEligibility } from '@/lib/topup';
import { DashboardClient, type OrderType, type PopularDestination } from './DashboardClient';

export const dynamic = 'force-dynamic';

const STATUS_REFRESH_MS = 10 * 60 * 1000; // refresh esim status at most every 10 min

interface DashboardPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

export async function generateMetadata({ searchParams }: DashboardPageProps): Promise<Metadata> {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const tab = params?.tab;

  let tabTitle = t('dash_meta_esims');
  if (tab === 'cash') tabTitle = t('dash_meta_cash');
  else if (tab === 'tickets') tabTitle = t('dash_meta_tickets');
  else if (tab === 'settings') tabTitle = t('dash_meta_settings');

  return {
    title: { absolute: `${tabTitle} | PureSim` },
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const locale = await getServerLocale();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const service = createServiceClient();

  // Claim any guest orders & cash accounts made with this email before registering
  if (user.email) {
    await claimGuestOrders(service, user.id, user.email);
  }

  // Resolve or create user's eSIM Cash account automatically
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

  // Fetch the user's orders with tariff details (strictly no raw_data or supplier fields)
  const { data: rawOrders } = await service
    .from('orders')
    .select('id, status, order_type, amount_eur, iccid, short_url, qr_code_url, activation_code, smdp_address, apn, top_up_iccid, period_num, esim_status, esim_status_at, created_at, checkout_ref, setup_token, tariffs(id, slug, name, country_name, country_code, data_gb, validity_days, flag_emoji, tariff_type, active_type, support_top_up_type)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  const rawOrderList = (rawOrders ?? []) as any[];
  const userEmailClean = (user.email || '').trim().toLowerCase();

  // Fetch crypto sessions for the user
  const { data: sessions } = await service
    .from('crypto_sessions')
    .select('id, order_ids, status')
    .eq('customer_email', userEmailClean);
  const allSessions = (sessions ?? []) as Array<{ id: string; order_ids: string[]; status: string }>;

  // Fetch eSIM top-up records from authoritative esims table
  const iccids = Array.from(new Set(rawOrderList.map((o) => o.iccid).filter(Boolean))) as string[];
  const esimMap: Record<string, { iccid: string; topup_count: number }> = {};
  if (iccids.length > 0) {
    const { data: esimRows } = await service
      .from('esims')
      .select('iccid, topup_count')
      .in('iccid', iccids);
    if (esimRows) {
      esimRows.forEach((row: any) => {
        esimMap[row.iccid] = row;
      });
    }
  }

  // Refresh eSIM lifecycle status from esimaccess (rate-limited)
  const now = Date.now();
  const toRefresh = rawOrderList.filter((o) =>
    o.status === 'completed' && o.iccid &&
    (!o.esim_status_at || now - new Date(o.esim_status_at).getTime() > STATUS_REFRESH_MS),
  );
  if (toRefresh.length > 0) {
    await Promise.allSettled(
      toRefresh.map(async (o) => {
        const lifecycle = await queryEsimLifecycle(o.iccid!);
        o.esim_status = lifecycle;
        await service.from('orders')
          .update({ esim_status: lifecycle, esim_status_at: new Date().toISOString() })
          .eq('id', o.id);
      }),
    );
  }

  // Precompute clean eligibility and strip internal tariff fields for the client
  const orderList: OrderType[] = rawOrderList.map((o) => {
    const esimRecord = o.iccid ? esimMap[o.iccid] : null;
    const eligibility = o.iccid ? getTopUpEligibility(esimRecord, o.tariffs) : null;
    return {
      id: o.id,
      status: o.status,
      order_type: o.order_type,
      amount_eur: o.amount_eur,
      iccid: o.iccid ? `•••• ${o.iccid.slice(-4)}` : null,
      has_iccid: Boolean(o.iccid),
      setup_token: o.setup_token || null,
      short_url: o.short_url,
      top_up_iccid: o.top_up_iccid,
      period_num: o.period_num,
      esim_status: o.esim_status,
      esim_status_at: o.esim_status_at,
      created_at: o.created_at,
      checkout_ref: o.checkout_ref,
      eligibility,
      tariffs: o.tariffs ? {
        id: o.tariffs.id,
        slug: o.tariffs.slug,
        name: o.tariffs.name,
        country_name: o.tariffs.country_name,
        country_code: o.tariffs.country_code,
        data_gb: o.tariffs.data_gb,
        validity_days: o.tariffs.validity_days,
        flag_emoji: o.tariffs.flag_emoji,
        tariff_type: o.tariffs.tariff_type,
      } : null,
    };
  });

  const completed = orderList.filter((o) => o.status === 'completed');
  const pending   = orderList.filter((o) => ['pending', 'paid', 'provisioning'].includes(o.status));

  // Check which completed orders have already been reviewed by the customer
  const reviewedOrderIds: string[] = [];
  const completedIds = completed.map((o) => o.id);
  if (completedIds.length > 0) {
    try {
      const { data: fbData } = await (service.from('feedbacks' as any))
        .select('order_id')
        .in('order_id', completedIds);
      if (fbData) {
        (fbData as any[]).forEach((f: any) => {
          if (f.order_id) reviewedOrderIds.push(f.order_id);
        });
      }
    } catch (err) {
      console.error('[dashboard] feedbacks fetch error:', err);
    }
  }

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

  const resolvedProfile = profile ?? {
    full_name: user.user_metadata?.full_name ?? '',
    phone: '',
    billing_address: '',
    two_factor_enabled: false,
    is_verified: false,
  };

  // Admin detection & check for Unlimited tariffs missing discount rules
  const isAdmin = isUserAdmin(user);
  let missingDiscountTariffs: any[] = [];
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

  // Fetch minimum prices for 3 popular countries (DE, US, TR)
  const minPrices: Record<string, number> = { DE: 0.59, US: 0.89, TR: 0.99 };
  try {
    const { data: popularTariffRows } = await service
      .from('tariffs')
      .select('country_code, sale_price_eur')
      .eq('is_active', true)
      .in('country_code', ['DE', 'US', 'TR']);

    if (popularTariffRows) {
      for (const r of popularTariffRows) {
        if (r.country_code && r.sale_price_eur) {
          minPrices[r.country_code] = Math.min(minPrices[r.country_code] ?? 999, r.sale_price_eur);
        }
      }
    }
  } catch (err) {
    console.error('[dashboard] Failed to fetch popular tariff prices:', err);
  }

  const popularDestinations: PopularDestination[] = [
    { code: 'DE', name: isoName('DE', locale), slug: 'germany', flag: '🇩🇪', minPrice: minPrices['DE'] },
    { code: 'US', name: isoName('US', locale), slug: 'united-states', flag: '🇺🇸', minPrice: minPrices['US'] },
    { code: 'TR', name: isoName('TR', locale), slug: 'turkey', flag: '🇹🇷', minPrice: minPrices['TR'] },
  ];

  const tabParam = params?.tab;
  const initialTab = tabParam === 'cash' ? 'cash' : tabParam === 'tickets' ? 'tickets' : tabParam === 'settings' ? 'settings' : 'esims';

  return (
    <DashboardClient
      user={user}
      profile={resolvedProfile}
      orderList={orderList}
      pending={pending}
      completed={completed}
      allSessions={allSessions}
      esimMap={esimMap}
      reviewedOrderIds={reviewedOrderIds}
      cashAccount={cashAccount}
      cashTransactions={cashTransactions}
      popularDestinations={popularDestinations}
      isAdmin={isAdmin}
      missingDiscountTariffs={missingDiscountTariffs}
      discountMinDaysSetting={discountMinDaysSetting}
      defaultDiscountRuleSetting={defaultDiscountRuleSetting}
      initialTab={initialTab}
      prefix={prefix}
      locale={locale}
    />
  );
}
