import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      console.error('[Database] DATABASE_URL is not configured in environment variables');
    }
    pool = new Pool({
      connectionString,
      // For Coolify local VPS, we can adjust pool sizes if needed
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export async function query(text: string, params?: any[]): Promise<any> {
  const p = getPool();
  const start = Date.now();
  try {
    const res = await p.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] Executed: ${text} in ${duration}ms`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] Failed to execute: ${text}`, err);
    throw err;
  }
}
