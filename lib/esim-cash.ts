import crypto from 'crypto';
import { ensureMigrations, getPool } from './db';
import { verifyJwt } from './auth/jwt';
import { getAccountExpirationInfo } from './cashback-expiration';

export interface QueryClientLike {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
}

export interface PoolLike {
  query: (text: string, params?: any[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
  connect: () => Promise<QueryClientLike & { release: () => void }>;
}

export interface VerifiedCashUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface CashAccountRow {
  id: string;
  email: string;
  user_id: string | null;
  balance_eur: number | string;
  total_spend_eur: number | string;
  affiliate_code: string;
  referred_by_code: string | null;
  extra_cashback_queue: number;
  sent_email_3?: boolean;
  sent_email_5?: boolean;
  sent_email_10?: boolean;
  last_reminder_sent_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CashOrderLineInput {
  tariffId: string;
  orderType: 'new_esim' | 'top_up';
  unitCents: number;
  usdEurRate: number;
  periodNum: number | null;
  topUpIccid: string | null;
  referredBy: string | null;
  locale: string;
  termsAcceptedAt: string;
  termsVersion: string;
}

export type ExecuteEsimCashCheckoutResult =
  | { ok: true; orderIds: string[]; remainingBalanceEur: number }
  | {
      ok: false;
      status: number;
      code: 'INSUFFICIENT_BALANCE' | 'BALANCE_CONFLICT' | 'INVALID_INPUT' | 'ORDER_CREATE_FAILED';
      error: string;
      balanceEur?: number;
      requiredEur?: number;
    };

export function toCents(eur: number | string | null | undefined): number {
  const num = Number(eur);
  if (!Number.isFinite(num)) return 0;
  return Math.round(num * 100);
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

export function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(crypto.randomInt(chars.length));
  }
  return `REF-${result}`;
}

async function resolvePool(poolOverride?: PoolLike): Promise<PoolLike> {
  if (poolOverride) return poolOverride;
  await ensureMigrations();
  return getPool();
}

/**
 * Strictly authenticates a request's session cookie against JWT signature,
 * session revocation state, and active/verified database user status.
 */
export async function authenticateVerifiedCashUser(
  token: string | undefined,
  poolOverride?: PoolLike
): Promise<{ ok: true; user: VerifiedCashUser } | { ok: false; reason: string }> {
  if (!token) {
    return { ok: false, reason: 'missing_token' };
  }

  const decoded = await verifyJwt(token);
  if (!decoded || !decoded.id) {
    return { ok: false, reason: 'invalid_token' };
  }

  const pool = await resolvePool(poolOverride);

  if (decoded.sessionId) {
    const sessRes = await pool.query(
      'SELECT revoked_at FROM public.user_sessions WHERE id = $1',
      [decoded.sessionId]
    );
    if (sessRes.rows[0]?.revoked_at) {
      return { ok: false, reason: 'session_revoked' };
    }
  }

  const userRes = await pool.query(
    'SELECT id, email, full_name, is_verified, deleted_at FROM public.users WHERE id = $1',
    [decoded.id]
  );
  const row = userRes.rows[0];
  if (!row || row.deleted_at !== null || !row.is_verified || !row.email) {
    return { ok: false, reason: 'user_invalid_or_unverified' };
  }

  return {
    ok: true,
    user: {
      id: row.id,
      email: String(row.email).trim().toLowerCase(),
      fullName: row.full_name || null,
    },
  };
}

/**
 * Reconciles a verified user's eSIM Cash account inside an open transaction:
 * - Locks matching rows by user_id or normalized email (FOR UPDATE)
 * - Expires stale balances per 90d/730d rule
 * - Claims unlinked guest accounts (user_id IS NULL) and merges duplicates safely
 * - Keeps email synced with the user's current verified email
 */
export async function reconcileUserCashAccountTx(
  client: QueryClientLike,
  userId: string,
  userEmail: string,
  opts?: { createIfMissing?: boolean }
): Promise<CashAccountRow | null> {
  const cleanEmail = userEmail.trim().toLowerCase();

  const lockRes = await client.query(
    `SELECT * FROM public.esim_cash_accounts
     WHERE user_id = $1 OR LOWER(TRIM(email)) = $2
     ORDER BY CASE WHEN user_id = $1 THEN 0 ELSE 1 END, created_at ASC
     FOR UPDATE`,
    [userId, cleanEmail]
  );

  // Exclude any row belonging to a different non-deleted user
  const candidates: CashAccountRow[] = [];
  for (const row of lockRes.rows as CashAccountRow[]) {
    if (row.user_id && row.user_id !== userId) {
      const ownerRes = await client.query(
        'SELECT 1 FROM public.users WHERE id = $1 AND deleted_at IS NULL',
        [row.user_id]
      );
      if (ownerRes.rows.length > 0) {
        continue;
      }
    }
    candidates.push(row);
  }

  // Enforce expiration on any candidate with positive balance
  for (const row of candidates) {
    const balCents = toCents(row.balance_eur);
    if (balCents > 0) {
      const exp = getAccountExpirationInfo(row);
      if (exp.isExpired) {
        await client.query(
          `UPDATE public.esim_cash_accounts
           SET balance_eur = 0.00, updated_at = NOW()
           WHERE id = $1`,
          [row.id]
        );
        await client.query(
          `INSERT INTO public.esim_cash_transactions (email, user_id, amount, type, description)
           VALUES ($1, $2, $3, 'expire', $4)`,
          [
            String(row.email || cleanEmail).trim().toLowerCase(),
            row.user_id || userId,
            -fromCents(balCents),
            row.user_id
              ? 'Ablauf von eSIM Cash Guthaben nach 730 Tagen (Inaktivität)'
              : 'Ablauf von eSIM Cash Guthaben nach 90 Tagen (unregistriert)',
          ]
        );
        row.balance_eur = 0;
      }
    }
  }

  if (candidates.length === 0) {
    if (!opts?.createIfMissing) return null;

    const createdRes = await client.query(
      `INSERT INTO public.esim_cash_accounts (
         email, user_id, balance_eur, total_spend_eur, affiliate_code, extra_cashback_queue
       ) VALUES ($1, $2, 0.00, 0.00, $3, 0)
       RETURNING *`,
      [cleanEmail, userId, generateAffiliateCode()]
    );
    return (createdRes.rows[0] as CashAccountRow) ?? null;
  }

  const primary = candidates[0];

  // Merge any secondary (guest or legacy email) accounts into primary
  if (candidates.length > 1) {
    let totalBalCents = toCents(primary.balance_eur);
    let totalSpendCents = toCents(primary.total_spend_eur);
    let totalQueue = Number(primary.extra_cashback_queue || 0);
    const primaryEmail = String(primary.email || '').trim().toLowerCase();

    for (let i = 1; i < candidates.length; i++) {
      const dup = candidates[i];
      totalBalCents += toCents(dup.balance_eur);
      totalSpendCents += toCents(dup.total_spend_eur);
      totalQueue += Number(dup.extra_cashback_queue || 0);

      const dupEmail = String(dup.email || '').trim().toLowerCase();
      if (dupEmail && dupEmail !== cleanEmail) {
        await client.query(
          `UPDATE public.esim_cash_transactions
           SET user_id = $1, email = $2
           WHERE LOWER(TRIM(email)) = $3 OR user_id = $1`,
          [userId, cleanEmail, dupEmail]
        );
      }

      await client.query('DELETE FROM public.esim_cash_accounts WHERE id = $1', [dup.id]);
    }

    if (primaryEmail && primaryEmail !== cleanEmail) {
      await client.query(
        `UPDATE public.esim_cash_transactions
         SET user_id = $1, email = $2
         WHERE LOWER(TRIM(email)) = $3 OR user_id = $1`,
        [userId, cleanEmail, primaryEmail]
      );
    }

    const mergedRes = await client.query(
      `UPDATE public.esim_cash_accounts
       SET user_id = $1,
           email = $2,
           balance_eur = $3,
           total_spend_eur = $4,
           extra_cashback_queue = $5,
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        userId,
        cleanEmail,
        fromCents(totalBalCents),
        fromCents(totalSpendCents),
        totalQueue,
        primary.id,
      ]
    );
    return mergedRes.rows[0] as CashAccountRow;
  }

  const primaryEmail = String(primary.email || '').trim().toLowerCase();
  if (primary.user_id !== userId || primaryEmail !== cleanEmail) {
    await client.query(
      `UPDATE public.esim_cash_transactions
       SET user_id = $1, email = $2
       WHERE user_id = $1 OR LOWER(TRIM(email)) = $3`,
      [userId, cleanEmail, primaryEmail]
    );

    const updatedRes = await client.query(
      `UPDATE public.esim_cash_accounts
       SET user_id = $1,
           email = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [userId, cleanEmail, primary.id]
    );
    return updatedRes.rows[0] as CashAccountRow;
  }

  return primary;
}

/**
 * Fetches (and reconciles/expires/claims) the authenticated user's eSIM Cash account.
 */
export async function getReconciledUserCashAccount(
  userId: string,
  userEmail: string,
  opts?: { createIfMissing?: boolean },
  poolOverride?: PoolLike
): Promise<CashAccountRow | null> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const acc = await reconcileUserCashAccountTx(client, userId, userEmail, opts);
    await client.query('COMMIT');
    return acc;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Atomically executes an eSIM Cash checkout inside a single PostgreSQL transaction:
 * - Reconciles & locks account (FOR UPDATE)
 * - Verifies integer-cent balance >= totalCents
 * - Deducts balance atomically in SQL
 * - Inserts paid orders (with cashback_processed = TRUE)
 * - Logs single 'spend' ledger transaction linked to checkoutRef + orderId
 */
export async function executeEsimCashCheckout(
  params: {
    userId: string;
    userEmail: string;
    fullName: string | null;
    checkoutRef: string;
    totalCents: number;
    orderItems: CashOrderLineInput[];
    description?: string;
  },
  poolOverride?: PoolLike
): Promise<ExecuteEsimCashCheckoutResult> {
  const { userId, userEmail, fullName, checkoutRef, totalCents, orderItems, description } = params;

  if (!Number.isInteger(totalCents) || totalCents <= 0 || !Array.isArray(orderItems) || orderItems.length === 0) {
    return { ok: false, status: 400, code: 'INVALID_INPUT', error: 'Invalid checkout items or total' };
  }

  let itemsSum = 0;
  for (const item of orderItems) {
    if (!Number.isInteger(item.unitCents) || item.unitCents <= 0) {
      return { ok: false, status: 400, code: 'INVALID_INPUT', error: 'Invalid item amount' };
    }
    itemsSum += item.unitCents;
  }
  if (itemsSum !== totalCents) {
    return { ok: false, status: 400, code: 'INVALID_INPUT', error: 'Order total mismatch' };
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const acc = await reconcileUserCashAccountTx(client, userId, cleanEmail, { createIfMissing: false });
    const balanceCents = toCents(acc?.balance_eur);

    if (!acc || balanceCents < totalCents) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        status: 400,
        code: 'INSUFFICIENT_BALANCE',
        error: 'Insufficient eSIM Cash balance',
        balanceEur: fromCents(balanceCents),
        requiredEur: fromCents(totalCents),
      };
    }

    const deductRes = await client.query(
      `UPDATE public.esim_cash_accounts
       SET balance_eur = ROUND(((ROUND(balance_eur * 100)::bigint - $1::bigint)::numeric) / 100, 2),
           user_id = $2,
           email = $3,
           updated_at = NOW()
       WHERE id = $4
         AND ROUND(balance_eur * 100)::bigint >= $1::bigint
       RETURNING id, balance_eur`,
      [totalCents, userId, cleanEmail, acc.id]
    );

    if ((deductRes.rowCount ?? deductRes.rows.length) !== 1) {
      await client.query('ROLLBACK');
      return {
        ok: false,
        status: 409,
        code: 'BALANCE_CONFLICT',
        error: 'Balance deduction failed due to concurrent modification. Please try again.',
      };
    }

    const nowIso = new Date().toISOString();
    const orderIds: string[] = [];

    for (const item of orderItems) {
      const unitEur = fromCents(item.unitCents);
      const ordRes = await client.query(
        `INSERT INTO public.orders (
           user_id, tariff_id, order_type, status, customer_email, customer_name,
           amount_eur, usd_eur_rate, period_num, top_up_iccid, checkout_ref,
           referred_by_code, cashback_applied_eur, cashback_earned_eur, cashback_processed,
           locale, payment_confirmed_at, terms_accepted_at, terms_version
         ) VALUES (
           $1, $2, $3, 'paid', $4, $5,
           $6, $7, $8, $9, $10,
           $11, $12, 0.00, TRUE,
           $13, $14, $15, $16
         )
         RETURNING id`,
        [
          userId,
          item.tariffId,
          item.orderType,
          cleanEmail,
          fullName,
          unitEur,
          item.usdEurRate,
          item.periodNum,
          item.topUpIccid,
          checkoutRef,
          item.referredBy,
          unitEur,
          item.locale,
          nowIso,
          item.termsAcceptedAt,
          item.termsVersion,
        ]
      );
      if (!ordRes.rows[0]?.id) {
        throw new Error('Failed to insert eSIM Cash order row');
      }
      orderIds.push(ordRes.rows[0].id);
    }

    await client.query(
      `INSERT INTO public.esim_cash_transactions (
         email, user_id, amount, type, checkout_ref, order_id, description
       ) VALUES ($1, $2, $3, 'spend', $4, $5, $6)`,
      [
        cleanEmail,
        userId,
        -fromCents(totalCents),
        checkoutRef,
        orderIds[0],
        description || `Kauf via eSIM Cash (#${checkoutRef.slice(0, 8).toUpperCase()})`,
      ]
    );

    await client.query('COMMIT');

    return {
      ok: true,
      orderIds,
      remainingBalanceEur: Number(deductRes.rows[0].balance_eur),
    };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[esim-cash] executeEsimCashCheckout failed:', err?.message || err);
    return {
      ok: false,
      status: 500,
      code: 'ORDER_CREATE_FAILED',
      error: 'Could not create orders',
    };
  } finally {
    client.release();
  }
}

