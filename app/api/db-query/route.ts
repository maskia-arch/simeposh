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
  const timer = setInterval(() => {
    const now = Date.now();
    ipDbQueryMap.forEach((v, k) => {
      if (now > v.resetAt) ipDbQueryMap.delete(k);
    });
  }, 60 * 1000);
  if (timer.unref) timer.unref();
}

// ── Whitelisted Named Queries ──
// Strictly maps named queries to server-side predefined queries, tables, and fields.
// NO free table, column, filter, or join names allowed from browser clients!
const ALLOWED_QUERIES = [
  'getUserOrders',
  'userOrders',
  'getUserCashAccount',
  'userCashAccount',
  'getUserTickets',
  'userTickets',
  'getUserProfile',
  'userProfile',
  'getUserSessions',
  'userSessions',
  'getUserEsims',
  'userEsims',
] as const;

type AllowedQueryName = typeof ALLOWED_QUERIES[number];

// Forbidden keys that must NEVER be leaked in output payloads
const FORBIDDEN_KEYS = new Set([
  'ek_price',
  'ek_price_usd',
  'payRatio',
  'pay_ratio',
  'raw_data',
  'fupPolicy',
  'fup_policy',
  'is_admin',
  'kaozpicks',
  'USD',
  'usd',
  'cost_price_usd',
  'retailPrice',
  'retail_price',
]);

function sanitizeResponsePayload<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeResponsePayload) as unknown as T;
  }
  if (typeof obj === 'object') {
    const clean: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (FORBIDDEN_KEYS.has(key)) {
        continue;
      }
      clean[key] = sanitizeResponsePayload(value);
    }
    return clean;
  }
  return obj;
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

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

    // 1. Strict security check: reject requests containing client-specified tables, columns, filters, or user identifiers
    if (
      body.table !== undefined ||
      body.select !== undefined ||
      body.selectFields !== undefined ||
      body.columns !== undefined ||
      body.filter !== undefined ||
      body.filters !== undefined ||
      body.user_id !== undefined ||
      body.userId !== undefined ||
      body.email !== undefined
    ) {
      return NextResponse.json({ error: 'Invalid query parameters' }, { status: 400 });
    }

    // 2. Validate query name from server-side whitelist
    const queryName = body.query || body.queryName;
    if (!queryName || !ALLOWED_QUERIES.includes(queryName as any)) {
      return NextResponse.json({ error: 'Unknown query' }, { status: 400 });
    }

    // 3. Strict authentication via server-side session
    const supabase = await createClient();
    let { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      const cookieHeader = request.headers.get('cookie');
      if (cookieHeader) {
        const match = cookieHeader.match(/(^|;)\s*session_token\s*=\s*([^;]+)/);
        if (match) {
          const { verifyJwt } = await import('@/lib/auth/jwt');
          const decoded = await verifyJwt(match[2]);
          if (decoded && decoded.id && decoded.email) {
            user = {
              id: decoded.id,
              email: decoded.email,
              user_metadata: { full_name: decoded.fullName },
              app_metadata: {},
              aud: 'authenticated',
              created_at: new Date().toISOString(),
              role: 'authenticated',
            };
          }
        }
      }
    }

    if (!user || !user.id || !user.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Any client-provided user_id, userId, or email is strictly IGNORED.
    // The query MUST bind ONLY to the session user.
    const sessionUserId = user.id;
    const sessionUserEmail = user.email.trim().toLowerCase();

    let resData: any = null;

    switch (queryName as AllowedQueryName) {
      // 1. User Order History
      case 'getUserOrders':
      case 'userOrders': {
        const builder = new PostgresQueryBuilder('orders');
        builder
          .select('id, status, period_num, created_at, iccid, amount_eur, order_type, esim_status, tariffs(id, slug, name, country_name, country_code, data_gb, validity_days, flag_emoji, tariff_type)')
          .eq('user_id', sessionUserId)
          .order('created_at', { ascending: false })
          .limit(50);
        const rows = await builder;
        resData = Array.isArray(rows)
          ? rows.map((o: any) => ({
              ...o,
              iccid: o.iccid ? `•••• ${String(o.iccid).slice(-4)}` : null,
              has_iccid: Boolean(o.iccid),
            }))
          : rows;
        break;
      }

      // 2. User eSIM Cash account balance
      case 'getUserCashAccount':
      case 'userCashAccount': {
        const builder = new PostgresQueryBuilder('esim_cash_accounts');
        builder
          .select('balance_eur, total_spend_eur, extra_cashback_queue, affiliate_code')
          .eq('email', sessionUserEmail)
          .maybeSingle();
        resData = await builder;
        break;
      }

      // 3. User Support Tickets
      case 'getUserTickets':
      case 'userTickets': {
        const builder = new PostgresQueryBuilder('support_tickets');
        builder
          .select('id, ticket_number, subject, category, status, created_at, updated_at')
          .eq('customer_email', sessionUserEmail)
          .order('updated_at', { ascending: false })
          .limit(50);
        resData = await builder;
        break;
      }

      // 4. User Profile
      case 'getUserProfile':
      case 'userProfile': {
        const builder = new PostgresQueryBuilder('users');
        builder
          .select('full_name, phone, billing_address, two_factor_enabled, is_verified')
          .eq('id', sessionUserId)
          .maybeSingle();
        resData = await builder;
        break;
      }

      // 5. User Active Sessions
      case 'getUserSessions':
      case 'userSessions': {
        const builder = new PostgresQueryBuilder('user_sessions');
        builder
          .select('id, user_agent, ip_address, created_at, last_active_at, revoked_at')
          .eq('user_id', sessionUserId)
          .is('revoked_at', null)
          .order('last_active_at', { ascending: false });
        resData = await builder;
        break;
      }

      // 6. User Active eSIMs (for Top-Up selection)
      case 'getUserEsims':
      case 'userEsims': {
        const builder = new PostgresQueryBuilder('orders');
        builder
          .select('id, iccid, status, period_num, tariffs(id, name, country_name, country_code, flag_emoji)')
          .eq('user_id', sessionUserId)
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(50);
        const rows = await builder;
        resData = Array.isArray(rows)
          ? rows.map((o: any) => ({
              ...o,
              iccid: o.iccid ? `•••• ${String(o.iccid).slice(-4)}` : null,
              has_iccid: Boolean(o.iccid),
            }))
          : rows;
        break;
      }

      default:
        return NextResponse.json({ error: 'Query not supported' }, { status: 400 });
    }

    // 4. Strict response sanitization: remove all confidential pricing / internal flags
    const sanitized = sanitizeResponsePayload(resData);

    const response = NextResponse.json(sanitized);
    response.headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    return response;
  } catch (err: any) {
    console.error('[db-query route] Query error:', err);
    return NextResponse.json({ error: 'Internal query execution error' }, { status: 500 });
  }
}
