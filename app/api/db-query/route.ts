import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { PostgresQueryBuilder } from '@/lib/supabase/postgresClient';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { table, selectFields, filters, orFilters, limitVal, offsetVal, isSingle, isMaybeSingle } = body;

    if (!table) {
      return NextResponse.json({ error: 'Table is required' }, { status: 400 });
    }

    // 1. Authenticate user for non-public tables
    const isPublicTable = ['tariffs'].includes(table);
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

    // 2. Build Postgres Query
    const builder = new PostgresQueryBuilder(table);
    builder.select(selectFields || '*');

    // 3. Enforce user restrictions (Row-Level Security emulation)
    if (!isPublicTable && user) {
      if (table === 'users') {
        builder.eq('id', user.id);
      } else if (table === 'esim_cash_accounts') {
        builder.eq('email', user.email);
      } else if (table === 'orders') {
        builder.eq('user_id', user.id);
      } else if (table === 'crypto_sessions') {
        builder.eq('customer_email', user.email);
      } else {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 4. Apply filters
    if (Array.isArray(filters)) {
      for (const f of filters) {
        if (f.op === '=') {
          if (table === 'users' && f.col === 'id' && f.val !== user.id) continue;
          if (table === 'esim_cash_accounts' && f.col === 'email' && f.val !== user.email) continue;
          if (table === 'orders' && f.col === 'user_id' && f.val !== user.id) continue;
          builder.eq(f.col, f.val);
        } else if (f.op === '!=') {
          builder.neq(f.col, f.val);
        }
      }
    }

    // 5. Apply advanced filters (OR / limit / range)
    if (Array.isArray(orFilters)) {
      for (const orFilter of orFilters) {
        builder.or(orFilter);
      }
    }

    if (typeof limitVal === 'number') {
      builder.limit(limitVal);
    }

    if (typeof offsetVal === 'number' && typeof limitVal === 'number') {
      builder.range(offsetVal, offsetVal + limitVal - 1);
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
