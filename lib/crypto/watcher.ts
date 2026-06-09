/**
 * Blockchain watcher — scans the receiving wallets for the exact expected
 * amounts (incl. the 4-digit slot) and confirms payments using each coin's
 * configurable confirmation threshold. On success it fulfils the orders.
 *
 * Chain adapters are pluggable. BTC/LTC use Blockchair, ETH uses Etherscan,
 * SOL uses the Solana JSON-RPC. All adapters are defensive (never throw) so a
 * single failing provider can't break the whole run.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders }       from '@/lib/fulfillment';

export interface IncomingPayment {
  amount:        number; // in whole coins
  txHash:        string;
  confirmations: number;
}

type Adapter = (address: string) => Promise<IncomingPayment[]>;

// ── BTC / LTC via Blockchair ────────────────────────────────
function blockchairAdapter(chain: 'bitcoin' | 'litecoin'): Adapter {
  return async (address) => {
    try {
      const key = process.env.BLOCKCHAIR_API_KEY ? `&key=${process.env.BLOCKCHAIR_API_KEY}` : '';
      const url = `https://api.blockchair.com/${chain}/outputs?q=recipient(${address})&limit=100${key}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!res.ok) return [];
      const j = await res.json() as { data?: Array<{ transaction_hash: string; value: number; block_id: number }>; context?: { state?: number } };
      const height = j.context?.state ?? 0;
      return (j.data ?? []).map((o) => ({
        amount:        Number(o.value) / 1e8,
        txHash:        o.transaction_hash,
        confirmations: o.block_id && o.block_id > 0 ? Math.max(0, height - o.block_id + 1) : 0,
      }));
    } catch (err) {
      console.error(`[watcher:${chain}]`, err);
      return [];
    }
  };
}

// ── ETH via Etherscan ───────────────────────────────────────
const ethAdapter: Adapter = async (address) => {
  try {
    const key = process.env.ETHERSCAN_API_KEY ?? '';
    const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&sort=desc&page=1&offset=50&apikey=${key}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000) });
    if (!res.ok) return [];
    const j = await res.json() as { status?: string; result?: Array<{ hash: string; to: string; value: string; confirmations: string; isError: string }> };
    if (!Array.isArray(j.result)) return [];
    return j.result
      .filter((tx) => tx.to?.toLowerCase() === address.toLowerCase() && tx.isError === '0')
      .map((tx) => ({
        amount:        Number(tx.value) / 1e18,
        txHash:        tx.hash,
        confirmations: parseInt(tx.confirmations, 10) || 0,
      }));
  } catch (err) {
    console.error('[watcher:ethereum]', err);
    return [];
  }
};

// ── SOL via Solana JSON-RPC ─────────────────────────────────
const solAdapter: Adapter = async (address) => {
  const rpc = process.env.SOLANA_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  try {
    const sigRes = await fetch(rpc, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getSignaturesForAddress', params: [address, { limit: 20 }] }),
      signal: AbortSignal.timeout(15_000),
    });
    const sigJson = await sigRes.json() as { result?: Array<{ signature: string; confirmationStatus?: string; confirmations?: number | null; err: unknown }> };
    const sigs = (sigJson.result ?? []).filter((s) => !s.err);
    const out: IncomingPayment[] = [];

    for (const s of sigs.slice(0, 12)) {
      const txRes = await fetch(rpc, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [s.signature, { maxSupportedTransactionVersion: 0, encoding: 'jsonParsed' }] }),
        signal: AbortSignal.timeout(15_000),
      });
      const txJson = await txRes.json() as {
        result?: { meta?: { preBalances: number[]; postBalances: number[] }; transaction?: { message?: { accountKeys: Array<{ pubkey: string } | string> } } };
      };
      const meta = txJson.result?.meta;
      const keys = txJson.result?.transaction?.message?.accountKeys ?? [];
      const idx = keys.findIndex((k) => (typeof k === 'string' ? k : k.pubkey) === address);
      if (meta && idx >= 0) {
        const delta = (meta.postBalances[idx] - meta.preBalances[idx]) / 1e9;
        if (delta > 0) {
          const confs = s.confirmationStatus === 'finalized' ? 32 : (s.confirmations ?? (s.confirmationStatus === 'confirmed' ? 1 : 0));
          out.push({ amount: delta, txHash: s.signature, confirmations: confs });
        }
      }
    }
    return out;
  } catch (err) {
    console.error('[watcher:solana]', err);
    return [];
  }
};

function adapterFor(chain: string): Adapter | null {
  switch (chain) {
    case 'bitcoin':  return blockchairAdapter('bitcoin');
    case 'litecoin': return blockchairAdapter('litecoin');
    case 'ethereum': return ethAdapter;
    case 'solana':   return solAdapter;
    default:         return null;
  }
}

export interface WatchResult { scanned: number; matched: number; paid: number; expired: number }

/** One watcher pass over all active sessions. Idempotent & safe to run often. */
export async function runWatcher(): Promise<WatchResult> {
  const db = createServiceClient();
  const nowIso = new Date().toISOString();

  // Expire stale, still-pending sessions (no detected tx).
  const { data: expiredRows } = await db
    .from('crypto_sessions')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', nowIso)
    .select('id');

  // Active sessions still awaiting payment / confirmations.
  const { data: sessions } = await db
    .from('crypto_sessions')
    .select('*, crypto_coins(chain)')
    .in('status', ['pending', 'detected'])
    .order('created_at', { ascending: true });

  const result: WatchResult = { scanned: sessions?.length ?? 0, matched: 0, paid: 0, expired: expiredRows?.length ?? 0 };
  if (!sessions || sessions.length === 0) return result;

  // Cache address scans within this run to avoid duplicate API calls.
  const cache = new Map<string, IncomingPayment[]>();

  for (const s of sessions) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chain = (s as any).crypto_coins?.chain as string | undefined;
    if (!chain) continue;
    const adapter = adapterFor(chain);
    if (!adapter) continue;

    const cacheKey = `${chain}:${s.wallet_address}`;
    let payments = cache.get(cacheKey);
    if (!payments) { payments = await adapter(s.wallet_address); cache.set(cacheKey, payments); }

    // Decimals-aware exact match (slot precision).
    const expected = Number(s.crypto_amount);
    const tolerance = 0.5 / Math.pow(10, 8); // half a satoshi-class unit
    const match = payments.find((p) => Math.abs(p.amount - expected) <= tolerance + 1e-12);
    if (!match) continue;

    result.matched++;

    if (match.confirmations >= s.confirmations_required) {
      // ── Confirmed → mark paid, fulfil orders (idempotent) ──
      await db.from('crypto_sessions').update({
        status: 'paid', tx_hash: match.txHash,
        confirmations: match.confirmations, paid_at: new Date().toISOString(),
      }).eq('id', s.id).neq('status', 'paid');

      await db.from('orders').update({
        status: 'paid', payment_confirmed_at: new Date().toISOString(),
      }).in('id', s.order_ids).neq('status', 'completed');

      await fulfillOrders(db, s.order_ids);
      result.paid++;
    } else {
      // ── Seen but not yet enough confirmations ──
      await db.from('crypto_sessions').update({
        status: 'detected', tx_hash: match.txHash, confirmations: match.confirmations,
      }).eq('id', s.id);
    }
  }

  return result;
}
