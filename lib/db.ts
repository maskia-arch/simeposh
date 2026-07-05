import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

let pool: Pool | null = null;
let migrationsRun: Promise<void> | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

async function runMigrations() {
  const p = getPool();
  
  // 1. Create migrations table if not exists
  await p.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      version VARCHAR(255) PRIMARY KEY,
      run_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Ensure newsletter_consent column exists
  try {
    await p.query(`
      ALTER TABLE public.users ADD COLUMN IF NOT EXISTS newsletter_consent BOOLEAN DEFAULT FALSE;
    `);
  } catch (err: any) {
    console.error('[Migrations] Failed to ensure users.newsletter_consent column:', err.message);
  }

  // 2. Read migration files
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`[Migrations] Directory ${migrationsDir} not found. Skipping auto-migrations.`);
    return;
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    // Check if migration has already run
    const { rows } = await p.query(
      'SELECT 1 FROM public.schema_migrations WHERE version = $1',
      [file]
    );

    if (rows.length === 0) {
      console.log(`[Migrations] Running migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');
      
      const client = await p.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          'INSERT INTO public.schema_migrations (version) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log(`[Migrations] Migration ${file} completed successfully.`);
      } catch (err: any) {
        await client.query('ROLLBACK');
        console.error(`[Migrations] Migration ${file} failed:`, err.message);
        throw err;
      } finally {
        client.release();
      }
    }
  }
}

export function ensureMigrations(): Promise<void> {
  if (!migrationsRun) {
    migrationsRun = runMigrations();
  }
  return migrationsRun;
}

export async function query(text: string, params?: any[]): Promise<any> {
  // Auto-run migrations on startup/first query
  await ensureMigrations();

  const start = Date.now();
  try {
    const res = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
      console.log(`[SQL Query] Executed in ${duration}ms`);
    }
    return res;
  } catch (err) {
    console.error(`[SQL Error] Failed to execute query`, err);
    throw err;
  }
}