/**
 * Atomically refunds an unprovisioned eSIM Cash order if fulfillment failed or moved to review.
 * Idempotent: guaranteed to refund at most once per orderId.
 */
export async function refundFailedEsimCashOrder(
  orderId: string,
  reason?: string,
  poolOverride?: PoolLike
): Promise<{ refunded: boolean; alreadyRefunded?: boolean; refundedEur?: number }> {
  const pool = await resolvePool(poolOverride);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const ordRes = await client.query(
      `SELECT id, user_id, customer_email, status, order_type, iccid, cashback_applied_eur, checkout_ref, error_message
       FROM public.orders
       WHERE id = $1
       FOR UPDATE`,
      [orderId]
    );
    const ord = ordRes.rows[0];
    if (!ord) {
      await client.query('ROLLBACK');
      return { refunded: false };
    }

    if (ord.status === 'refunded') {
      await client.query('ROLLBACK');
      return { refunded: false, alreadyRefunded: true };
    }

    const refundCents = toCents(ord.cashback_applied_eur);
    const unprovisioned = ord.order_type === 'top_up' || !ord.iccid;
    const eligibleStatus = ord.status === 'failed' || ord.status === 'review';

    if (!eligibleStatus || !unprovisioned || refundCents <= 0) {
      await client.query('ROLLBACK');
      return { refunded: false };
    }

    const existingRefund = await client.query(
      `SELECT 1 FROM public.esim_cash_transactions
       WHERE order_id = $1 AND type = 'refund'
       LIMIT 1`,
      [orderId]
    );
    if (existingRefund.rows.length > 0) {
      await client.query(
        `UPDATE public.orders SET status = 'refunded', updated_at = NOW() WHERE id = $1`,
        [orderId]
      );
      await client.query('COMMIT');
      return { refunded: false, alreadyRefunded: true };
    }

    const cleanEmail = String(ord.customer_email || '').trim().toLowerCase();
    let acc: CashAccountRow | null = null;
    if (ord.user_id) {
      acc = await reconcileUserCashAccountTx(client, ord.user_id, cleanEmail, { createIfMissing: true });
    } else if (cleanEmail) {
      const byEmailRes = await client.query(
        `SELECT * FROM public.esim_cash_accounts WHERE LOWER(TRIM(email)) = $1 FOR UPDATE`,
        [cleanEmail]
      );
      acc = (byEmailRes.rows[0] as CashAccountRow) ?? null;
      if (!acc) {
        const ins = await client.query(
          `INSERT INTO public.esim_cash_accounts (email, user_id, balance_eur, total_spend_eur, affiliate_code, extra_cashback_queue)
           VALUES ($1, NULL, 0.00, 0.00, $2, 0)
           RETURNING *`,
          [cleanEmail, generateAffiliateCode()]
        );
        acc = ins.rows[0] as CashAccountRow;
      }
    }

    if (!acc) {
      await client.query('ROLLBACK');
      return { refunded: false };
    }

    await client.query(
      `UPDATE public.esim_cash_accounts
       SET balance_eur = ROUND(((ROUND(balance_eur * 100)::bigint + $1::bigint)::numeric) / 100, 2),
           updated_at = NOW()
       WHERE id = $2`,
      [refundCents, acc.id]
    );

    const errSuffix = ord.error_message ? ` (${ord.error_message})` : '';
    await client.query(
      `UPDATE public.orders
       SET status = 'refunded',
           error_message = COALESCE($2, error_message),
           updated_at = NOW()
       WHERE id = $1`,
      [orderId, reason ? `${reason}${errSuffix}` : ord.error_message]
    );

    await client.query(
      `INSERT INTO public.esim_cash_transactions (
         email, user_id, amount, type, checkout_ref, order_id, description
       ) VALUES ($1, $2, $3, 'refund', $4, $5, $6)`,
      [
        String(acc.email || cleanEmail).trim().toLowerCase(),
        acc.user_id || ord.user_id || null,
        fromCents(refundCents),
        ord.checkout_ref || null,
        orderId,
        reason || `Rückerstattung eSIM Cash für Bestellung #${orderId.split('-')[0].toUpperCase()}`,
      ]
    );

    await client.query('COMMIT');
    return { refunded: true, refundedEur: fromCents(refundCents) };
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error('[esim-cash] refundFailedEsimCashOrder failed:', err?.message || err);
    return { refunded: false };
  } finally {
    client.release();
  }
}
