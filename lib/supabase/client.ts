/**
 * Mock browser-side client.
 * Routes database queries and authentication requests to local Next.js API endpoints.
 */
import { TableName, Row } from './postgresClient';

class BrowserQueryBuilder<T extends TableName = any, R = Row<T>, Single extends boolean = false> {
  private table: string;
  private selectFields: string = '*';
  private whereFilters: Array<{ col: string; op: string; val: any }> = [];
  private orFilters: string[] = [];
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): BrowserQueryBuilder<T, R, Single> {
    this.selectFields = fields;
    return this;
  }

  insert(data: any): BrowserQueryBuilder<T, R, Single> {
    return this;
  }

  update(data: any): BrowserQueryBuilder<T, R, Single> {
    return this;
  }

  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): BrowserQueryBuilder<T, R, Single> {
    return this;
  }

  delete(): BrowserQueryBuilder<T, R, Single> {
    return this;
  }

  eq(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '=', val });
    return this;
  }

  neq(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '!=', val });
    return this;
  }

  gt(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '>', val });
    return this;
  }

  gte(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '>=', val });
    return this;
  }

  lt(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '<', val });
    return this;
  }

  lte(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '<=', val });
    return this;
  }

  in(col: string, arr: any[]): BrowserQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: 'IN', val: arr });
    return this;
  }

  is(col: string, val: any): BrowserQueryBuilder<T, R, Single> {
    if (val === null) {
      this.whereFilters.push({ col, op: 'IS NULL', val: null });
    } else if (val === true) {
      this.whereFilters.push({ col, op: 'IS TRUE', val: null });
    } else if (val === false) {
      this.whereFilters.push({ col, op: 'IS FALSE', val: null });
    }
    return this;
  }

  or(filterStr: string): BrowserQueryBuilder<T, R, Single> {
    this.orFilters.push(filterStr);
    return this;
  }

  range(from: number, to: number): BrowserQueryBuilder<T, R, Single> {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): BrowserQueryBuilder<T, R, Single> {
    return this;
  }

  limit(val: number): BrowserQueryBuilder<T, R, Single> {
    this.limitVal = val;
    return this;
  }

  single(): BrowserQueryBuilder<T, R, true> {
    this.isSingle = true;
    return this as any;
  }

  maybeSingle(): BrowserQueryBuilder<T, R, true> {
    this.isMaybeSingle = true;
    return this as any;
  }

  async then<TResult1 = { data: Single extends true ? R | null : R[] | null; error: any; count?: number }, TResult2 = never>(
    onfulfilled?: ((value: { data: Single extends true ? R | null : R[] | null; error: any; count?: number }) => TResult1 | PromiseLike<TResult1>) | undefined | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null
  ): Promise<TResult1 | TResult2> {
    try {
      const res = await this.execute();
      const val = {
        data: (this.isSingle || this.isMaybeSingle ? res.data : res.data) as any,
        error: res.error,
        count: res.count
      };
      if (onfulfilled) {
        return onfulfilled(val);
      }
      return val as any;
    } catch (err) {
      if (onrejected) {
        return onrejected(err);
      }
      throw err;
    }
  }

  private async execute(): Promise<{ data: any; error: any; count?: number }> {
    try {
      const res = await fetch('/api/db-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: this.table,
          selectFields: this.selectFields,
          filters: this.whereFilters,
          orFilters: this.orFilters,
          limitVal: this.limitVal,
          offsetVal: this.offsetVal,
          isSingle: this.isSingle,
          isMaybeSingle: this.isMaybeSingle,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        return { data: null, error: { message: body.error || 'Query failed' }, count: 0 };
      }

      return await res.json();
    } catch (err: any) {
      return { data: null, error: { message: err.message }, count: 0 };
    }
  }
}

class BrowserAuthClient {
  async getUser() {
    try {
      const res = await fetch('/api/auth/me');
      if (!res.ok) {
        return { data: { user: null }, error: null };
      }
      const body = await res.json();
      return { data: { user: body.user }, error: null };
    } catch {
      return { data: { user: null }, error: null };
    }
  }

  onAuthStateChange(callback: (event: string, session: any) => void) {
    this.getUser().then(({ data }) => {
      const user = data?.user;
      const session = user ? { user, access_token: 'dummy' } : null;
      callback('SIGNED_IN', session);
    });

    return {
      data: {
        subscription: {
          unsubscribe() {}
        }
      }
    };
  }

  async signInWithPassword({ email, password }: any) {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const body = await res.json();
      if (!res.ok) {
        return { data: null, error: { message: body.error || 'Login failed' } };
      }
      return { data: body, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async signUp({ email, password, options }: any) {
    try {
      const fullName = options?.data?.full_name || '';
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName }),
      });
      const body = await res.json();
      if (!res.ok) {
        return { data: null, error: { message: body.error || 'Registration failed' } };
      }
      return { data: body, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }

  async signOut() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.reload();
      return { error: null };
    } catch (err: any) {
      return { error: { message: err.message } };
    }
  }
}

export function createClient() {
  return {
    from: <T extends TableName = any>(table: T) => new BrowserQueryBuilder<T>(table),
    auth: new BrowserAuthClient(),
  };
}
