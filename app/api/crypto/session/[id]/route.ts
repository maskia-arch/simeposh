/**
 * GET /api/crypto/session/[id]
 * Public status of a crypto checkout session (polled by the checkout UI).
 */
import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fulfillOrders } from '@/lib/fulfillment';
import { sendUnderpaymentEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function checkBtcLtcAddress(address: string, coinCode: string, createdAfter?: Date, claimedTxHashes?: Set<string>): Promise<{ received: number; confirmations: number; txid: string | null }> {
  const isLtc = coinCode === 'LTC';
  const baseUrl = isLtc ? 'https://litecoinspace.org/api' : 'https://mempool.space/api';
  
  const txsRes = await fetch(`${baseUrl}/address/${address}/txs`, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
  if (!txsRes.ok) throw new Error(`Explorer returned status ${txsRes.status}`);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const txs = await txsRes.json() as any[];

  let tipHeight = 0;
  try {
    const tipRes = await fetch(`${baseUrl}/blocks/tip/height`, { cache: 'no-store', signal: AbortSignal.timeout(3000) });
    if (tipRes.ok) {
      tipHeight = parseInt((await tipRes.text()).trim(), 10);
    }
  } catch {}

  let totalReceivedSat = 0;
  let maxConfirmations = 0;
  let lastTxid: string | null = null;

  for (const tx of txs) {
    // Skip transactions already claimed by another paid session on this address
    if (claimedTxHashes && tx.txid && claimedTxHashes.has(tx.txid)) {
      console.log(`[Direct Chain Check] Skipping transaction ${tx.txid} on ${address} because it was already claimed by a completed session`);
      continue;
    }

    // Skip transactions confirmed before this checkout session was created
    if (tx.status?.confirmed && tx.status?.block_time && createdAfter) {
      const txTimeMs = tx.status.block_time * 1000;
      if (txTimeMs < createdAfter.getTime() - 5 * 60 * 1000) {
        continue;
      }
    }

    let txReceived = 0;
    if (tx.vout) {
      for (const out of tx.vout) {
        if (out.scriptpubkey_address === address) {
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
      if (txConf > maxConfirmations) {
        maxConfirmations = txConf;
      }
    }
  }

  return {
    received: totalReceivedSat / 1e8,
    confirmations: maxConfirmations,
    txid: lastTxid
  };
}

async function checkEthAddress(address: string, coinCode: string = 'ETH'): Promise<{ received: number; confirmations: number; txid: string | null }> {
  if (coinCode === 'USDT' || coinCode === 'USDC') {
    const tokenContracts: Record<string, string> = {
      USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
      USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    };
    const contract = tokenContracts[coinCode];
    const cleanAddr = address.toLowerCase().replace(/^0x/, '').padStart(64, '0');
    const dataHex = `0x70a08231${cleanAddr}`;
    
    const body = {
      jsonrpc: "2.0",
      method: "eth_call",
      params: [{ to: contract, data: dataHex }, "latest"],
      id: 1
    };
    const res = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`ETH RPC ERC-20 failed with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const balanceRaw = BigInt(data.result || "0x0");
    const tokenBalance = Number(balanceRaw) / 1e6; // USDT and USDC on ETH use 6 decimals

    return {
      received: tokenBalance,
      confirmations: tokenBalance > 0 ? 1 : 0,
      txid: tokenBalance > 0 ? `erc20_${coinCode.toLowerCase()}_rpc_check` : null
    };
  } else {
    const body = {
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: 1
    };
    const res = await fetch("https://cloudflare-eth.com", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(5000)
    });
    if (!res.ok) throw new Error(`ETH RPC failed with status ${res.status}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const balanceWei = BigInt(data.result || "0x0");
    const balanceEth = Number(balanceWei) / 1e18;

    return {
      received: balanceEth,
      confirmations: balanceEth > 0 ? 1 : 0,
      txid: balanceEth > 0 ? "eth_direct_rpc_check" : null
    };
  }
}

async function checkSolAddress(address: string, coinCode: string = 'SOL'): Promise<{ received: number; confirmations: number; txid: string | null }> {
  if (coinCode === 'USDT' || coinCode === 'USDC') {
    const mints: Record<string, string> = {
      USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    };
    const mint = mints[coinCode];
    const body = {
      jsonrpc: "2.0",
      id: 1,
      method: "getTokenAccountsByOwner",
      params: [address, { mint }, { encoding: "jsonParsed" }]
    };
    try {
      const res = await fetch("https://api.mainnet-beta.solana.com", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: 'no-store',
        signal: AbortSignal.timeout(5000)
      });
      if (res.ok) {
        const data = await res.json();
        const accounts = data.result?.value || [];
        let totalAmount = 0;
        for (const acc of accounts) {
          const info = acc.account?.data?.parsed?.info;
          if (info?.tokenAmount?.uiAmount) {
            totalAmount += info.tokenAmount.uiAmount;
          }
        }
        return {
          received: totalAmount,
          confirmations: totalAmount > 0 ? 1 : 0,
          txid: totalAmount > 0 ? `sol_spl_${coinCode.toLowerCase()}_check` : null
        };
      }
    } catch (solSplErr) {
      console.warn(`[Direct SOL Check] SPL token check failed for ${address}:`, (solSplErr as Error).message);
    }
  }

  const body = {
    jsonrpc: "2.0",
    id: 1,
    method: "getBalance",
    params: [address]
  };
  const res = await fetch("https://api.mainnet-beta.solana.com", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: 'no-store',
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`SOL RPC failed with status ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);

  const balanceLamports = data.result?.value ?? 0;
  const balanceSol = balanceLamports / 1e9;
  
  return {
    received: balanceSol,
    confirmations: balanceSol > 0 ? 1 : 0,
    txid: balanceSol > 0 ? "sol_direct_rpc_check" : null
  };
}

async function checkTonAddress(address: string, paymentMemo?: string | null, createdAfter?: Date): Promise<{ received: number; confirmations: number; txid: string | null }> {
  if (!paymentMemo) {
    return { received: 0, confirmations: 0, txid: null };
  }

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

          if (createdAfter && tx.utime) {
            const txTimeMs = Number(tx.utime) * 1000;
            if (txTimeMs < createdAfter.getTime() - 5 * 60 * 1000) {
              continue;
            }
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

async function checkTrxAddress(address: string, coinCode: string = 'TRX'): Promise<{ received: number; confirmations: number; txid: string | null }> {
  try {
    const res = await fetch(`https://api.trongrid.io/v1/accounts/${encodeURIComponent(address)}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(6000),
    });
    if (res.ok) {
      const data = await res.json();
      if (data?.data && data.data.length > 0) {
        const acc = data.data[0];
        if (coinCode === 'USDT') {
          // TRC-20 USDT contract address: TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t
          const trc20List = acc.trc20 || [];
          let usdtRaw = 0;
          for (const item of trc20List) {
            if (item.TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t) {
              usdtRaw = parseFloat(item.TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t);
              break;
            }
          }
          const usdtBalance = usdtRaw / 1e6;
          return {
            received: usdtBalance,
            confirmations: usdtBalance > 0 ? 1 : 0,
            txid: usdtBalance > 0 ? 'trc20_usdt_check' : null
          };
        } else {
          // Native TRX (in Sun, 1 TRX = 1e6 Sun)
          const trxBalance = (acc.balance || 0) / 1e6;
          return {
            received: trxBalance,
            confirmations: trxBalance > 0 ? 1 : 0,
            txid: trxBalance > 0 ? 'trx_direct_check' : null
          };
        }
      }
    }
  } catch (err) {
    console.warn(`[Direct TRX Check] Trongrid check failed for ${address}:`, (err as Error).message);
  }
  return { received: 0, confirmations: 0, txid: null };
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

  let status: 'pending' | 'paid' | 'partially_paid' | 'expired' | 'detected' = currentSession.status;
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
    if (coinRow && typeof coinRow.min_payment_pct === 'number' && coinRow.min_payment_pct > 0 && coinRow.min_payment_pct < 100) {
      minPaymentPct = coinRow.min_payment_pct;
    }
  } catch {}

  const expectedAmount = Number(currentSession.crypto_amount);
  const requiredThreshold = expectedAmount * (minPaymentPct / 100);
  const confirmationsRequired = Number(currentSession.confirmations_required || 1);

  if (gatewayData) {
    status = gatewayData.status;
    receivedAmount = gatewayData.received_amount;
    txHash = gatewayData.tx_hash;
    confirmations = gatewayData.confirmations;
    paidAt = gatewayData.paid_at || (gatewayData.status === 'paid' ? new Date().toISOString() : null);

    // If gateway returns partially_paid, check if it satisfies min_payment_pct tolerance
    if (status === 'partially_paid' && expectedAmount > 0 && receivedAmount >= requiredThreshold) {
      status = confirmations >= confirmationsRequired ? 'paid' : 'detected';
      paidAt = status === 'paid' ? new Date().toISOString() : null;
      console.log(`[Session Sync] Overriding gateway partially_paid to ${status} via min_payment_pct (${minPaymentPct}%) tolerance`);
    }
  } else {
    // Direct Blockchain Explorer check!
    if (currentSession.status === 'pending' || currentSession.status === 'partially_paid' || currentSession.status === 'detected') {
      try {
        const coinCode = currentSession.coin.toUpperCase();
        const address = currentSession.wallet_address;
        const paymentMemo = currentSession.payment_memo;
        // Only count transactions that occurred AFTER this checkout session was created
        const createdAfter = currentSession.created_at ? new Date(currentSession.created_at) : undefined;
        let chainInfo = { received: 0, confirmations: 0, txid: null as string | null };

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

        if (coinCode === 'LTC' || coinCode === 'BTC') {
          chainInfo = await checkBtcLtcAddress(address, coinCode, createdAfter, claimedTxHashes);
        } else if (coinCode === 'ETH' || coinCode === 'USDT' || coinCode === 'USDC') {
          chainInfo = await checkEthAddress(address, coinCode);
        } else if (coinCode === 'SOL') {
          chainInfo = await checkSolAddress(address, coinCode);
        } else if (coinCode === 'TON') {
          chainInfo = await checkTonAddress(address, paymentMemo, createdAfter);
        } else if (coinCode === 'TRX') {
          chainInfo = await checkTrxAddress(address, coinCode);
        }

        if (chainInfo.received >= requiredThreshold) {
          status = chainInfo.confirmations >= confirmationsRequired ? 'paid' : 'detected';
        } else if (chainInfo.received > 0) {
          status = 'partially_paid';
        } else if (currentSession.status === 'detected' || currentSession.status === 'partially_paid') {
          // Preserve existing detected/partially_paid status if explorer transiently returned 0
          status = currentSession.status;
        } else {
          status = 'pending';
        }

        receivedAmount = chainInfo.received;
        txHash = chainInfo.txid || txHash;
        confirmations = chainInfo.confirmations;
        paidAt = status === 'paid' ? new Date().toISOString() : null;

        console.log(`[Direct Chain Check] Session ${id} (${coinCode}): status=${status}, received=${receivedAmount}/${expectedAmount} (threshold: ${requiredThreshold})`);
      } catch (chainErr) {
        console.error(`[Direct Chain Check] Failed to check blockchain for session ${id}:`, (chainErr as Error).message);
      }
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
    if (status === 'paid') {
      const orderIds: string[] = Array.isArray(currentSession.order_ids) ? currentSession.order_ids : [];
      if (orderIds.length > 0) {
        // Query uncompleted orders synchronously (fast DB call), then fulfill async
        db.from('orders').select('id, status').in('id', orderIds).then(async ({ data: ords }: { data: any[] | null }) => {
          const uncompleted = (ords || []).filter((o: any) => o.status !== 'completed');
          const uncompletedIds = uncompleted.map((o: any) => o.id);

          if (currentSession.status !== 'paid' || uncompletedIds.length > 0) {
            console.log(`[Session Sync] Fulfilling orders for paid session: ${orderIds.join(', ')} (uncompleted: ${uncompletedIds.length})`);

            if (uncompletedIds.length > 0) {
              await db
                .from('orders')
                .update({
                  status: 'paid',
                  payment_confirmed_at: new Date().toISOString(),
                })
                .in('id', uncompletedIds);

              await fulfillOrders(db, uncompletedIds);
            }
          }
        }).catch((err: any) => {
          console.error('[Session Sync] Background fulfillment error:', err);
        });
      }
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
 * Sweep and sync all active pending/detected/partially_paid crypto sessions in the background.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function syncAllActiveCryptoSessions(db: any): Promise<number> {
  try {
    const { data: activeSessions } = await db
      .from('crypto_sessions')
      .select('id, expires_at, status')
      .in('status', ['pending', 'detected', 'partially_paid'])
      .order('created_at', { ascending: false })
      .limit(50);

    if (!activeSessions || activeSessions.length === 0) return 0;

    const now = Date.now();
    let count = 0;
    for (const s of activeSessions) {
      const expMs = new Date(s.expires_at).getTime();
      // If payment detected or partially_paid, sync indefinitely without time limit!
      // If pending, sync as long as within expiration window (+2h grace period)
      if (s.status === 'detected' || s.status === 'partially_paid' || now <= expMs + 2 * 60 * 60 * 1000) {
        await syncSessionWithGateway(s.id, db);
        count++;
      }
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

  // 1. Sync local session state with the gateway first
  await syncSessionWithGateway(id, db);

  // Trigger background sweep of active sessions asynchronously
  syncAllActiveCryptoSessions(db).catch(() => {});

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

  // Resolve checkout_ref
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

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = createServiceClient();

    // 1. Fetch the session to get order_ids
    const { data: s, error: fetchErr } = await db
      .from('crypto_sessions')
      .select('order_ids')
      .eq('id', id)
      .single();

    if (fetchErr || !s) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // 2. Delete the associated pending orders
    if (s.order_ids && s.order_ids.length > 0) {
      const { error: deleteOrdersErr } = await db
        .from('orders')
        .delete()
        .in('id', s.order_ids);
      if (deleteOrdersErr) {
        console.error('[crypto/session/cancel] Failed to delete orders:', deleteOrdersErr.message);
      }
    }

    // 3. Delete the session
    const { error: deleteSessionErr } = await db
      .from('crypto_sessions')
      .delete()
      .eq('id', id);

    if (deleteSessionErr) {
      console.error('[crypto/session/cancel] Failed to delete session:', deleteSessionErr.message);
      return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
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
