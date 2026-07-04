import { query } from '../db';
import { verifyJwt } from '../auth/jwt';
import { Database } from './types';

type PublicSchema = Database[Extract<keyof Database, "public">];
export type TableName = keyof PublicSchema['Tables'] | keyof PublicSchema['Views'];

export type Row<T extends TableName> = T extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][T]['Row']
  : T extends keyof PublicSchema['Views']
  ? PublicSchema['Views'][T]['Row']
  : any;

function getConflictTarget(table: string): string {
  if (table === 'system_settings') return '("key")';
  if (table === 'users') return '("id")';
  if (table === 'post_translations') return '("post_id", "locale")';
  if (table === 'crypto_coins') return '("code")';
  if (table === 'tariffs') return '("package_code")';
  if (table === 'sync_logs') return '("sync_id")';
  if (table === 'orders') return '("id")';
  return '("id")';
}

export class PostgresQueryBuilder<T extends TableName = any, R = Row<T>, Single extends boolean = false> {
  private table: string;
  private method: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select';
  private selectFields: string = '*';
  private whereFilters: Array<{ col: string; op: string; val: any }> = [];
  private orFilters: string[] = [];
  private orderBy: string | null = null;
  private orderAsc: boolean = true;
  private limitVal: number | null = null;
  private offsetVal: number | null = null;
  private valuesToSave: any = null;
  private isSingle: boolean = false;
  private isMaybeSingle: boolean = false;

  constructor(table: string) {
    this.table = table;
  }

  select(fields = '*', options?: { count?: 'exact' | 'planned' | 'estimated'; head?: boolean }): PostgresQueryBuilder<T, R, Single> {
    this.method = 'select';
    this.selectFields = fields;
    if (options?.head) {
      this.isSingle = false;
      this.isMaybeSingle = false;
    }
    return this;
  }

  insert(data: any): PostgresQueryBuilder<T, R, Single> {
    this.method = 'insert';
    this.valuesToSave = data;
    return this;
  }

  update(data: any): PostgresQueryBuilder<T, R, Single> {
    this.method = 'update';
    this.valuesToSave = data;
    return this;
  }

  upsert(data: any, options?: { onConflict?: string; ignoreDuplicates?: boolean }): PostgresQueryBuilder<T, R, Single> {
    this.method = 'upsert';
    this.valuesToSave = data;
    return this;
  }

  delete(): PostgresQueryBuilder<T, R, Single> {
    this.method = 'delete';
    return this;
  }

