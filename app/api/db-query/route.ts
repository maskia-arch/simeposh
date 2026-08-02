import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { PostgresQueryBuilder } from '@/lib/supabase/postgresClient';

const ALLOWED_TABLES = [
  'tariffs',
  'users',
  'esim_cash_accounts',
  'orders',
  'crypto_sessions',
  'posts',
  'post_translations',
  'crypto_coins',
  'feedbacks',
  'support_tickets',
  'ticket_messages',
];

const DISALLOWED_SQL_KEYWORDS = /\b(SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|CREATE|TRUNCATE|UNION|JOIN|EXEC|EXECUTE|DECLARE|PG_SLEEP|BENCHMARK|SLEEP)\b|--|\/\*|\*\/|;/i;
const SAFE_IDENTIFIER_REGEX = /^[a-zA-Z0-9_]+$/;

function sanitizeSelectFields(fields: string): boolean {
  if (!fields) return true;
  // Allow comma-separated fields and allowed relations like tariffs(*), post_translations(*), crypto_coins(*)
  const cleaned = fields.replace(/\b(tariffs|post_translations|crypto_coins)\([^)]*\)/gi, '');
  if (DISALLOWED_SQL_KEYWORDS.test(cleaned)) {
    return false;
  }
  // All remaining tokens split by comma should be valid column names (optionally with table prefix)
  const tokens = cleaned.split(',').map(s => s.trim()).filter(Boolean);
  for (const token of tokens) {
    if (token === '*') continue;
    const parts = token.split('.');
    for (const part of parts) {
      if (!SAFE_IDENTIFIER_REGEX.test(part)) return false;
    }
  }
  return true;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table, selectFields, filters, orFilters, limitVal, offsetVal, isSingle, isMaybeSingle } = body;

    if (!table || typeof table !== 'string') {
      return NextResponse.json({ error: 'Table is required' }, { status: 400 });
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return NextResponse.json({ error: 'Forbidden table access' }, { status: 403 });
    }

    // 1. Authenticate user for non-public tables
    const isPublicTable = ['tariffs', 'posts', 'post_translations', 'crypto_coins', 'feedbacks'].includes(table);
    let user: any = null;

    if (!isPublicTable) {
      const cookieStore = await cookies();
      const token = cookieStore.get('session_token')?.value;
      if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
      user = await verifyJwt(token);
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // 2. Validate selectFields
    if (selectFields && !sanitizeSelectFields(selectFields)) {
      return NextResponse.json({ error: 'Invalid or disallowed select fields' }, { status: 400 });
    }

    // 3. Build Postgres Query
    const builder = new PostgresQueryBuilder(table);
    builder.select(selectFields || '*');

    // 4. Enforce user restrictions (Row-Level Security emulation)
    if (!isPublicTable && user) {
      if (table === 'users') {
        builder.eq('id', user.id);
      } else if (table === 'esim_cash_accounts') {
        builder.eq('email', user.email);
      } else if (table === 'orders') {
        builder.eq('user_id', user.id);
      } else if (table === 'crypto_sessions') {
        builder.eq('customer_email', user.email);
      } else if (table === 'support_tickets') {
        builder.eq('user_id', user.id);
      } else if (table === 'ticket_messages') {
        builder.eq('sender_email', user.email);
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 5. Apply filters safely
    if (Array.isArray(filters)) {
      for (const f of filters) {
        if (!f || typeof f.col !== 'string' || !SAFE_IDENTIFIER_REGEX.test(f.col)) continue;
        if (f.op === '=') {
          if (table === 'users' && f.col === 'id' && f.val !== user?.id) continue;
          if (table === 'esim_cash_accounts' && f.col === 'email' && f.val !== user?.email) continue;
          if (table === 'orders' && f.col === 'user_id' && f.val !== user?.id) continue;
          builder.eq(f.col, f.val);
        } else if (f.op === '!=') {
          builder.neq(f.col, f.val);
        }
      }
    }

    // 6. Apply advanced filters (OR / limit / range) safely
    if (Array.isArray(orFilters)) {
      for (const orFilter of orFilters) {
        if (typeof orFilter !== 'string') continue;
        if (DISALLOWED_SQL_KEYWORDS.test(orFilter)) continue;
        builder.or(orFilter);
      }
    }

    if (typeof limitVal === 'number' && limitVal > 0 && limitVal <= 1000) {
      builder.limit(limitVal);
    }

    if (typeof offsetVal === 'number' && offsetVal >= 0 && typeof limitVal === 'number') {
      builder.range(offsetVal, offsetVal + Math.min(limitVal, 1000) - 1);
    }

    if (isSingle) builder.single();
    if (isMaybeSingle) builder.maybeSingle();

    const res = await builder;
    return NextResponse.json(res);
  } catch (err: any) {
    console.error('[db-query route] Query error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
