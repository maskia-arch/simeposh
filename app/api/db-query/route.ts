import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { PostgresQueryBuilder } from '@/lib/supabase/postgresClient';
import { getClientIp } from '@/lib/auth/rateLimit';

// ── Rate Limiting for /api/db-query: 120 req/min per IP ──
const ipDbQueryMap = new Map<string, { count: number; resetAt: number }>();

function checkDbQueryRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = ipDbQueryMap.get(ip);
  if (!entry || now > entry.resetAt) {
    ipDbQueryMap.set(ip, { count: 1, resetAt: now + 60 * 1000 });
    return { allowed: true };
  }
  entry.count++;
  if (entry.count > 120) {
    const retryAfter = Math.max(1, Math.ceil((entry.resetAt - now) / 1000));
    return { allowed: false, retryAfter };
  }
  return { allowed: true };
}

// Periodic cleanup of stale rate-limit entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    ipDbQueryMap.forEach((v, k) => {
      if (now > v.resetAt) ipDbQueryMap.delete(k);
    });
  }, 60 * 1000);
}

// ── Whitelisted Named Queries ──
// Strictly maps named queries to predefined queries, tables, and fields.
// NO free table, field, or filter names allowed from browser clients!
const ALLOWED_QUERIES = [
  'getUserCashAccount',
  'getUserOrders',
  'getUserTickets',
  'getPublicTariffs',
  'getTariffsByCountry',
  'getPostBySlug',
  'getCryptoCoins',
] as const;

type AllowedQueryName = typeof ALLOWED_QUERIES[number];

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rateCheck = checkDbQueryRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const body = await request.json().catch(() => ({}));
    let { query: queryName, queryName: altQueryName, params, table, selectFields } = body;
    queryName = queryName || altQueryName;

    // Backward compatibility mapper: If callers invoke table/selectFields, map to whitelisted named query
    if (!queryName && table) {
      if (table === 'esim_cash_accounts') {
        queryName = 'getUserCashAccount';
      } else if (table === 'orders') {
        queryName = 'getUserOrders';
      } else if (table === 'support_tickets') {
        queryName = 'getUserTickets';
      } else if (table === 'tariffs') {
        queryName = 'getPublicTariffs';
      } else if (table === 'crypto_coins') {
        queryName = 'getCryptoCoins';
      } else {
        // Any unapproved free table access is strictly blocked
        return NextResponse.json({ error: 'Disallowed or unknown query' }, { status: 400 });
      }
    }

    if (!queryName || !ALLOWED_QUERIES.includes(queryName as any)) {
      return NextResponse.json({ error: 'Disallowed or unknown query' }, { status: 400 });
    }

    // Authenticate user strictly via server-side session
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // Strict security check for user-specific queries
    const isUserQuery = queryName === 'getUserCashAccount' || queryName === 'getUserOrders' || queryName === 'getUserTickets';
    if (isUserQuery) {
      if (!user || !user.id || !user.email) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      // Reject any attempt by a client to specify another user's ID, email, or order ID in params
      if (params && typeof params === 'object') {
        const foreignUserId = params.userId || params.user_id;
        if (foreignUserId && String(foreignUserId).trim() !== String(user.id)) {
          return NextResponse.json({ error: 'Forbidden parameter mismatch' }, { status: 400 });
        }
        const foreignEmail = params.email || params.customer_email;
        if (foreignEmail && String(foreignEmail).trim().toLowerCase() !== String(user.email).trim().toLowerCase()) {
          return NextResponse.json({ error: 'Forbidden parameter mismatch' }, { status: 400 });
        }
        const foreignOrderId = params.orderId || params.order_id;
        if (foreignOrderId && queryName !== 'getUserOrders') {
          return NextResponse.json({ error: 'Forbidden parameter mismatch' }, { status: 400 });
        }
      }
    }

    let resData: any = null;

    switch (queryName as AllowedQueryName) {
      // 1. User eSIM Cash account balance
      case 'getUserCashAccount': {
        const builder = new PostgresQueryBuilder('esim_cash_accounts');
        builder
          .select('balance_eur, total_spend_eur, extra_cashback_queue, referral_code')
          .eq('email', user!.email!.toLowerCase())
          .maybeSingle();
        const res = await builder;
        resData = res;
        break;
      }

      // 2. User Order History
      case 'getUserOrders': {
        const builder = new PostgresQueryBuilder('orders');
        builder
          .select('id, package_code, status, period_num, created_at, iccid, esim_tran_no')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50);
        const res = await builder;
        resData = res;
        break;
      }

      // 3. User Support Tickets
      case 'getUserTickets': {
        const builder = new PostgresQueryBuilder('support_tickets');
        builder
          .select('id, ticket_number, subject, category, status, created_at, updated_at')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(50);
        const res = await builder;
        resData = res;
        break;
      }

      // 4. Public Active Tariffs (sanitized, zero secret margins / raw_data)
      case 'getPublicTariffs': {
        const builder = new PostgresQueryBuilder('tariffs');
        builder
          .select('id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, discount_rule_code')
          .eq('is_active', true)
          .limit(100);
        const res = await builder;
        resData = res;
        break;
      }

      // 5. Public Tariffs by Country
      case 'getTariffsByCountry': {
        const countryCode = String(params?.countryCode || '').trim().toUpperCase();
        if (!countryCode || countryCode.length !== 2) {
          return NextResponse.json({ error: 'Invalid countryCode parameter' }, { status: 400 });
        }
        const builder = new PostgresQueryBuilder('tariffs');
        builder
          .select('id, package_code, slug, name, description, country_code, country_name, region, flag_emoji, location_codes, data_gb, validity_days, sale_price_eur, tariff_type, speed_kbps, label, is_top_up_eligible, active_type, support_top_up_type, discount_rule_code')
          .eq('country_code', countryCode)
          .eq('is_active', true)
          .limit(100);
        const res = await builder;
        resData = res;
        break;
      }

      // 6. Public Crypto Coins list
      case 'getCryptoCoins': {
        const builder = new PostgresQueryBuilder('crypto_coins');
        builder
          .select('code, name, is_active, surcharge_pct, surcharge_fixed_eur, min_order_eur')
          .eq('is_active', true);
        const res = await builder;
        resData = res;
        break;
      }

      default:
        return NextResponse.json({ error: 'Query not supported' }, { status: 400 });
    }

    const response = NextResponse.json(resData);
    response.headers.set('Cache-Control', 'public, max-age=0, s-maxage=300');
    return response;
  } catch (err: any) {
    console.error('[db-query route] Query error:', err);
    return NextResponse.json({ error: 'Internal query execution error' }, { status: 500 });
  }
}
