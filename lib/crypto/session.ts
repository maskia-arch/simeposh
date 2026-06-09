/**
 * Crypto checkout session creation — the server-authoritative pricing flow.
 *
 *   1. base EUR price (from the order, never the client)
 *   2. + coin surcharge (percent and/or fixed)            → fiat target
 *   3. convert to crypto via a live rate
 *   4. reserve a free 4-digit slot id and embed it in the LAST 4 decimals
 *   5. fix the exact crypto amount + rate for 20 minutes
 *
 * Example: base 0.16000000 LTC → reserved slot 1121 → 0.16001121 LTC.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { getCoin, buildPaymentUri, type CoinConfig } from '@/lib/crypto/coins';
import { getCoinEurRate } from '@/lib/crypto/rates';

export const SESSION_TTL_MS = 20 * 60 * 1000; // 20 minutes
const SLOT_MODULUS = 10_000;                  // last 4 decimals = slot id
const MAX_SLOT_TRIES = 40;

export interface CryptoSession {
  id:            string;
  coin:          string;
  walletAddress: string;
  cryptoAmount:  string;   // exact expected amount, fixed decimals
  amountEur:     number;
  baseEur:       number;
  surchargePct:  number;
  surchargeFixedEur: number;
  rateEur:       number;
  slotId:        number;
  confirmationsRequired: number;
  paymentUri:    string;
  expiresAt:     string;
}

function roundEur(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Apply the coin surcharge to the base EUR price. */
export function applySurcharge(baseEur: number, coin: CoinConfig): number {
  const withPct = baseEur * (1 + Number(coin.surcharge_pct) / 100);
  return roundEur(withPct + Number(coin.surcharge_fixed_eur));
}

/**
 * Create a fixed-amount crypto session for a set of already-created (pending)
 * orders. Returns the session the customer must pay.
 */
export async function createCryptoSession(opts: {
  orderIds: string[];
  email:    string;
  baseEur:  number;
  coinCode: string;
}): Promise<CryptoSession> {
  const coin = await getCoin(opts.coinCode);
  if (!coin) throw new Error(`Coin ${opts.coinCode} is not available`);

  const db = createServiceClient();

  // 1+2. fiat target incl. surcharge
  const amountEur = applySurcharge(opts.baseEur, coin);

  // 3. convert to crypto
  const rateEur = await getCoinEurRate(coin.coingecko_id);
  const rawCrypto = amountEur / rateEur; // coins

  // 4. compute the base block (round UP so the amount always covers the price)
  const factor = Math.pow(10, coin.decimals);          // e.g. 1e8 for LTC
  const rawUnits = Math.ceil(rawCrypto * factor);       // integer smallest-units
  const baseBlock = Math.ceil(rawUnits / SLOT_MODULUS) * SLOT_MODULUS; // zero last 4 digits, round up

  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  // Reserve a free slot: the (coin, crypto_amount) unique index guarantees
  // exclusivity; we retry with a new random slot on collision.
  for (let attempt = 0; attempt < MAX_SLOT_TRIES; attempt++) {
    const slotId = Math.floor(Math.random() * SLOT_MODULUS);
    const units  = baseBlock + slotId;
    const cryptoAmount = (units / factor).toFixed(coin.decimals);

    const { data, error } = await db.from('crypto_sessions').insert({
      order_ids:              opts.orderIds,
      customer_email:         opts.email,
      coin:                   coin.code,
      wallet_address:         coin.walletAddress,
      base_eur:               roundEur(opts.baseEur),
      amount_eur:             amountEur,
      surcharge_pct:          Number(coin.surcharge_pct),
      surcharge_fixed_eur:    Number(coin.surcharge_fixed_eur),
      rate_eur:               rateEur,
      slot_id:                slotId,
      crypto_amount:          Number(cryptoAmount),
      confirmations_required: coin.confirmations,
      status:                 'pending',
      expires_at:             expiresAt,
    }).select('id').single();

    if (!error && data) {
      return {
        id: data.id,
        coin: coin.code,
        walletAddress: coin.walletAddress,
        cryptoAmount,
        amountEur,
        baseEur: roundEur(opts.baseEur),
        surchargePct: Number(coin.surcharge_pct),
        surchargeFixedEur: Number(coin.surcharge_fixed_eur),
        rateEur,
        slotId,
        confirmationsRequired: coin.confirmations,
        paymentUri: buildPaymentUri(coin, cryptoAmount),
        expiresAt,
      };
    }

    // 23505 = unique_violation → slot taken, retry; otherwise abort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.code && (error as any).code !== '23505') {
      throw new Error(`crypto session insert failed: ${error!.message}`);
    }
  }

  throw new Error('No free payment slot available, please retry');
}
