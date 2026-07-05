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

export async function getOfferableCoins(): Promise<CoinConfig[]> {
  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('enabled', true)
    .order('sort_order', { ascending: true });

  const activeCoins = data ?? [];

  return activeCoins.map((c) => ({
    ...c,
    walletAddress: 'derived',
  }));
}

/** A single enabled coin by code. */
export async function getCoin(code: string): Promise<CoinConfig | null> {
  const db = createServiceClient();
  const { data } = await db
    .from('crypto_coins')
    .select('*')
    .eq('code', code.toUpperCase())
    .eq('enabled', true)
    .maybeSingle();
    
  if (!data) return null;
  return {
    ...data,
    walletAddress: 'derived',
  };
}

/** Build a native crypto payment URI. */
export function buildPaymentUri(coin: CoinConfig, amount: string, memo?: string | null): string {
  return `${coin.uri_scheme}:${coin.walletAddress}?amount=${amount}`;
}
