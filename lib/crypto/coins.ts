/**
 * Crypto coin configuration.
 *
 * ENVIRONMENT CHECK: a coin is only ever offered to customers when BOTH
 *   (a) it is enabled in the crypto_coins table, AND
 *   (b) its main receiving wallet is set as an env var (WALLET_<CODE>).
 * The wallet address NEVER lives in the database.
 */
import { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';

export type CoinRow = Database['public']['Tables']['crypto_coins']['Row'];
export type CoinConfig = CoinRow & { walletAddress: string };

export function walletForCoin(code: string): string | null {
  const v = process.env[`WALLET_${code.toUpperCase()}`];
  return v && v.trim() ? v.trim() : null;
}

/** All coins that are enabled AND have a configured wallet (offerable). */
export async function getOfferableCoins(): Promise<CoinConfig[]> {
  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  const out: CoinConfig[] = [];
  for (const c of data ?? []) {
    const wallet = walletForCoin(c.code);
    if (!wallet) continue;
    out.push({ ...c, walletAddress: wallet });
  }
  return out;
}

/** A single offerable coin by code, or null if disabled / no wallet. */
export async function getCoin(code: string): Promise<CoinConfig | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('enabled', true)
    .maybeSingle();
  if (!data) return null;
  const wallet = walletForCoin(data.code);
  if (!wallet) return null;
  return { ...data, walletAddress: wallet };
}

/** Build a native crypto payment URI (e.g. litecoin:ADDR?amount=0.16001121). */
export function buildPaymentUri(coin: CoinConfig, amount: string): string {
  return `${coin.uri_scheme}:${coin.walletAddress}?amount=${amount}`;
}
