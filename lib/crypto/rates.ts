/**
 * Live crypto → EUR rates for checkout pricing.
 * Primary: CoinGecko. Fallback: Binance EUR ticker. Throws if both fail
 * (we must never price an order on a stale/guessed rate).
 */

const BINANCE_SYMBOL: Record<string, string> = {
  bitcoin: 'BTCEUR', litecoin: 'LTCEUR', ethereum: 'ETHEUR', solana: 'SOLEUR', tron: 'TRXEUR',
};

/** EUR price of 1 unit of the coin (e.g. 1 BTC = 60000 EUR). */
export async function getCoinEurRate(coingeckoId: string): Promise<number> {
  // 1) CoinGecko
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(coingeckoId)}&vs_currencies=eur`,
      { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } },
    );
    if (res.ok) {
      const j = await res.json() as Record<string, { eur?: number }>;
      const v = j?.[coingeckoId]?.eur;
      if (typeof v === 'number' && v > 0) return v;
    }
  } catch { /* try fallback */ }

  // 2) Binance EUR ticker
  const symbol = BINANCE_SYMBOL[coingeckoId];
  if (symbol) {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`,
        { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return v;
      }
    } catch { /* fall through */ }
  } else if (coingeckoId === 'tether') {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT`,
        { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return 1 / v;
      }
    } catch { /* fall through */ }
  } else if (coingeckoId === 'usd-coin') {
    try {
      const res = await fetch(
        `https://api.binance.com/api/v3/ticker/price?symbol=EURUSDC`,
        { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } },
      );
      if (res.ok) {
        const j = await res.json() as { price?: string };
        const v = j?.price ? parseFloat(j.price) : 0;
        if (v > 0) return 1 / v;
      }
    } catch { /* fall through */ }
  } else if (coingeckoId === 'the-open-network') {
    try {
      const [resTon, resEur] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=TONUSDT`, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } }),
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=EURUSDT`, { signal: AbortSignal.timeout(10_000), headers: { accept: 'application/json' } }),
      ]);
      if (resTon.ok && resEur.ok) {
        const jTon = await resTon.json() as { price?: string };
        const jEur = await resEur.json() as { price?: string };
        const vTon = jTon?.price ? parseFloat(jTon.price) : 0;
        const vEur = jEur?.price ? parseFloat(jEur.price) : 0;
        if (vTon > 0 && vEur > 0) return vTon / vEur;
      }
    } catch { /* fall through */ }
  }

  throw new Error(`No reliable EUR rate available for ${coingeckoId}`);
}
