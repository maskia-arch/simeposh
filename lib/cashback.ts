import type { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { sendCashbackEarnedEmail, sendGuestMilestoneEmail } from '@/lib/email/mailer';
import { ensureMigrations, getPool } from './db';
import {
  fromCents,
  generateAffiliateCode,
  getReconciledUserCashAccount,
  reconcileUserCashAccountTx,
  toCents,
  type CashAccountRow,
  type PoolLike,
} from './esim-cash';
import { getAccountExpirationInfo } from './cashback-expiration';

type EsimCashAccountRow = Database['public']['Tables']['esim_cash_accounts']['Row'];

export interface UserRankInfo {
  rank:          string;
  rate:          number; // e.g. 0.05 for 5%
  nextThreshold: number | null;
}

/**
 * Determine rank, rate, and next threshold based on total spend in EUR.
 */
export function getUserRankAndRate(totalSpend: number): UserRankInfo {
  if (totalSpend >= 1000) {
    return { rank: 'Platinum', rate: 0.10, nextThreshold: null };
  } else if (totalSpend >= 500) {
    return { rank: 'Gold', rate: 0.08, nextThreshold: 1000 };
  } else if (totalSpend >= 100) {
    return { rank: 'Silver', rate: 0.06, nextThreshold: 500 };
  } else {
    return { rank: 'Bronze', rate: 0.05, nextThreshold: 100 };
  }
}

export { getAccountExpirationInfo, type ExpirationInfo } from './cashback-expiration';

/**
 * Resolve or create an eSIM Cash account for a user's email.
 */
export async function resolveEsimCashAccount(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  userId: string | null = null
): Promise<EsimCashAccountRow> {
  const cleanEmail = email.trim().toLowerCase();

  if (userId) {
    const acc = await getReconciledUserCashAccount(userId, cleanEmail, { createIfMissing: true });
    if (!acc) {
      throw new Error('Failed to resolve eSIM Cash account');
    }
    return acc as unknown as EsimCashAccountRow;
  }

  // Guest resolution (no userId)
  const { data: existing } = await supabase
    .from('esim_cash_accounts')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    const balCents = toCents(existing.balance_eur);
    if (balCents > 0 && getAccountExpirationInfo(existing).isExpired) {
      await supabase
        .from('esim_cash_accounts')
        .update({ balance_eur: 0.00, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      await supabase.from('esim_cash_transactions').insert({
        email: cleanEmail,
        user_id: null,
        amount: -fromCents(balCents),
        type: 'expire',
        description: 'Ablauf von eSIM Cash Guthaben nach 90 Tagen (unregistriert)',
      });
      existing.balance_eur = 0;
    }
    return existing as EsimCashAccountRow;
  }

  const affiliateCode = generateAffiliateCode();
  const { data: created, error } = await supabase
    .from('esim_cash_accounts')
    .insert({
      email: cleanEmail,
      user_id: null,
      balance_eur: 0.00,
      total_spend_eur: 0.00,
      affiliate_code: affiliateCode,
      extra_cashback_queue: 0
    })
    .select('*')
    .single();

  if (error || !created) {
    throw new Error(`Failed to create eSIM Cash account: ${error?.message}`);
  }

  return created as EsimCashAccountRow;
}

/**
 * Apply loyalty calculations, referrals, and credit cashback upon successful order fulfillment.
 * Transactional & idempotent:
 * - Orders fully paid with eSIM Cash (netSpend <= 0) never re-deduct balance, never consume +5% tickets,
 *   never inflate total_spend_eur, and never emit duplicate 'spend' or 0.00 EUR emails.
 */
export async function applyOrderCompletionCashback(
  _supabase: ReturnType<typeof createServiceClient>,
  orderId: string,
  poolOverride?: PoolLike
) {
  let pool: PoolLike;
  if (poolOverride) {
    pool = poolOverride;
  } else {
    await ensureMigrations();
    pool = getPool();
  }

  const client = await pool.connect();

  let emailPayload:
    | { kind: 'user'; to: string; earnedEur: number; newBalanceEur: number; rank: string; orderId: string; locale?: string }
    | { kind: 'guest'; to: string; balanceEur: number; milestoneEur: number; locale?: string }
    | null = null;

  try {
    await client.query('BEGIN');

    const ordRes = await client.query(
      `SELECT o.*, t.name AS tariff_name, t.country_name AS tariff_country_name
       FROM public.orders o
       LEFT JOIN public.tariffs t ON t.id = o.tariff_id
       WHERE o.id = $1
       FOR UPDATE`,
      [orderId]
    );
    const o = ordRes.rows[0];
    if (!o) {
      await client.query('ROLLBACK');
      console.error(`[cashback] Order ${orderId} not found`);
      return;
    }

    // Strict idempotency guard
    if (o.cashback_processed === true || toCents(o.cashback_earned_eur) > 0) {
      await client.query('ROLLBACK');
      return;
    }

    const netSpendCents = Math.max(0, toCents(o.amount_eur) - toCents(o.cashback_applied_eur));

    // If paid 100% with eSIM Cash (netSpend === 0), balance was already atomically deducted at checkout.
    // Do NOT deduct again, do NOT consume +5% queue tickets, and mark processed idempotently.
    if (netSpendCents <= 0) {
      await client.query(
        `UPDATE public.orders
         SET cashback_earned_eur = 0.00,
             cashback_processed = TRUE
         WHERE id = $1`,
        [orderId]
      );
      await client.query('COMMIT');
      return;
    }

    const cleanEmail = String(o.customer_email || '').trim().toLowerCase();
    let account: CashAccountRow | null = null;

    if (o.user_id) {
      account = await reconcileUserCashAccountTx(client, o.user_id, cleanEmail, { createIfMissing: true });
    } else {
      const accRes = await client.query(
        `SELECT * FROM public.esim_cash_accounts
         WHERE LOWER(TRIM(email)) = $1
         FOR UPDATE`,
        [cleanEmail]
      );
      account = (accRes.rows[0] as CashAccountRow) ?? null;

      if (account) {
        const balCents = toCents(account.balance_eur);
        if (balCents > 0 && getAccountExpirationInfo(account).isExpired) {
          await client.query(
            `UPDATE public.esim_cash_accounts
             SET balance_eur = 0.00, updated_at = NOW()
             WHERE id = $1`,
            [account.id]
          );
          await client.query(
            `INSERT INTO public.esim_cash_transactions (email, user_id, amount, type, description)
             VALUES ($1, NULL, $2, 'expire', $3)`,
            [cleanEmail, -fromCents(balCents), 'Ablauf von eSIM Cash Guthaben nach 90 Tagen (unregistriert)']
          );
          account.balance_eur = 0;
        }
      } else {
        const ins = await client.query(
          `INSERT INTO public.esim_cash_accounts (
             email, user_id, balance_eur, total_spend_eur, affiliate_code, extra_cashback_queue
           ) VALUES ($1, NULL, 0.00, 0.00, $2, 0)
           RETURNING *`,
          [cleanEmail, generateAffiliateCode()]
        );
        account = ins.rows[0] as CashAccountRow;
      }
    }

    if (!account) {
      throw new Error(`Could not resolve eSIM Cash account for order ${orderId}`);
    }

    const accountEmail = String(account.email || cleanEmail).trim().toLowerCase();
    const accountUserId = account.user_id || o.user_id || null;

    // 1. Base rate from rank
    const currentSpendEur = Number(account.total_spend_eur || 0);
    const { rate: baseRate } = getUserRankAndRate(currentSpendEur);
    let finalRate = baseRate;
    let usedQueueTicket = false;

    // 2. Consume one +5% queue ticket if available
    if (Number(account.extra_cashback_queue || 0) > 0) {
      finalRate = baseRate + 0.05;
      usedQueueTicket = true;
    }

    const earnedCents = Math.round(netSpendCents * finalRate);
    const earnedEur = fromCents(earnedCents);
    const netSpendEur = fromCents(netSpendCents);

    const newBalanceCents = toCents(account.balance_eur) + earnedCents;
    const newSpendCents = toCents(account.total_spend_eur) + netSpendCents;
    const newBalanceEur = fromCents(newBalanceCents);
    const newSpendEur = fromCents(newSpendCents);
    const queueDelta = usedQueueTicket ? -1 : 0;

    // 3. Atomic SQL update on account
    await client.query(
      `UPDATE public.esim_cash_accounts
       SET balance_eur = ROUND(((ROUND(balance_eur * 100)::bigint + $1::bigint)::numeric) / 100, 2),
           total_spend_eur = ROUND(((ROUND(total_spend_eur * 100)::bigint + $2::bigint)::numeric) / 100, 2),
           extra_cashback_queue = GREATEST(0, extra_cashback_queue + $3),
           updated_at = NOW()
       WHERE id = $4`,
      [earnedCents, netSpendCents, queueDelta, account.id]
    );

    // 4. Ledger entry (idempotent on order_id)
    if (earnedCents > 0) {
      await client.query(
        `INSERT INTO public.esim_cash_transactions (
           email, user_id, amount, type, order_id, checkout_ref, description
         ) VALUES ($1, $2, $3, 'earn', $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          accountEmail,
          accountUserId,
          earnedEur,
          orderId,
          o.checkout_ref || null,
          `Cashback (${(finalRate * 100).toFixed(0)}%) für Kauf von ${o.tariff_name || 'eSIM'}`,
        ]
      );
    }

    // 5. Mark order as cashback_processed = TRUE
    await client.query(
      `UPDATE public.orders
       SET cashback_earned_eur = $1,
           cashback_processed = TRUE
       WHERE id = $2`,
      [earnedEur, orderId]
    );

    // 6. Referral Program ("Win-Win" logic) for first completed order
    const completedRes = await client.query(
      `SELECT COUNT(*)::int AS cnt
       FROM public.orders
       WHERE LOWER(TRIM(customer_email)) = $1
         AND status = 'completed'`,
      [cleanEmail]
    );
    const completedOrders = Number(completedRes.rows[0]?.cnt ?? 0);
    const isFirstPurchase = completedOrders <= 1;

    if (isFirstPurchase && o.referred_by_code) {
      const refCode = String(o.referred_by_code).trim();
      const refRes = await client.query(
        `SELECT * FROM public.esim_cash_accounts
         WHERE affiliate_code = $1
         FOR UPDATE`,
        [refCode]
      );
      const referrer = refRes.rows[0] as CashAccountRow | undefined;

      if (referrer && String(referrer.email).trim().toLowerCase() !== cleanEmail) {
        await client.query(
          `UPDATE public.esim_cash_accounts
           SET extra_cashback_queue = extra_cashback_queue + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [referrer.id]
        );
        await client.query(
          `INSERT INTO public.esim_cash_transactions (email, user_id, amount, type, order_id, description)
           VALUES ($1, $2, 0.00, 'referral_bonus', $3, $4)`,
          [
            String(referrer.email).trim().toLowerCase(),
            referrer.user_id || null,
            orderId,
            `Freundschafts-Bonus (+5% Extra-Cashback) für die Empfehlung von ${cleanEmail}`,
          ]
        );

        await client.query(
          `UPDATE public.esim_cash_accounts
           SET extra_cashback_queue = extra_cashback_queue + 1,
               updated_at = NOW()
           WHERE id = $1`,
          [account.id]
        );
        await client.query(
          `INSERT INTO public.esim_cash_transactions (email, user_id, amount, type, order_id, description)
           VALUES ($1, $2, 0.00, 'referral_bonus', $3, $4)`,
          [
            accountEmail,
            accountUserId,
            orderId,
            `Freundschafts-Bonus (+5% Extra-Cashback) durch Empfehlungscode ${refCode}`,
          ]
        );

        console.log(`[cashback] Referral bonus credited. Referrer: ${referrer.email}, Buyer: ${cleanEmail}`);
      }
    }

    // 7. Prepare email notification (dispatched after COMMIT)
    if (accountUserId && earnedCents > 0) {
      emailPayload = {
        kind: 'user',
        to: accountEmail,
        earnedEur,
        newBalanceEur,
        rank: getUserRankAndRate(newSpendEur).rank,
        orderId: o.id,
        locale: o.locale ?? undefined,
      };
    } else if (!accountUserId) {
      let highestMilestone = 0;
      let s3 = Boolean(account.sent_email_3);
      let s5 = Boolean(account.sent_email_5);
      let s10 = Boolean(account.sent_email_10);

      if (newBalanceEur >= 10.00 && !s10) {
        highestMilestone = 10;
        s3 = true; s5 = true; s10 = true;
      } else if (newBalanceEur >= 5.00 && !s5) {
        highestMilestone = 5;
        s3 = true; s5 = true;
      } else if (newBalanceEur >= 3.00 && !s3) {
        highestMilestone = 3;
        s3 = true;
      }

      if (highestMilestone > 0) {
        await client.query(
          `UPDATE public.esim_cash_accounts
           SET sent_email_3 = $1, sent_email_5 = $2, sent_email_10 = $3
           WHERE id = $4`,
          [s3, s5, s10, account.id]
        );
        emailPayload = {
          kind: 'guest',
          to: cleanEmail,
          balanceEur: newBalanceEur,
          milestoneEur: highestMilestone,
          locale: o.locale ?? undefined,
        };
      }
    }

    await client.query('COMMIT');
  } catch (err: any) {
    try {
      await client.query('ROLLBACK');
    } catch {}
    console.error(`[cashback] Transaction failed for order ${orderId}:`, err?.message || err);
    return;
  } finally {
    client.release();
  }

  // Send emails non-fatally after COMMIT (skip in mock/unit-test pools)
  if (emailPayload && !poolOverride) {
    try {
      if (emailPayload.kind === 'user') {
        await sendCashbackEarnedEmail({
          to: emailPayload.to,
          earnedEur: emailPayload.earnedEur,
          newBalanceEur: emailPayload.newBalanceEur,
          rank: emailPayload.rank,
          orderId: emailPayload.orderId,
          locale: emailPayload.locale,
        });
      } else {
        await sendGuestMilestoneEmail({
          to: emailPayload.to,
          balanceEur: emailPayload.balanceEur,
          milestoneEur: emailPayload.milestoneEur,
          locale: emailPayload.locale,
        });
      }
    } catch (emailErr) {
      console.error(`[cashback] Failed to send cashback email:`, emailErr);
    }
  }
}
