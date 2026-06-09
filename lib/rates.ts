/**
 * Display-currency exchange rates (server-side).
 *
 * Rates are stored in system_settings as JSON and refreshed at most every
 * 5 minutes. Both the public /api/rates route (lazy refresh on access) and
 * the /api/cron/rates endpoint (scheduled background refresh) use getRates().
 *
 * All rates are "units of currency per 1 EUR" (EUR = 1).
 */
import { createServiceClient } from '@/lib/supabase/server';
import { fetchUsdEurRate }     from '@/lib/pricing';
import type { Rates }          from '@/lib/currency';

const KEY      = 'display_rates';
const MAX_AGE  = 5 * 60 * 1000; // 5 minutes

export interface StoredRates {
  base:      'EUR';
  rates:     Rates;
  updatedAt: string;
}

/** Sensible fallback so the UI never breaks if all providers fail. */
const FALLBACK: Rates = { EUR: 1, USD: 1.08, BTC: 0.000016, ETH: 0.0004, LTC: 0.012, SOL: 0.007 };

export async function getRates(forceRefresh = false): Promise<StoredRates> {
  const db = createServiceClient();

  if (!forceRefresh) {
    const { data } = await db.from('system_settings').select('value').eq('key', KEY).single();
    if (data?.value) {
      try {
        const parsed = JSON.parse(data.value) as StoredRates;
        if (parsed?.updatedAt && Date.now() - new Date(parsed.updatedAt).getTime() < MAX_AGE) {
          return parsed;
        }
      } catch { /* fall through to refresh */ }
    }
  }

  return fetchAndStore(db);
}

async function fetchAndStore(db: ReturnType<typeof createServiceClient>): Promise<StoredRates> {
  const rates: Rates = { EUR: 1 };

  // ── Fiat: USD per EUR ───────────────────────────────────────
  try {
    const usdEur = await fetchUsdEurRate(0.92); // USD→EUR (e.g. 0.92)
    rates.USD = usdEur > 0 ? Math.round((1 / usdEur) * 1e6) / 1e6 : FALLBACK.USD;
  } catch {
    rates.USD = FALLBACK.USD;
  }

  // ── Crypto: EUR price per coin → coins per EUR (CoinGecko) ───
  try {
    const res = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,litecoin,solana&vs_currencies=eur',
      { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } },
    );
    if (res.ok) {
      const j = await res.json() as Record<string, { eur?: number }>;
      const set = (code: keyof Rates, id: string) => {
        const eurPer = j?.[id]?.eur;
        if (typeof eurPer === 'number' && eurPer > 0) rates[code] = 1 / eurPer;
      };
      set('BTC', 'bitcoin');
      set('ETH', 'ethereum');
      set('LTC', 'litecoin');
      set('SOL', 'solana');
    }
  } catch { /* keep whatever we have */ }

  // Fill any missing crypto with fallback so options always work
  for (const k of ['BTC', 'ETH', 'LTC', 'SOL'] as const) {
    if (!rates[k] || rates[k]! <= 0) rates[k] = FALLBACK[k];
  }

  const stored: StoredRates = { base: 'EUR', rates, updatedAt: new Date().toISOString() };

  await db.from('system_settings').upsert(
    { key: KEY, value: JSON.stringify(stored), description: 'Display currency rates (units per 1 EUR)' },
    { onConflict: 'key' },
  );

  return stored;
}
