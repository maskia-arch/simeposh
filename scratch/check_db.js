const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
if (fs.existsSync('.env.local')) {
  const env = fs.readFileSync('.env.local', 'utf8');
  for (const line of env.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing env vars');
    return;
  }
  const supabase = createClient(url, key);
  
  console.log('Checking crypto_coins table...');
  const { data: coins, error: coinsErr } = await supabase.from('crypto_coins').select('*');
  if (coinsErr) {
    console.error('Error fetching coins:', coinsErr);
  } else {
    console.log('Existing coins:', coins.map(c => c.code));
  }

  console.log('Checking crypto_sessions columns...');
  const { data: session, error: sessionErr } = await supabase.from('crypto_sessions').select('*').limit(1).maybeSingle();
  if (sessionErr) {
    console.error('Error fetching session:', sessionErr);
  } else if (session) {
    console.log('Keys in crypto_sessions:', Object.keys(session));
  } else {
    console.log('No sessions found in database, checking table structure by trying to select payment_memo...');
    const { data, error } = await supabase.from('crypto_sessions').select('payment_memo').limit(1);
    if (error) {
      console.log('payment_memo column does NOT exist:', error.message);
    } else {
      console.log('payment_memo column EXISTS!');
    }
  }
}

run();