  eq(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '=', val });
    return this;
  }

  neq(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '!=', val });
    return this;
  }

  gt(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '>', val });
    return this;
  }

  gte(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '>=', val });
    return this;
  }

  lt(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '<', val });
    return this;
  }

  lte(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: '<=', val });
    return this;
  }

  in(col: string, arr: any[]): PostgresQueryBuilder<T, R, Single> {
    this.whereFilters.push({ col, op: 'IN', val: arr });
    return this;
  }

  is(col: string, val: any): PostgresQueryBuilder<T, R, Single> {
    if (val === null) {
      this.whereFilters.push({ col, op: 'IS NULL', val: null });
    } else if (val === true) {
      this.whereFilters.push({ col, op: 'IS TRUE', val: null });
    } else if (val === false) {
      this.whereFilters.push({ col, op: 'IS FALSE', val: null });
    }
    return this;
  }

  or(filterStr: string): PostgresQueryBuilder<T, R, Single> {
    this.orFilters.push(filterStr);
    return this;
  }

  range(from: number, to: number): PostgresQueryBuilder<T, R, Single> {
    this.limitVal = to - from + 1;
    this.offsetVal = from;
    return this;
  }

  order(col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }): PostgresQueryBuilder<T, R, Single> {
    this.orderBy = col;
    this.orderAsc = opts?.ascending !== false;
    return this;
  }

  limit(val: number): PostgresQueryBuilder<T, R, Single> {
    this.limitVal = val;
    return this;
  }

  single(): PostgresQueryBuilder<T, R, true> {
    this.isSingle = true;
    return this as any;
  }

  maybeSingle(): PostgresQueryBuilder<T, R, true> {
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
    let sql = '';
    const params: any[] = [];
    let paramIdx = 1;

    const pushParam = (val: any) => {
      params.push(val);
      return `$${paramIdx++}`;
    };

    const compileWhere = () => {
      const parts: string[] = [];

      if (this.whereFilters.length > 0) {
        const clauses = this.whereFilters.map(f => {
          if (f.op === 'IS NULL' || f.op === 'IS TRUE' || f.op === 'IS FALSE') {
            return `"${f.col}" ${f.op}`;
          }
          if (f.op === 'IN') {
            if (!Array.isArray(f.val) || f.val.length === 0) {
              return 'FALSE';
            }
            const placeHolders = f.val.map(v => pushParam(v)).join(', ');
            return `"${f.col}" IN (${placeHolders})`;
          }
          return `"${f.col}" ${f.op} ${pushParam(f.val)}`;
        });
        parts.push(...clauses);
      }

      if (this.orFilters.length > 0) {
        const orClauses = this.orFilters.map(filterStr => {
          const conditions = filterStr.split(',');
          const parsed = conditions.map(cond => {
            const tokens = cond.split('.');
            const col = tokens[0];
            const op = tokens[1];
            const val = tokens.slice(2).join('.');
            
            if (op === 'is' && val === 'null') {
              return `"${col}" IS NULL`;
            }
            
            let sqlOp = '=';
            if (op === 'eq') sqlOp = '=';
            else if (op === 'neq') sqlOp = '!=';
            else if (op === 'gt') sqlOp = '>';
            else if (op === 'gte') sqlOp = '>=';
            else if (op === 'lt') sqlOp = '<';
            else if (op === 'lte') sqlOp = '<=';
            
            return `"${col}" ${sqlOp} ${pushParam(val)}`;
          });
          return `(${parsed.join(' OR ')})`;
        });
        parts.push(...orClauses);
      }

      if (parts.length === 0) return '';
      return ` WHERE ${parts.join(' AND ')}`;
    };

    if (this.method === 'select') {
      let fields = this.selectFields;

      if (fields.includes('tariffs(')) {
        const tariffsMatch = fields.match(/tariffs\(([^)]*)\)/);
        if (tariffsMatch) {
          const innerFields = tariffsMatch[1].trim();
          let subQuery = '';
          if (innerFields === '*' || innerFields === '') {
            subQuery = `(SELECT to_jsonb(t) FROM tariffs t WHERE t.id = "${this.table}".tariff_id) as tariffs`;
          } else {
            const cols = innerFields.split(',').map(c => c.trim());
            const jsonBuildObjArgs = cols.map(c => `'${c}', t."${c}"`).join(', ');
            subQuery = `(SELECT json_build_object(${jsonBuildObjArgs}) FROM tariffs t WHERE t.id = "${this.table}".tariff_id) as tariffs`;
          }
          fields = fields.replace(/tariffs\([^)]*\)/, subQuery);
        }
      }

      if (fields.includes('post_translations(')) {
        const transMatch = fields.match(/post_translations\(([^)]*)\)/);
        if (transMatch) {
          const innerFields = transMatch[1].trim();
          let subQuery = '';
          if (innerFields === '*' || innerFields === '') {
            subQuery = `COALESCE((SELECT json_agg(to_jsonb(pt)) FROM post_translations pt WHERE pt.post_id = "${this.table}".id), '[]'::json) as post_translations`;
          } else {
            const cols = innerFields.split(',').map(c => c.trim());
            const jsonBuildObjArgs = cols.map(c => `'${c}', pt."${c}"`).join(', ');
            subQuery = `COALESCE((SELECT json_agg(json_build_object(${jsonBuildObjArgs})) FROM post_translations pt WHERE pt.post_id = "${this.table}".id), '[]'::json) as post_translations`;
          }
          fields = fields.replace(/post_translations\([^)]*\)/, subQuery);
        }
      }

      if (fields.includes('crypto_coins(')) {
        const coinsMatch = fields.match(/crypto_coins\(([^)]*)\)/);
        if (coinsMatch) {
          const innerFields = coinsMatch[1].trim();
          let subQuery = '';
          if (innerFields === '*' || innerFields === '') {
            subQuery = `(SELECT to_jsonb(cc) FROM crypto_coins cc WHERE cc.code = "${this.table}".coin) as crypto_coins`;
          } else {
            const cols = innerFields.split(',').map(c => c.trim());
            const jsonBuildObjArgs = cols.map(c => `'${c}', cc."${c}"`).join(', ');
            subQuery = `(SELECT json_build_object(${jsonBuildObjArgs}) FROM crypto_coins cc WHERE cc.code = "${this.table}".coin) as crypto_coins`;
          }
          fields = fields.replace(/crypto_coins\([^)]*\)/, subQuery);
        }
      }

      sql = `SELECT ${fields} FROM "${this.table}"` + compileWhere();

      if (this.orderBy) {
        sql += ` ORDER BY "${this.orderBy}" ${this.orderAsc ? 'ASC' : 'DESC'}`;
      }
      if (this.limitVal !== null) {
        sql += ` LIMIT ${this.limitVal}`;
      }
      if (this.offsetVal !== null) {
        sql += ` OFFSET ${this.offsetVal}`;
      }
    } 
    else if (this.method === 'insert') {
      const data = this.valuesToSave;
      const isArray = Array.isArray(data);
      const rows = isArray ? data : [data];

      if (rows.length === 0) {
        return { data: [], error: null, count: 0 };
      }

      const keys = Object.keys(rows[0]);
      const columns = keys.map(k => `"${k}"`).join(', ');
      
      const valuesClauses = rows.map(row => {
        const valPlaceholders = keys.map(k => pushParam(row[k])).join(', ');
        return `(${valPlaceholders})`;
      }).join(', ');

      sql = `INSERT INTO "${this.table}" (${columns}) VALUES ${valuesClauses} RETURNING *`;
    } 
    else if (this.method === 'upsert') {
      const data = this.valuesToSave;
      const isArray = Array.isArray(data);
      const rows = isArray ? data : [data];

      if (rows.length === 0) {
        return { data: [], error: null, count: 0 };
      }

      const keys = Object.keys(rows[0]);
      const columns = keys.map(k => `"${k}"`).join(', ');
      
      const valuesClauses = rows.map(row => {
        const valPlaceholders = keys.map(k => pushParam(row[k])).join(', ');
        return `(${valPlaceholders})`;
      }).join(', ');

      const conflictTarget = getConflictTarget(this.table);
      
      const updateKeys = keys.filter(k => {
        if (this.table === 'system_settings' && k === 'key') return false;
        if (this.table === 'users' && k === 'id') return false;
        if (this.table === 'post_translations' && (k === 'post_id' || k === 'locale')) return false;
        if (this.table === 'tariffs' && k === 'package_code') return false;
        return k !== 'id';
      });
      
      const doUpdateSet = updateKeys.map(k => `"${k}" = EXCLUDED."${k}"`).join(', ');

      sql = `INSERT INTO "${this.table}" (${columns}) VALUES ${valuesClauses}`;
      if (doUpdateSet) {
        sql += ` ON CONFLICT ${conflictTarget} DO UPDATE SET ${doUpdateSet}`;
      } else {
        sql += ` ON CONFLICT ${conflictTarget} DO NOTHING`;
      }
      sql += ` RETURNING *`;
    }
    else if (this.method === 'update') {
      const data = this.valuesToSave;
      const keys = Object.keys(data);
      const setClauses = keys.map(k => `"${k}" = ${pushParam(data[k])}`).join(', ');

      sql = `UPDATE "${this.table}" SET ${setClauses}` + compileWhere() + ' RETURNING *';
    } 
    else if (this.method === 'delete') {
      sql = `DELETE FROM "${this.table}"` + compileWhere() + ' RETURNING *';
    }

    try {
      const dbRes = await query(sql, params);
      const rows = dbRes.rows;

      if (this.isSingle) {
        if (rows.length === 0) {
          return { data: null, error: { message: 'Row not found', code: 'PGRST116' }, count: 0 };
        }
        return { data: rows[0], error: null, count: 1 };
      }

      if (this.isMaybeSingle) {
        return { data: rows[0] || null, error: null, count: rows.length > 0 ? 1 : 0 };
      }

      return { data: rows, error: null, count: rows.length };
    } catch (err: any) {
      console.error('[PostgresQueryBuilder] execution error:', err);
      return { data: null, error: { message: err.message, code: err.code || 'UNKNOWN' }, count: 0 };
    }
  }
}

export class PostgresAuthClient {
  private cookies: any;

  constructor(cookiesObj?: any) {
    this.cookies = cookiesObj;
  }

  async getUser() {
    try {
      let token: string | undefined;
      
      if (this.cookies && typeof this.cookies.get === 'function') {
        token = this.cookies.get('session_token')?.value;
      } else if (typeof document !== 'undefined') {
        const match = document.cookie.match(/(^|;)\s*session_token\s*=\s*([^;]+)/);
        token = match ? match[2] : undefined;
      }

      if (!token) {
        return { data: { user: null }, error: null };
      }

      const decoded = await verifyJwt(token);
      if (!decoded) {
        return { data: { user: null }, error: { message: 'Invalid or expired session' } };
      }

      const user = {
        id: decoded.id,
        email: decoded.email,
        user_metadata: {
          full_name: decoded.fullName,
        },
        app_metadata: {},
        aud: 'authenticated',
        created_at: new Date().toISOString(),
        role: 'authenticated',
      };

      return { data: { user }, error: null };
    } catch (err: any) {
      return { data: { user: null }, error: { message: err.message } };
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

  async signOut() {
    return { error: null };
  }
}
