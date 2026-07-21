import fs from 'fs';
import path from 'path';

const envPath = path.join(process.cwd(), '.env.local');
const envText = fs.readFileSync(envPath, 'utf8');
for (const line of envText.split('\n')) {
  const [k, ...v] = line.split('=');
  if (k && v.length) process.env[k.trim()] = v.join('=').trim();
}

import pg from 'pg';
import { PostgresQueryBuilder } from './lib/supabase/postgresClient';

async function run() {
  const checkoutRef = 'fb86ef30-a1aa-49ee-aa38-c358938cb862';
  const iccid = '8910300000063656748';

  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: false,
  });

  console.log('=== RAW PG QUERY ===');
  const resRaw = await pool.query(
    'SELECT * FROM orders WHERE checkout_ref = $1 AND iccid = $2 AND status = $3',
    [checkoutRef, iccid, 'completed']
  );
  console.log('Raw PG result:', resRaw.rows);

  console.log('=== POSTGRES QUERY BUILDER STEP 2 ===');
  const qbRes = await new PostgresQueryBuilder('orders')
    .select('*')
    .eq('checkout_ref', checkoutRef)
    .eq('iccid', iccid)
    .eq('status', 'completed');
  console.log('PostgresQueryBuilder result:', qbRes);

  await pool.end();
}

run().catch(console.error);
