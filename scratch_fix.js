const fs = require('fs');
const path = require('path');
const https = require('https');

// Read .env.local manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/^"|"$/g, '');
    }
    env[match[1]] = value.trim();
  }
});

const urlStr = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!urlStr || !serviceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

function supabaseRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${urlStr}/rest/v1/${path}`);
    const options = {
      method: method || 'GET',
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch {
          resolve(data);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  console.log('1. Updating crypto_coins min_payment_pct to 98...');
  const coinsRes = await supabaseRequest('crypto_coins?min_payment_pct=gte.0', 'PATCH', { min_payment_pct: 98 });
  console.log('crypto_coins update result:', coinsRes);

  console.log('2. Fetching session 056adaca-965f-4a07-ab23-57ba867b2660...');
  const sessions = await supabaseRequest('crypto_sessions?id=eq.056adaca-965f-4a07-ab23-57ba867b2660', 'GET');
  console.log('Session data:', sessions);

  if (Array.isArray(sessions) && sessions.length > 0) {
    const s = sessions[0];
    const expected = Number(s.crypto_amount);
    const received = Number(s.received_amount || 0.02555450);
    const threshold = expected * 0.98;

    console.log(`Checking: received ${received} >= threshold ${threshold} (${expected} * 0.98) -> ${received >= threshold}`);

    if (received >= threshold) {
      console.log('Updating session to paid...');
      const sessionUpdate = await supabaseRequest(`crypto_sessions?id=eq.${s.id}`, 'PATCH', {
        status: 'paid',
        received_amount: received,
        paid_at: new Date().toISOString()
      });
      console.log('Session update result:', sessionUpdate);

      if (s.order_ids && s.order_ids.length > 0) {
        console.log('Updating orders to paid:', s.order_ids);
        for (const orderId of s.order_ids) {
          const orderUpdate = await supabaseRequest(`orders?id=eq.${orderId}`, 'PATCH', {
            status: 'paid',
            payment_confirmed_at: new Date().toISOString()
          });
          console.log(`Order ${orderId} update result:`, orderUpdate);
        }
      }
    }
  }
}

main().catch(console.error);
