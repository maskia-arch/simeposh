/**
 * Crypto coin configuration.
 *
 * A coin is offered to customers when it is enabled in the crypto_coins table.
 * Address derivation is handled dynamically at runtime by the gateway.
 */
import { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type CoinRow = Database['public']['Tables']['crypto_coins']['Row'];
export type CoinConfig = CoinRow & { walletAddress: string };

const COINS_CACHE = new Map<string, { coin: CoinConfig | null; expiresAt: number }>();
let ALL_COINS_CACHE: { coins: CoinConfig[]; expiresAt: number } | null = null;
const COINS_CACHE_TTL_MS = 60 * 1000;

export async function getOfferableCoins(): Promise<CoinConfig[]> {
  if (ALL_COINS_CACHE && Date.now() < ALL_COINS_CACHE.expiresAt) {
    return ALL_COINS_CACHE.coins;
  }

  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  const supported = ['LTC', 'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'TRX', 'TON'];
  const activeCoins = (data ?? []).filter((c) => supported.includes(c.code.toUpperCase()));

  const result = activeCoins.map((c) => ({
    ...c,
    walletAddress: 'derived',
  }));

  ALL_COINS_CACHE = { coins: result, expiresAt: Date.now() + COINS_CACHE_TTL_MS };
  for (const c of result) {
    COINS_CACHE.set(c.code.toUpperCase(), { coin: c, expiresAt: Date.now() + COINS_CACHE_TTL_MS });
  }

  return result;
}

/** A single enabled coin by code. */
export async function getCoin(code: string): Promise<CoinConfig | null> {
  const upperCode = code.toUpperCase();
  const supported = ['LTC', 'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'TRX', 'TON'];
  if (!supported.includes(upperCode)) return null;

  const cached = COINS_CACHE.get(upperCode);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.coin;
  }

  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('code', upperCode)
    .eq('enabled', true)
    .maybeSingle();
    
  if (!data) {
    COINS_CACHE.set(upperCode, { coin: null, expiresAt: Date.now() + 10 * 1000 });
    return null;
  }
  const coinConfig: CoinConfig = {
    ...data,
    walletAddress: 'derived',
  };
  COINS_CACHE.set(upperCode, { coin: coinConfig, expiresAt: Date.now() + COINS_CACHE_TTL_MS });
  return coinConfig;
}

/** Build a native crypto payment URI. */
export function buildPaymentUri(coin: CoinConfig, amount: string, memo?: string | null): string {
  return `${coin.uri_scheme}:${coin.walletAddress}?amount=${amount}`;
}
