/**
 * Live crypto → EUR rates for checkout pricing.
 * Multi-tier resilient fallback:
 * 1. Coinbase Public Rates API (Fast, globally distributed, highly reliable)
 * 2. Binance EUR ticker
 * 3. CoinGecko API (with proper User-Agent)
 * 4. Database-cached display_rates from system_settings
 * 5. Robust baseline market rates (guarantees checkout never crashes)
 */
import { createServiceClient } from '@/lib/supabase/server';

const BINANCE_SYMBOL: Record<string, string> = {
  bitcoin: 'BTCEUR', btc: 'BTCEUR',
  litecoin: 'LTCEUR', ltc: 'LTCEUR',
  ethereum: 'ETHEUR', eth: 'ETHEUR',
  solana: 'SOLEUR', sol: 'SOLEUR',
  tron: 'TRXEUR', trx: 'TRXEUR',
};

const COINBASE_PAIR: Record<string, string> = {
  bitcoin: 'BTC', btc: 'BTC',
  litecoin: 'LTC', ltc: 'LTC',
  ethereum: 'ETH', eth: 'ETH',
  solana: 'SOL', sol: 'SOL',
  tron: 'TRX', trx: 'TRX',
  tether: 'USDT', usdt: 'USDT',
  'usd-coin': 'USDC', usdc: 'USDC',
  'the-open-network': 'TON', ton: 'TON',
};

const BASELINE_RATES: Record<string, number> = {
  bitcoin: 65000.0, btc: 65000.0,
  litecoin: 65.0, ltc: 65.0,
  ethereum: 2500.0, eth: 2500.0,
  solana: 110.0, sol: 110.0,
  tron: 0.25, trx: 0.25,
  tether: 0.92, usdt: 0.92,
  'usd-coin': 0.92, usdc: 0.92,
  'the-open-network': 2.0, ton: 2.0,
};

/** EUR price of 1 unit of the coin (e.g. 1 BTC = 65000 EUR, 1 SOL = 105 EUR). */
export async function getCoinEurRate(coingeckoIdOrCode: string): Promise<number> {
  const key = coingeckoIdOrCode.toLowerCase();
  const code = coingeckoIdOrCode.toUpperCase();

  // 1) Coinbase Public Rates API
  const cbCoin = COINBASE_PAIR[key] || COINBASE_PAIR[code];
  if (cbCoin) {
    try {
      const res = await fetch(`https://api.coinbase.com/v2/exchange-rates?currency=EUR`, {
        signal: AbortSignal.timeout(3500),
        headers: { Accept: 'application/json', 'User-Agent': 'PureSim/1.0' },
      });
      if (res.ok) {
        const data = await res.json() as { data?: { rates?: Record<string, string> } };
        const cryptoPerEur = parseFloat(data?.data?.rates?.[cbCoin] || '0');
        if (cryptoPerEur > 0) {
          const eurPerCrypto = 1 / cryptoPerEur;
          if (eurPerCrypto > 0) return eurPerCrypto;
        }
      }
    } catch {}
  }

  // 2) Binance EUR ticker
  const symbol = BINANCE_SYMBOL[key] || BINANCE_SYMBOL[code];
  if (symbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { signal: AbortSignal.timeout(3500), headers: { accept: 'application/json', 'User-Agent': 'PureSim/1.0' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return v;
      }
    } catch {}
  } else if (key === 'tether' || code === 'USDT') {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT`,
        { signal: AbortSignal.timeout(3500), headers: { accept: 'application/json', 'User-Agent': 'PureSim/1.0' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return 1 / v;
      }
    } catch {}
  } else if (key === 'usd-coin' || code === 'USDC') {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC`,
        { signal: AbortSignal.timeout(3500), headers: { accept: 'application/json', 'User-Agent': 'PureSim/1.0' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return 1 / v;
      }
    } catch {}
  } else if (key === 'the-open-network' || code === 'TON') {
    try {
      const [resTon, resEur] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT`, { signal: AbortSignal.timeout(3500) }),
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT`, { signal: AbortSignal.timeout(3500) }),
      ]);
      if (resTon.ok && resEur.ok) {
        const jTon = await resTon.json() as { price?: string };
        const jEur = await resEur.json() as { price?: string };
        const vTon = jTon?.price ? parseFloat(jTon.price) : 0;
        const vEur = jEur?.price ? parseFloat(jEur.price) : 0;
        if (vTon > 0 && vEur > 0) return vTon / vEur;
      }
    } catch {}
  }

  // 3) CoinGecko
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(key)}&vs_currencies=eur`,
      { signal: AbortSignal.timeout(3500), headers: { accept: 'application/json', 'User-Agent': 'PureSim/1.0' } },
    );
    if (res.ok) {
      const j = await res.json() as Record<string, { eur?: number }>;
      const v = j?.[key]?.eur;
      if (typeof v === 'number' && v > 0) return v;
    }
  } catch {}

  // 4) Database-cached display_rates
  try {
    const db = createServiceClient();
    const { data: row } = await db
      .from('system_settings')
      .select('value')
      .eq('key', 'display_rates')
      .maybeSingle();

    if (row?.value) {
      const parsed = JSON.parse(row.value) as { rates?: Record<string, number> };
      const coinRate = parsed?.rates?.[code] || parsed?.rates?.[key.toUpperCase()];
      if (typeof coinRate === 'number' && coinRate > 0) {
        // display_rates stores units per 1 EUR, so 1 / coinRate is EUR per 1 coin
        const eurPerUnit = 1 / coinRate;
        if (eurPerUnit > 0) {
          console.warn(`[rates] Used database display_rates fallback for ${coingeckoIdOrCode}: ${eurPerUnit}`);
          return eurPerUnit;
        }
      }
    }
  } catch {}

  // 5) Safe baseline rate fallback (guarantees checkout never aborts)
  const baseline = BASELINE_RATES[key] || BASELINE_RATES[code] || 1.0;
  console.warn(`[rates] Used baseline rate fallback for ${coingeckoIdOrCode}: ${baseline}`);
  return baseline;
}
