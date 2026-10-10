/**
 * GET /api/crypto/session/[id]
 * Public status of a crypto checkout session (polled by the checkout UI).
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';
import { sendUnderpaymentEmail } from '@/lib/email/mailer';
import { getPool } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkBtcLtcAddress(
  address: string,
  coinCode: string,
  createdAfter?: Date,
  claimedTxHashes?: Set<string>,
  expiresAt?: Date
): Promise<{ received: number; confirmations: number; txid: string | null }> {
  const isLtc = coinCode === 'LTC';
  const minTimestamp = createdAfter ? (createdAfter.getTime() - 5 * 60 * 1000) : (Date.now() - 35 * 60 * 1000);
  const maxTimestamp = expiresAt
    ? (expiresAt.getTime() + 30 * 60 * 1000)
    : (createdAfter ? (createdAfter.getTime() + 60 * 60 * 1000) : (Date.now() + 10 * 60 * 1000));

  // Helper for BlockCypher parsing
  const checkBlockCypher = async (): Promise<ChainCheckResult | null> => {
    try {
      const chainPath = isLtc ? 'ltc/main' : 'btc/main';
      const cypherRes = await fetch(`https://api.blockcypher.com/v1/${chainPath}/addrs/${address}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(4000)
      });
      if (!cypherRes.ok) return null;
      const data = await cypherRes.json();
      let totalReceivedSat = 0;
      let latestTxid: string | null = null;
      let maxConfs = 0;

      const allRefs: any[] = [
        ...(Array.isArray(data.txrefs) ? data.txrefs : []),
        ...(Array.isArray(data.unconfirmed_txrefs) ? data.unconfirmed_txrefs : []),
      ];

      for (const ref of allRefs) {
        const isIncoming = (ref.tx_output_n !== undefined && ref.tx_output_n >= 0) || ref.tx_input_n === -1;
        if (!isIncoming || !ref.value || ref.value <= 0) continue;
        if (claimedTxHashes && ref.tx_hash && claimedTxHashes.has(ref.tx_hash)) continue;

        if (ref.confirmed) {
          const refTime = new Date(ref.confirmed).getTime();
          if (isNaN(refTime) || refTime < minTimestamp || refTime > maxTimestamp) continue;
        } else if (ref.received) {
          const refTime = new Date(ref.received).getTime();
          if (!isNaN(refTime) && (refTime < minTimestamp || refTime > maxTimestamp)) continue;
        } else if (Date.now() > maxTimestamp) {
          continue;
        }

        totalReceivedSat += Number(ref.value || 0);
        latestTxid = ref.tx_hash || latestTxid;
        const conf = Number(ref.confirmations || (ref.confirmed ? 1 : 0));
        if (conf > maxConfs) maxConfs = conf;
      }

      return {
        received: totalReceivedSat / 1e8,
        confirmations: maxConfs,
        txid: latestTxid,
      };
    } catch {
      return null;
    }
  };

  // Helper for Mempool / Space API parsing
  const checkMempoolExplorer = async (baseUrl: string): Promise<ChainCheckResult | null> => {
    try {
      const timeoutMs = isLtc ? 2500 : 4000;
      const txsRes = await fetch(`${baseUrl}/address/${address}/txs`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (!txsRes.ok) return null;
      const txs = await txsRes.json() as any[];

      let tipHeight = 0;
      try {
        const tipRes = await fetch(`${baseUrl}/blocks/tip/height`, {
          cache: 'no-store',
          signal: AbortSignal.timeout(2000)
        });
        if (tipRes.ok) tipHeight = parseInt((await tipRes.text()).trim(), 10);
      } catch {}

      let totalReceivedSat = 0;
      let maxConfirmations = 0;
      let lastTxid: string | null = null;

      for (const tx of txs) {
        if (claimedTxHashes && tx.txid && claimedTxHashes.has(tx.txid)) continue;
        if (tx.status?.confirmed) {
          if (tx.status.block_time) {
            const txTimeMs = tx.status.block_time * 1000;
            if (txTimeMs < minTimestamp || txTimeMs > maxTimestamp) continue;
          } else {
            continue;
          }
        } else if (Date.now() > maxTimestamp) {
          continue;
        }

        let txReceived = 0;
        if (Array.isArray(tx.vout)) {
          for (const out of tx.vout) {
            if (out.scriptpubkey_address === address && typeof out.value === 'number') {
              txReceived += out.value;
            }
          }
        }

        if (txReceived > 0) {
          totalReceivedSat += txReceived;
          lastTxid = tx.txid;
          let txConf = 0;
          if (tx.status && tx.status.confirmed && tx.status.block_height) {
            txConf = Math.max(1, tipHeight > 0 ? tipHeight - tx.status.block_height + 1 : 1);
          }
          if (txConf > maxConfirmations) maxConfirmations = txConf;
        }
      }

      return {
        received: totalReceivedSat / 1e8,
        confirmations: maxConfirmations,
        txid: lastTxid
      };
    } catch {
      return null;
    }
  };

  // Helper for litecoinblockexplorer.net (Insight API)
  const checkLitecoinBlockExplorer = async (): Promise<ChainCheckResult | null> => {
    try {
      const addrRes = await fetch(`https://litecoinblockexplorer.net/api/address/${address}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(3500)
      });
      if (!addrRes.ok) return null;
      const addrData = await addrRes.json();
      const txids = Array.isArray(addrData.transactions) ? addrData.transactions.slice(0, 15) : [];
      if (txids.length === 0) return { received: 0, confirmations: 0, txid: null };

      let totalReceivedSat = 0;
      let latestTxid: string | null = null;
      let maxConfs = 0;

      for (const txid of txids) {
        if (claimedTxHashes && claimedTxHashes.has(txid)) continue;
        try {
          const txRes = await fetch(`https://litecoinblockexplorer.net/api/tx/${txid}`, {
            cache: 'no-store',
            signal: AbortSignal.timeout(3000)
          });
          if (!txRes.ok) continue;
          const tx = await txRes.json();

          const txTimeSec = tx.blocktime || tx.time;
          if (txTimeSec) {
            const txTimeMs = txTimeSec * 1000;
            if (txTimeMs < minTimestamp || txTimeMs > maxTimestamp) continue;
          } else if (Date.now() > maxTimestamp) {
            continue;
          }

          let txReceivedSat = 0;
          if (Array.isArray(tx.vout)) {
            for (const out of tx.vout) {
              const addrs = out.scriptPubKey?.addresses || [];
              if (addrs.includes(address)) {
                txReceivedSat += Math.round(parseFloat(out.value || 0) * 1e8);
              }
            }
          }

          if (txReceivedSat > 0) {
            totalReceivedSat += txReceivedSat;
            latestTxid = tx.txid || latestTxid;
            const conf = Number(tx.confirmations || 0);
            if (conf > maxConfs) maxConfs = conf;
          }
        } catch {}
      }

      return {
        received: totalReceivedSat / 1e8,
        confirmations: maxConfs,
        txid: latestTxid
      };
    } catch {
      return null;
    }
  };

  // For LTC: Try BlockCypher and litecoinblockexplorer.net (reliable Insight API)
  if (isLtc) {
    const ltcBlockRes = await checkLitecoinBlockExplorer();
    if (ltcBlockRes && ltcBlockRes.received > 0) return ltcBlockRes;

    const cypherResult = await checkBlockCypher();
    if (cypherResult && cypherResult.received > 0) return cypherResult;

    if (ltcBlockRes) return ltcBlockRes;
    if (cypherResult) return cypherResult;

    // Last resort fallback: litecoinspace with strict short timeout
    const spaceResult = await checkMempoolExplorer('https://litecoinspace.org/api');
    if (spaceResult) return spaceResult;
  } else {
    // For BTC: Try mempool.space and blockstream.info first, then BlockCypher
    const btcUrls = ['https://mempool.space/api', 'https://blockstream.info/api'];
    for (const u of btcUrls) {
      const res = await checkMempoolExplorer(u);
      if (res) return res;
    }
    const cypherResult = await checkBlockCypher();
    if (cypherResult) return cypherResult;
  }

  return { received: 0, confirmations: 0, txid: null };
}

interface ChainCheckResult {
  received: number;
  confirmations: number;
  txid: string | null;
}

const EVM_FALLBACK_RPCS = [
  'https://ethereum-rpc.publicnode.com',
  'https://cloudflare-eth.com',
  'https://rpc.ankr.com/eth',
  'https://rpc.flashbots.net',
  'https://mainnet.gateway.tenderly.co',
  'https://eth.merkle.io',
  'https://eth-mainnet.public.blastapi.io',
  'https://ethereum.blockpi.network/v1/rpc/public',
];

const POLYGON_FALLBACK_RPCS = [
  'https://polygon-rpc.com',
  'https://1rpc.io/matic',
  'https://polygon-bor-rpc.publicnode.com',
  'https://rpc.ankr.com/polygon',
];

const ARBITRUM_FALLBACK_RPCS = [
  'https://arb1.arbitrum.io/rpc',
  'https://1rpc.io/arb',
  'https://arbitrum-one-rpc.publicnode.com',
];

const BASE_FALLBACK_RPCS = [
  'https://mainnet.base.org',
  'https://1rpc.io/base',
  'https://base-rpc.publicnode.com',
];

const BSC_FALLBACK_RPCS = [
  'https://binance.llamarpc.com',
  'https://bsc-dataseed.binance.org',
  'https://1rpc.io/bnb',
];

const SOLANA_FALLBACK_RPCS = [
  'https://api.mainnet-beta.solana.com',
  'https://solana-rpc.publicnode.com',
  'https://rpc.ankr.com/solana',
  'https://1rpc.io/sol',
  'https://solana-mainnet.rpc.extrnode.com',
];

async function callJsonRpc(urls: string[], method: string, params: any[]): Promise<any> {
  for (const url of urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
        cache: 'no-store',
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.result !== undefined && json.result !== null) {
          return json.result;
        }
      }
    } catch {}
  }
  return null;
}

async function checkEvmTokenBalance(address: string, contractAddress: string, rpcUrls: string[], decimals: number = 6): Promise<number> {
  try {
    const cleanAddr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const dataHex = `0x70a08231${cleanAddr}`;
    const rawHex = await callJsonRpc(rpcUrls, 'eth_call', [{ to: contractAddress, data: dataHex }, 'latest']);
    if (!rawHex || rawHex === '0x') return 0;
    const rawVal = BigInt(rawHex);
    return Number(rawVal) / Math.pow(10, decimals);
  } catch {
    return 0;
  }
}

async function checkEthAddress(address: string, coinCode: string = 'ETH'): Promise<ChainCheckResult> {
  const upperCoin = coinCode.toUpperCase();
  
  if (upperCoin === 'USDC') {
    // Check across major EVM chains: Ethereum, Polygon, Arbitrum, Base, BSC
    const [ethBal, polyBal, polyBridgedBal, arbBal, baseBal, bscBal] = await Promise.all([
      checkEvmTokenBalance(address, '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', EVM_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', POLYGON_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', POLYGON_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831', ARBITRUM_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', BASE_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', BSC_FALLBACK_RPCS, 18),
    ]);

    const totalUsdc = ethBal + polyBal + polyBridgedBal + arbBal + baseBal + bscBal;
    return {
      received: totalUsdc,
      confirmations: totalUsdc > 0 ? 1 : 0,
      txid: totalUsdc > 0 ? 'evm_usdc_check' : null,
    };
  }

  if (upperCoin === 'USDT') {
    const [ethBal, polyBal, arbBal, baseBal, bscBal] = await Promise.all([
      checkEvmTokenBalance(address, '0xdAC17F958D2ee523a2206206994597C13D831ec7', EVM_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', POLYGON_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9', ARBITRUM_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2', BASE_FALLBACK_RPCS, 6),
      checkEvmTokenBalance(address, '0x55d398326f99059fF775485246999027B3197955', BSC_FALLBACK_RPCS, 18),
    ]);

    const totalUsdt = ethBal + polyBal + arbBal + baseBal + bscBal;
    return {
      received: totalUsdt,
      confirmations: totalUsdt > 0 ? 1 : 0,
      txid: totalUsdt > 0 ? 'evm_usdt_check' : null,
    };
  }

  // Native ETH
  const rawHex = await callJsonRpc(EVM_FALLBACK_RPCS, 'eth_getBalance', [address, 'latest']);
  const balanceWei = BigInt(rawHex || '0x0');
  const balanceEth = Number(balanceWei) / 1e18;

  return {
    received: balanceEth,
    confirmations: balanceEth > 0 ? 1 : 0,
    txid: balanceEth > 0 ? 'eth_direct_rpc_check' : null,
  };
}

async function checkSolAddress(address: string, coinCode: string = 'SOL'): Promise<ChainCheckResult> {
  const upperCoin = coinCode.toUpperCase();
  if (upperCoin === 'USDT' || upperCoin === 'USDC') {
    const mints: Record<string, string> = {
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    };
    const mint = mints[upperCoin];
    const data = await callJsonRpc(SOLANA_FALLBACK_RPCS, 'getTokenAccountsByOwner', [address, { mint }, { encoding: 'jsonParsed' }]);
    if (data && Array.isArray(data.value)) {
      let totalAmount = 0;
      for (const acc of data.value) {
        const info = acc.account?.data?.parsed?.info;
        if (info?.tokenAmount?.uiAmount) {
          totalAmount += Number(info.tokenAmount.uiAmount);
        }
      }
      return {
        received: totalAmount,
        confirmations: totalAmount > 0 ? 1 : 0,
        txid: totalAmount > 0 ? `sol_spl_${upperCoin.toLowerCase()}_check` : null,
      };
    }
  }

  const data = await callJsonRpc(SOLANA_FALLBACK_RPCS, 'getBalance', [address]);
  const balanceLamports = typeof data?.value === 'number' ? data.value : 0;
  const balanceSol = balanceLamports / 1e9;

  return {
    received: balanceSol,
    confirmations: balanceSol > 0 ? 1 : 0,
    txid: balanceSol > 0 ? 'sol_direct_rpc_check' : null,
  };
}

async function checkTonAddress(
  address: string,
  paymentMemo?: string | null,
  createdAfter?: Date,
  expiresAt?: Date
): Promise<ChainCheckResult> {
  if (!paymentMemo) {
    return { received: 0, confirmations: 0, txid: null };
  }

  const maxTimestamp = expiresAt
    ? (expiresAt.getTime() + 30 * 60 * 1000)
    : (createdAfter ? (createdAfter.getTime() + 60 * 60 * 1000) : (Date.now() + 10 * 60 * 1000));

  try {
    const url = `https://toncenter.com/api/v2/getTransactions?address=${encodeURIComponent(address)}&limit=40`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const data = await res.json();
      if (data?.ok && Array.isArray(data.result)) {
        let matchingTxid: string | null = null;
        let totalReceivedNano = BigInt(0);
        const expectedMemo = paymentMemo.trim().toLowerCase();
        const expectedRawId = expectedMemo.replace(/^memo-?/, '');

        for (const tx of data.result) {
          const inMsg = tx.in_msg;
          if (!inMsg) continue;

          let comment = (inMsg.message || inMsg.msg_data?.text || inMsg.decoded_body?.text || '').trim();
          if (!comment && inMsg.msg_data?.body) {
            try {
              const buf = Buffer.from(inMsg.msg_data.body, 'base64');
              if (buf.length > 4 && buf.readUInt32BE(0) === 0) {
                comment = buf.subarray(4).toString('utf8').trim();
              } else {
                comment = buf.toString('utf8').trim();
              }
            } catch {}
          }

          if (tx.utime) {
            const txTimeMs = Number(tx.utime) * 1000;
            if (createdAfter && txTimeMs < createdAfter.getTime() - 5 * 60 * 1000) {
              continue;
            }
            if (txTimeMs > maxTimestamp) {
              continue;
            }
          } else if (Date.now() > maxTimestamp) {
            continue;
          }

          const actualMemo = comment.toLowerCase();
          const isMatch = actualMemo === expectedMemo || actualMemo.includes(expectedMemo) || (expectedRawId.length >= 6 && actualMemo.includes(expectedRawId));
          if (isMatch) {
            const value = BigInt(inMsg.value || '0');
            if (value > BigInt(0)) {
              totalReceivedNano += value;
              if (!matchingTxid && tx.transaction_id?.hash) {
                matchingTxid = tx.transaction_id.hash;
              }
            }
          }
        }

        const receivedTon = Number(totalReceivedNano) / 1e9;
        return {
          received: receivedTon,
          confirmations: receivedTon > 0 ? 1 : 0,
          txid: matchingTxid,
        };
      }
    }
  } catch (err) {
    console.warn(`[Direct TON Check] Toncenter check failed for ${address}:`, (err as Error).message);
  }

  return { received: 0, confirmations: 0, txid: null };
}

async function checkTrxAddress(address: string, coinCode: string = 'TRX'): Promise<ChainCheckResult> {
  const upperCoin = coinCode.toUpperCase();
  const endpoints = [
    `https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`,
    `https://api.tronstack.io/v1/accounts/${encodeURIComponent(address)}`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        const data = await res.json();
        if (data?.data && data.data.length > 0) {
          const acc = data.data[0];
          if (upperCoin === 'USDT' || upperCoin === 'USDC') {
            const contract = upperCoin === 'USDT'
              ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t'
              : 'TEkxiTehnzSmSe2XqrBj4w32RUN966rdz8';
            const trc20List = acc.trc20 || [];
            let tokenRaw = 0;
            for (const item of trc20List) {
              if (item[contract]) {
                tokenRaw = parseFloat(item[contract]);
                break;
              }
            }
            const tokenBalance = tokenRaw / 1e6;
            return {
              received: tokenBalance,
              confirmations: tokenBalance > 0 ? 1 : 0,
              txid: tokenBalance > 0 ? `trc20_${upperCoin.toLowerCase()}_check` : null,
            };
          } else {
            const trxBalance = (acc.balance || 0) / 1e6;
            return {
              received: trxBalance,
              confirmations: trxBalance > 0 ? 1 : 0,
              txid: trxBalance > 0 ? 'trx_direct_check' : null,
            };
          }
        }
      }
    } catch {}
  }
  return { received: 0, confirmations: 0, txid: null };
}

export async function checkAddressOnChain(
  address: string,
  coinCode: string,
  paymentMemo?: string | null,
  createdAfter?: Date,
  claimedTxHashes?: Set<string>,
  initialBalance: number = 0,
  expiresAt?: Date
): Promise<ChainCheckResult> {
  const cleanAddr = address.trim();
  const upperCoin = coinCode.toUpperCase();

  // For account-based coins (EVM, SOL, TRX): if session is already past expiration + grace period, reject
  if (expiresAt && Date.now() > (expiresAt.getTime() + 30 * 60 * 1000)) {
    if (upperCoin !== 'BTC' && upperCoin !== 'LTC') {
      return { received: 0, confirmations: 0, txid: null };
    }
  }

  let rawRes: ChainCheckResult;

  // 1. EVM address (0x...) -> Check Ethereum / Polygon / Arbitrum / Base / BSC
  if (cleanAddr.startsWith('0x') && cleanAddr.length === 42) {
    rawRes = await checkEthAddress(cleanAddr, upperCoin);
  } else if (cleanAddr.startsWith('T') && cleanAddr.length === 34) {
    // 2. TRON address (T...)
    rawRes = await checkTrxAddress(cleanAddr, upperCoin);
  } else if (cleanAddr.length >= 32 && cleanAddr.length <= 44 && !cleanAddr.startsWith('0x') && (upperCoin === 'SOL' || upperCoin === 'USDC' || upperCoin === 'USDT')) {
    // 3. Solana address (Base58, 32-44 chars without 0x/T)
    rawRes = await checkSolAddress(cleanAddr, upperCoin);
  } else if (upperCoin === 'TON' || cleanAddr.startsWith('EQ') || cleanAddr.startsWith('UQ')) {
    // 4. TON address
    return checkTonAddress(cleanAddr, paymentMemo, createdAfter, expiresAt);
  } else if (upperCoin === 'BTC' || upperCoin === 'LTC') {
    // 5. Bitcoin / Litecoin
    return checkBtcLtcAddress(cleanAddr, upperCoin, createdAfter, claimedTxHashes, expiresAt);
  } else if (cleanAddr.startsWith('0x')) {
    rawRes = await checkEthAddress(cleanAddr, upperCoin);
  } else {
    rawRes = await checkSolAddress(cleanAddr, upperCoin);
  }

  // Account-based coins: deduct initial_balance that existed prior to session creation
  if (initialBalance > 0) {
    const adjusted = Math.max(0, rawRes.received - initialBalance);
    return {
      received: adjusted,
      confirmations: adjusted > 0 ? rawRes.confirmations : 0,
      txid: adjusted > 0 ? rawRes.txid : null,
    };
  }

  return rawRes;
}

function getPureWalletUrls(): string[] {
  const configured = process.env.PURE_WALLET_URL;
  return Array.from(new Set([
    configured,
    'http://127.0.0.1:7777',
    'http://localhost:7777',
  ].filter(Boolean) as string[])).map(u => u.replace(/\/$/, ''));
}

/**
 * Helper to sync the session state with pure-wallet gateway or direct blockchain explorers.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncSessionWithGateway(id: string, db: any): Promise<any> {
  const urls = getPureWalletUrls();
  let gatewayData: any = null;

  for (const base of urls) {
    try {
      const res = await fetch(`${base}/api/v1/payment/status/${id}`, { cache: 'no-store', signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        gatewayData = await res.json();
        break;
      }
    } catch {}
  }

  // 1. Fetch current session status
  const { data: currentSession } = await db
    .from('crypto_sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!currentSession) return null;

  const nowMs = Date.now();
  const expMs = new Date(currentSession.expires_at).getTime();
  const gracePeriodMs = 30 * 60 * 1000; // 30 minutes grace window for mempool mining
  const isPastGrace = nowMs > (expMs + gracePeriodMs);

  // If already paid or under review, do not re-evaluate or re-fulfill
  if (currentSession.status === 'paid' || currentSession.status === 'review') {
    return currentSession;
  }

  // If session is cancelled or expired, ensure associated orders match and do not query chain
  if (currentSession.status === 'cancelled') {
    const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
    if (orderIds.length > 0) {
      await db.from('orders').update({ status: 'cancelled' }).in('id', orderIds).in('status', ['pending', 'pending_payment']);
    }
    await db.from('orders').update({ status: 'cancelled' }).eq('checkout_ref', id).in('status', ['pending', 'pending_payment']);
    return currentSession;
  }

  if (currentSession.status === 'expired') {
    const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
    if (orderIds.length > 0) {
      await db.from('orders').update({ status: 'expired' }).in('id', orderIds).in('status', ['pending', 'pending_payment']);
    }
    await db.from('orders').update({ status: 'expired' }).eq('checkout_ref', id).in('status', ['pending', 'pending_payment']);
    if (isPastGrace) return currentSession;
  }

  // If session is pending and already well past grace period:
  // Seal it as expired immediately without hitting blockchain explorers.
  if (currentSession.status === 'pending' && isPastGrace) {
    await db
      .from('crypto_sessions')
      .update({ status: 'expired' })
      .eq('id', id);
    const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
    if (orderIds.length > 0) {
      await db
        .from('orders')
        .update({ status: 'expired' })
        .in('id', orderIds)
        .in('status', ['pending', 'pending_payment']);
    }
    await db
      .from('orders')
      .update({ status: 'expired' })
      .eq('checkout_ref', id)
      .in('status', ['pending', 'pending_payment']);
    currentSession.status = 'expired';
    return currentSession;
  }

  let status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected' | 'review' | 'cancelled' = currentSession.status;
  let receivedAmount = currentSession.received_amount || 0;
  let txHash = currentSession.tx_hash;
  let confirmations = currentSession.confirmations || 0;
  let paidAt = currentSession.paid_at;

  // Load coin configuration underpayment tolerance (default 98% = 2% tolerance)
  let minPaymentPct = 98;
  try {
    const { data: coinRow } = await db
      .from('crypto_coins')
      .select('min_payment_pct')
      .eq('code', currentSession.coin.toUpperCase())
      .maybeSingle();
    if (coinRow && typeof coinRow.min_payment_pct === 'number' && coinRow.min_payment_pct > 0 && coinRow.min_payment_pct <= 100) {
      minPaymentPct = coinRow.min_payment_pct;
    }
  } catch {}

  const expectedAmount = Number(currentSession.crypto_amount);
  const requiredThreshold = expectedAmount * (minPaymentPct / 100);
  const confirmationsRequired = Number(currentSession.confirmations_required || 1);

  const isAlreadyClosed = currentSession.status === 'cancelled' || currentSession.status === 'expired';

  if (gatewayData) {
    const gwReceived = Number(gatewayData.received_amount || 0);

    if (isAlreadyClosed) {
      if (gwReceived >= requiredThreshold || gatewayData.status === 'paid' || gwReceived > 0) {
        status = 'review' as any;
        receivedAmount = gwReceived;
        txHash = gatewayData.tx_hash;
        confirmations = gatewayData.confirmations;
        paidAt = gatewayData.paid_at || new Date().toISOString();
      } else {
        status = currentSession.status;
      }
    } else {
      status = gatewayData.status;
      receivedAmount = gwReceived;
      txHash = gatewayData.tx_hash;
      confirmations = gatewayData.confirmations;
      paidAt = gatewayData.paid_at || (gatewayData.status === 'paid' ? new Date().toISOString() : null);

      // If gateway returns partially_paid, check if it satisfies min_payment_pct tolerance
      if (status === 'partially_paid' && expectedAmount > 0 && receivedAmount >= requiredThreshold) {
        status = confirmations >= confirmationsRequired ? 'paid' : 'detected';
        paidAt = status === 'paid' ? new Date().toISOString() : null;
        console.log(`[Session Sync] Overriding gateway partially_paid to ${status} via min_payment_pct (${minPaymentPct}%) tolerance`);
      } else if (status === 'pending' && nowMs > expMs && receivedAmount === 0) {
        status = 'expired';
      }
    }
  } else {
    // Direct Blockchain Multi-RPC Check (Autonomous Mode)
    // Check pending, partially_paid, detected, AND recently expired sessions (to auto-fulfill late payments!)
    try {
      const coinCode = currentSession.coin.toUpperCase();
      const address = currentSession.wallet_address;
      const paymentMemo = currentSession.payment_memo;
      const createdAfter = currentSession.created_at ? new Date(currentSession.created_at) : undefined;

      if (address && address !== 'TBD') {
        // Fetch transaction hashes claimed by OTHER paid sessions on the same address
        let claimedTxHashes = new Set<string>();
        try {
          const { data: paidOnAddr } = await db
            .from('crypto_sessions')
            .select('tx_hash')
            .eq('wallet_address', address)
            .eq('status', 'paid')
            .neq('id', id)
            .not('tx_hash', 'is', null);

          if (paidOnAddr) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            claimedTxHashes = new Set(paidOnAddr.map((s: any) => s.tx_hash).filter(Boolean));
          }
        } catch {}

        const initialBalance = Number((currentSession as any).initial_balance || 0);
        const expiresAt = currentSession.expires_at ? new Date(currentSession.expires_at) : undefined;
        const chainInfo = await checkAddressOnChain(address, coinCode, paymentMemo, createdAfter, claimedTxHashes, initialBalance, expiresAt);

        if (chainInfo.received >= requiredThreshold || chainInfo.received > 0) {
          if (isAlreadyClosed) {
            status = 'review' as any;
          } else if (chainInfo.received >= requiredThreshold) {
            status = chainInfo.confirmations >= confirmationsRequired ? 'paid' : 'detected';
          } else {
            status = 'partially_paid';
          }
        } else if (currentSession.status === 'detected' || currentSession.status === 'partially_paid') {
          // Preserve existing detected/partially_paid status if explorer transiently returned 0
          status = currentSession.status;
        } else if (isAlreadyClosed) {
          // Keep cancelled as cancelled, expired as expired! Never revive to pending!
          status = currentSession.status;
        } else {
          status = nowMs > expMs ? 'expired' : 'pending';
        }

        receivedAmount = chainInfo.received;
        txHash = chainInfo.txid || txHash;
        confirmations = chainInfo.confirmations;
        paidAt = (status === 'paid' || status === 'review') ? (currentSession.paid_at || new Date().toISOString()) : null;

        console.log(`[Direct Chain Check] Session ${id} (${coinCode} on ${address}): status=${status}, received=${receivedAmount}/${expectedAmount} (threshold: ${requiredThreshold})`);
      }
    } catch (chainErr) {
      console.error(`[Direct Chain Check] Failed to check blockchain for session ${id}:`, (chainErr as Error).message);
    }
  }

  // ── GLOBAL TX_HASH COLLISION & RE-USE GUARD ──
  // If a transaction hash is present, ensure it has NOT been claimed by ANY other paid crypto session!
  if (txHash && typeof txHash === 'string' && txHash.trim() && !txHash.endsWith('_check')) {
    try {
      const { data: duplicateClaims } = await db
        .from('crypto_sessions')
        .select('id, customer_email, wallet_address, status')
        .eq('tx_hash', txHash.trim())
        .eq('status', 'paid')
        .neq('id', id);

      if (duplicateClaims && duplicateClaims.length > 0) {
        console.error(`[CRITICAL SECURITY ALERT] tx_hash ${txHash} is ALREADY claimed by paid session(s) ${duplicateClaims.map((d: any) => d.id).join(', ')}! Rejecting duplicate claim for session ${id}.`);
        txHash = null;
        receivedAmount = 0;
        status = nowMs > expMs ? 'expired' : 'pending';
      }
    } catch (dupErr) {
      console.error('[tx_hash uniqueness check error]:', dupErr);
    }
  }

  // Check if there is an update
  if (
    currentSession.status !== status ||
    currentSession.received_amount !== receivedAmount ||
    currentSession.tx_hash !== txHash ||
    currentSession.confirmations !== confirmations
  ) {
    const updatePayload: Record<string, unknown> = {
      status,
      received_amount: receivedAmount,
      tx_hash: txHash,
      confirmations,
      paid_at: paidAt || (status === 'paid' ? new Date().toISOString() : null),
    };

    await db
      .from('crypto_sessions')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update(updatePayload as any)
      .eq('id', id);

    // When session is paid, ensure all associated orders are fulfilled (fire-and-forget to avoid blocking the GET/POST handler)
    if (status === 'paid' && currentSession.status !== 'cancelled' && currentSession.status !== 'expired' && currentSession.status !== 'review') {
      // ── HARD SECURITY GATE 1: NEVER FULFILL WITHOUT VERIFIED ON-CHAIN FUNDS ──
      if (receivedAmount <= 0 || receivedAmount < requiredThreshold) {
        console.error(`[CRITICAL SECURITY GATE BLOCKED] Session ${id} attempted fulfillment without verified funds: receivedAmount=${receivedAmount}, requiredThreshold=${requiredThreshold}. Aborting fulfillment.`);
        return;
      }

      // ── HARD SECURITY GATE 2: NEVER FULFILL IF TX_HASH IS ALREADY CLAIMED ──
      if (txHash && typeof txHash === 'string' && !txHash.endsWith('_check')) {
        const { data: dupClaims } = await db
          .from('crypto_sessions')
          .select('id')
          .eq('tx_hash', txHash.trim())
          .eq('status', 'paid')
          .neq('id', id);

        if (dupClaims && dupClaims.length > 0) {
          console.error(`[CRITICAL SECURITY GATE BLOCKED] Session ${id} tx_hash ${txHash} is already claimed by session ${dupClaims[0].id}. Aborting fulfillment!`);
          return;
        }
      }

      const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
      if (orderIds.length > 0) {
        // Query uncompleted orders synchronously (fast DB call), then fulfill async
        db.from('orders').select('id, status').in('id', orderIds).then(async ({ data: ords }: { data: any[] | null }) => {
          const uncompleted = (ords || []).filter((o: any) => o.status !== 'completed');
          const uncompletedIds = uncompleted.map((o: any) => o.id);

          if (currentSession.status !== 'paid' || uncompletedIds.length > 0) {
            const isLate = currentSession.status === 'expired' || nowMs > expMs;
            console.log(`[Session Sync] Fulfilling orders for paid session: ${orderIds.join(', ')} (uncompleted: ${uncompletedIds.length}, isLate: ${isLate})`);

            if (uncompletedIds.length > 0) {
              await db
                .from('orders')
                .update({
                  status: 'paid',
                  payment_confirmed_at: new Date().toISOString(),
                })
                .in('id', uncompletedIds);

              await fulfillOrders(db, uncompletedIds, { isLatePayment: isLate });
            }
          }
        }).catch((err: any) => {
          console.error('[Session Sync] Background fulfillment error:', err);
        });
      }
    } else if (status === 'review') {
      const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
      if (orderIds.length > 0) {
        await db
          .from('orders')
          .update({
            status: 'review',
            payment_confirmed_at: paidAt || new Date().toISOString(),
          })
          .in('id', orderIds);
      }
      await db
        .from('orders')
        .update({
          status: 'review',
          payment_confirmed_at: paidAt || new Date().toISOString(),
        })
        .eq('checkout_ref', id);
      console.log(`[Session Sync] Session ${id} set to 'review'. Orders updated to 'review'. Fulfillment skipped.`);
    } else if (status === 'expired') {
      const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
      if (orderIds.length > 0) {
        await db
          .from('orders')
          .update({ status: 'expired' })
          .in('id', orderIds)
          .in('status', ['pending', 'pending_payment']);
      }
      await db
        .from('orders')
        .update({ status: 'expired' })
        .eq('checkout_ref', id)
        .in('status', ['pending', 'pending_payment']);
    }

    // Transition to partially_paid: send customer underpayment email alert once
    if (status === 'partially_paid' && currentSession.status !== 'partially_paid' && receivedAmount > 0 && currentSession.customer_email) {
      console.log(`[Session Sync] Dispatching underpayment email to ${currentSession.customer_email} for session ${id}`);
      const coin = currentSession.coin.toUpperCase();
      const decimalLimit = coin === 'TON' ? 9 : (['SOL', 'USDT', 'USDC', 'TRX'].includes(coin) ? 6 : 8);
      const remainingNum = Math.max(0, expectedAmount - receivedAmount);
      const remainingAmount = remainingNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');

      sendUnderpaymentEmail({
        to: currentSession.customer_email,
        orderId: id,
        coin,
        receivedAmount: String(receivedAmount),
        expectedAmount: String(expectedAmount),
        remainingAmount,
        walletAddress: currentSession.wallet_address,
        paymentMemo: currentSession.payment_memo,
        locale: currentSession.locale || 'de',
      }).catch((emailErr) => {
        console.error('[Session Sync] Failed to send underpayment email:', emailErr);
      });
    }
  }
}

/**
 * Sweep and sync all active pending/detected/partially_paid AND recently expired crypto sessions in the background.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncAllActiveCryptoSessions(db: any): Promise<number> {
  try {
    const { sweepExpiredSessions } = await import('@/lib/crypto/session');
    await sweepExpiredSessions(db);

    // 1. Fetch active sessions (pending, detected, partially_paid)
    const { data: activeSessions } = await db
      .from('crypto_sessions')
      .select('id, expires_at, status')
      .in('status', ['pending', 'detected', 'partially_paid'])
      .order('created_at', { ascending: false })
      .limit(30);

    // 2. Fetch recently expired sessions from the last 2 hours that may have late on-chain payments
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: expiredSessions } = await db
      .from('crypto_sessions')
      .select('id, expires_at, status')
      .eq('status', 'expired')
      .gt('created_at', twoHoursAgo)
      .order('created_at', { ascending: false })
      .limit(10);

    const allCandidateSessions = [
      ...(activeSessions || []),
      ...(expiredSessions || []),
    ];

    if (allCandidateSessions.length === 0) return 0;

    const seenIds = new Set<string>();
    const uniqueSessions = allCandidateSessions.filter(s => {
      if (seenIds.has(s.id)) return false;
      seenIds.add(s.id);
      return true;
    });

    // Process in parallel batches of 5 for high performance without timeout
    const batchSize = 5;
    let count = 0;
    for (let i = 0; i < uniqueSessions.length; i += batchSize) {
      const batch = uniqueSessions.slice(i, i + batchSize);
      await Promise.all(batch.map(s => syncSessionWithGateway(s.id, db).catch(() => null)));
      count += batch.length;
    }

    return count;
  } catch (err) {
    console.error('[syncAllActiveCryptoSessions] Error:', err);
    return 0;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = createServiceClient();

  // 1. Fetch current session status from database first
  const { data: s, error } = await db
    .from('crypto_sessions')
    .select('*, crypto_coins(name, uri_scheme, decimals)')
    .eq('id', id)
    .single();

  if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

  const now = Date.now();
  const createdMs = s.created_at ? new Date(s.created_at).getTime() : now;
  const ageMs = now - createdMs;

  // For freshly created pending sessions (< 15 seconds old), no transaction can possibly have confirmed yet.
  // Returning the freshly inserted DB session directly avoids blocking the user on slow external explorers/RPCS,
  // making the initial GET response virtually instant (<100ms)!
  // For older sessions or verification polling, perform gateway / blockchain sync.
  if (s.status !== 'pending' || ageMs >= 15000) {
    await syncSessionWithGateway(id, db);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const coin = (s as any).crypto_coins as { name: string; uri_scheme: string; decimals: number } | null;
  const decimalLimit = coin?.decimals ?? 8;
  const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  let paymentUri = `${coin?.uri_scheme || 'litecoin'}:${s.wallet_address}?amount=${amount}`;
  if (s.payment_memo) {
    paymentUri += `&text=${encodeURIComponent(s.payment_memo)}&memo=${encodeURIComponent(s.payment_memo)}`;
  }

  // Resolve checkout_ref
  let ref: string | null = null;
  if (s.order_ids?.length) {
    const { data: ord } = await db.from('orders').select('checkout_ref').eq('id', s.order_ids[0]).single();
    ref = ord?.checkout_ref ?? null;
  }

  const expiresMs = new Date(s.expires_at).getTime();
  let status = s.status;

  // If pending and initial 30 minutes have passed, perform one last sync before marking expired
  if (s.status === 'pending') {
    const timeRemaining = expiresMs - now;
    if (timeRemaining <= 0) {
      await syncSessionWithGateway(s.id, db);
      const { data: recheck } = await db
        .from('crypto_sessions')
        .select('status')
        .eq('id', s.id)
        .maybeSingle();
      status = recheck?.status ?? 'expired';
    }
  }

  // If cancelled or expired: DO NOT expose address, paymentUri, or QR data!
  if (status === 'cancelled' || status === 'expired') {
    return NextResponse.json({
      id:                 s.id,
      coin:               s.coin,
      coinName:           coin?.name ?? s.coin,
      status,
      walletAddress:      '',
      cryptoAmount:       '',
      paymentUri:         '',
      amountEur:          Number(s.amount_eur),
      baseEur:            Number(s.base_eur),
      surchargePct:       Number(s.surcharge_pct),
      surchargeFixedEur:  Number(s.surcharge_fixed_eur),
      confirmations:      s.confirmations || 0,
      confirmationsRequired: s.confirmations_required,
      txHash:             s.tx_hash,
      remainingMs:        0,
      expiresAt:          s.expires_at,
      ref,
      paymentMemo:        null,
      receivedAmount:     Number(s.received_amount || 0),
    });
  }

  if (status === 'review') {
    return NextResponse.json({
      id:                 s.id,
      coin:               s.coin,
      coinName:           coin?.name ?? s.coin,
      status:             'review',
      walletAddress:      '',
      cryptoAmount:       '',
      paymentUri:         '',
      amountEur:          Number(s.amount_eur),
      baseEur:            Number(s.base_eur),
      surchargePct:       Number(s.surcharge_pct),
      surchargeFixedEur:  Number(s.surcharge_fixed_eur),
      confirmations:      s.confirmations || 0,
      confirmationsRequired: s.confirmations_required,
      txHash:             s.tx_hash,
      remainingMs:        0,
      expiresAt:          s.expires_at,
      ref,
      paymentMemo:        null,
      receivedAmount:     Number(s.received_amount || 0),
      paidAt:             s.paid_at,
    });
  }

  // Timer only applies to 'pending'. Once 'detected', 'partially_paid', or 'paid', timer is ended (0 remaining).
  const remainingMs = (status === 'detected' || status === 'partially_paid' || status === 'paid')
    ? 0
    : Math.max(0, expiresMs - now);

  return NextResponse.json({
    id:                 s.id,
    coin:               s.coin,
    coinName:           coin?.name ?? s.coin,
    status,
    walletAddress:      s.wallet_address,
    cryptoAmount:       amount,
    paymentUri,
    amountEur:          Number(s.amount_eur),
    baseEur:            Number(s.base_eur),
    surchargePct:       Number(s.surcharge_pct),
    surchargeFixedEur:  Number(s.surcharge_fixed_eur),
    confirmations:      s.confirmations,
    confirmationsRequired: s.confirmations_required,
    txHash:             s.tx_hash,
    remainingMs,
    expiresAt:          s.expires_at,
    ref,
    paymentMemo:        s.payment_memo || null,
    receivedAmount:     Number(s.received_amount || 0),
  });
}

export async function cancelCryptoSessionAndOrders(id: string): Promise<{
  ok: boolean;
  sessionStatus?: string;
  orderStatus?: string;
  notFound?: boolean;
  notCancellable?: boolean;
  currentStatus?: string;
  alreadyCancelled?: boolean;
  error?: string;
}> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Lock the session row for update
    const sessRes = await client.query(
      'SELECT id, status, order_ids, wallet_address FROM crypto_sessions WHERE id = $1 FOR UPDATE',
      [id]
    );

    if (sessRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return { ok: false, notFound: true, error: 'Session nicht gefunden' };
    }

    const s = sessRes.rows[0];

    // If order was already fulfilled / paid / in review / detected, refuse cancellation
    if (s.status === 'paid' || s.status === 'review' || s.status === 'detected') {
      await client.query('ROLLBACK');
      return {
        ok: false,
        notCancellable: true,
        currentStatus: s.status,
        error: `Zahlung kann nicht storniert werden: Status ist ${s.status}`,
      };
    }

    const orderIds: string[] = Array.isArray(s.order_ids) ? s.order_ids : [];

    // Idempotent 2nd DELETE: if session is already cancelled, ensure orders are cancelled too and return 200
    if (s.status === 'cancelled') {
      if (orderIds.length > 0) {
        await client.query(
          "UPDATE orders SET status = 'cancelled' WHERE id = ANY($1) AND status IN ('pending', 'pending_payment')",
          [orderIds]
        );
      }
      await client.query(
        "UPDATE orders SET status = 'cancelled' WHERE checkout_ref = $1 AND status IN ('pending', 'pending_payment')",
        [id]
      );
      await client.query('COMMIT');
      return { ok: true, alreadyCancelled: true, sessionStatus: 'cancelled', orderStatus: 'cancelled' };
    }

    // 2. Mark session as cancelled
    await client.query("UPDATE crypto_sessions SET status = 'cancelled' WHERE id = $1", [id]);

    // 3. Mark orders as cancelled (both by order_ids and checkout_ref)
    if (orderIds.length > 0) {
      await client.query(
        "UPDATE orders SET status = 'cancelled' WHERE id = ANY($1) AND status IN ('pending', 'pending_payment')",
        [orderIds]
      );
    }
    await client.query(
      "UPDATE orders SET status = 'cancelled' WHERE checkout_ref = $1 AND status IN ('pending', 'pending_payment')",
      [id]
    );

    // 4. Strict atomic verification before COMMIT: verify both session AND orders are cancelled
    const verifySess = await client.query('SELECT status FROM crypto_sessions WHERE id = $1', [id]);
    if (verifySess.rows[0]?.status !== 'cancelled') {
      await client.query('ROLLBACK');
      return { ok: false, error: 'Verifizierung der Session-Stornierung fehlgeschlagen' };
    }

    if (orderIds.length > 0) {
      const verifyOrders = await client.query('SELECT id, status FROM orders WHERE id = ANY($1)', [orderIds]);
      const stillPending = verifyOrders.rows.some((o: any) => o.status === 'pending' || o.status === 'pending_payment');
      if (stillPending) {
        await client.query('ROLLBACK');
        return { ok: false, error: 'Verifizierung der Bestellungs-Stornierung fehlgeschlagen' };
      }
    }

    await client.query('COMMIT');
    return { ok: true, sessionStatus: 'cancelled', orderStatus: 'cancelled' };
  } catch (err: any) {
    await client.query('ROLLBACK');
    return { ok: false, error: err.message };
  } finally {
    client.release();
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const res = await cancelCryptoSessionAndOrders(id);

    if (!res.ok) {
      if (res.notFound) {
        return NextResponse.json({ error: 'Session nicht gefunden' }, { status: 404 });
      }
      if (res.notCancellable) {
        return NextResponse.json(
          { error: res.error || 'Stornierung nicht möglich', status: res.currentStatus },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: res.error || 'Stornierung fehlgeschlagen' }, { status: 500 });
    }

    // Notify pure-wallet gateway if configured / reachable (fire-and-forget)
    try {
      const urls = getPureWalletUrls();
      for (const base of urls) {
        fetch(`${base}/api/v1/payment/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: id }),
          signal: AbortSignal.timeout(1500),
        }).catch(() => {});
      }
    } catch {}

    console.log(`[crypto/session/cancel] Session ${id} and associated orders marked as 'cancelled'.`);
    return NextResponse.json({
      success: true,
      status: 'cancelled',
      sessionStatus: res.sessionStatus,
      orderStatus: res.orderStatus,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crypto/session/cancel] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // 1. Sync session state with the gateway (checks for final transitions)
    await syncSessionWithGateway(id, db);

    // 2. Fetch and return the updated session details
    const { data: s, error } = await db
      .from('crypto_sessions')
      .select('*, crypto_coins(name, uri_scheme, decimals)')
      .eq('id', id)
      .single();

    if (error || !s) return NextResponse.json({ error: 'not found' }, { status: 404 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const coin = (s as any).crypto_coins as { name: string; uri_scheme: string; decimals: number } | null;
    const decimalLimit = coin?.decimals ?? 8;
    const amount = Number(s.crypto_amount).toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
    let paymentUri = `${coin?.uri_scheme || 'litecoin'}:${s.wallet_address}?amount=${amount}`;
    if (s.payment_memo) {
      paymentUri += `&text=${encodeURIComponent(s.payment_memo)}&memo=${encodeURIComponent(s.payment_memo)}`;
    }

    let ref: string | null = null;
    if (s.order_ids?.length) {
      const { data: ord } = await db.from('orders').select('checkout_ref').eq('id', s.order_ids[0]).single();
      ref = ord?.checkout_ref ?? null;
    }

    const now = Date.now();
    const expiresMs = new Date(s.expires_at).getTime();
    let status = s.status;

    // If pending and initial 30 minutes have passed, perform one last sync before marking expired
    if (s.status === 'pending') {
      const timeRemaining = expiresMs - now;
      if (timeRemaining <= 0) {
        await syncSessionWithGateway(s.id, db);
        const { data: recheck } = await db
          .from('crypto_sessions')
          .select('status')
          .eq('id', s.id)
          .maybeSingle();
        status = recheck?.status ?? 'expired';
      }
    }

    // If cancelled or expired: DO NOT expose address, paymentUri, or QR data!
    if (status === 'cancelled' || status === 'expired') {
      return NextResponse.json({
        id:                 s.id,
        coin:               s.coin,
        coinName:           coin?.name ?? s.coin,
        status,
        walletAddress:      '',
        cryptoAmount:       '',
        paymentUri:         '',
        amountEur:          Number(s.amount_eur),
        baseEur:            Number(s.base_eur),
        surchargePct:       Number(s.surcharge_pct),
        surchargeFixedEur:  Number(s.surcharge_fixed_eur),
        confirmations:      s.confirmations || 0,
        confirmationsRequired: s.confirmations_required,
        txHash:             s.tx_hash,
        remainingMs:        0,
        expiresAt:          s.expires_at,
        ref,
        paymentMemo:        null,
        receivedAmount:     Number(s.received_amount || 0),
      });
    }

    if (status === 'review') {
      return NextResponse.json({
        id:                 s.id,
        coin:               s.coin,
        coinName:           coin?.name ?? s.coin,
        status:             'review',
        walletAddress:      '',
        cryptoAmount:       '',
        paymentUri:         '',
        amountEur:          Number(s.amount_eur),
        baseEur:            Number(s.base_eur),
        surchargePct:       Number(s.surcharge_pct),
        surchargeFixedEur:  Number(s.surcharge_fixed_eur),
        confirmations:      s.confirmations || 0,
        confirmationsRequired: s.confirmations_required,
        txHash:             s.tx_hash,
        remainingMs:        0,
        expiresAt:          s.expires_at,
        ref,
        paymentMemo:        null,
        receivedAmount:     Number(s.received_amount || 0),
        paidAt:             s.paid_at,
      });
    }

    const remainingMs = (status === 'detected' || status === 'partially_paid' || status === 'paid')
      ? 0
      : Math.max(0, expiresMs - now);

    return NextResponse.json({
      id:                 s.id,
      coin:               s.coin,
      coinName:           coin?.name ?? s.coin,
      status,
      walletAddress:      s.wallet_address,
      cryptoAmount:       amount,
      paymentUri,
      amountEur:          Number(s.amount_eur),
      baseEur:            Number(s.base_eur),
      surchargePct:       Number(s.surcharge_pct),
      surchargeFixedEur:  Number(s.surcharge_fixed_eur),
      confirmations:      s.confirmations,
      confirmationsRequired: s.confirmations_required,
      txHash:             s.tx_hash,
      remainingMs,
      expiresAt:          s.expires_at,
      ref,
      paymentMemo:        s.payment_memo || null,
      receivedAmount:     Number(s.received_amount || 0),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[crypto/session/verify] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
