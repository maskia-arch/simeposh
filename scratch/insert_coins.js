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

  console.log('Inserting new coins into crypto_coins...');
  const newCoins = [
    { code: 'USDT', name: 'USDT (ETH)', enabled: true, surcharge_pct: 0, confirmations: 1, decimals: 6, coingecko_id: 'tether', uri_scheme: 'ethereum', chain: 'ethereum_usdt', sort_order: 5 },
    { code: 'USDC', name: 'USDC (ETH)', enabled: true, surcharge_pct: 0, confirmations: 1, decimals: 6, coingecko_id: 'usd-coin', uri_scheme: 'ethereum', chain: 'ethereum_usdc', sort_order: 6 },
    { code: 'TON', name: 'Toncoin', enabled: true, surcharge_pct: 0, confirmations: 1, decimals: 9, coingecko_id: 'the-open-network', uri_scheme: 'ton', chain: 'ton', sort_order: 7 },
    { code: 'TRX', name: 'Tron', enabled: true, surcharge_pct: 0, confirmations: 1, decimals: 6, coingecko_id: 'tron', uri_scheme: 'tron', chain: 'tron', sort_order: 8 }
  ];

  for (const coin of newCoins) {
    const { error } = await supabase.from('crypto_coins').upsert(coin, { onConflict: 'code' });
    if (error) {
      console.error(`Failed to insert ${coin.code}:`, error.message);
    } else {
      console.log(`Successfully upserted ${coin.code}`);
    }
  }
}

run();
