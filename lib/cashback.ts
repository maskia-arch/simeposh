import type { createServiceClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/types';
import { sendCashbackEarnedEmail, sendGuestMilestoneEmail } from '@/lib/email/mailer';

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

/**
 * Generate a unique 8-character uppercase affiliate code suffix.
 */
function generateAffiliateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `REF-${result}`;
}

/**
 * Resolve or create an eSIM Cash account for a user's email.
 */
export async function resolveEsimCashAccount(
  supabase: ReturnType<typeof createServiceClient>,
  email: string,
  userId: string | null = null
): Promise<EsimCashAccountRow> {
  const cleanEmail = email.trim().toLowerCase();
  
  // Try to fetch existing
  const { data: existing } = await supabase
    .from('esim_cash_accounts')
    .select('*')
    .eq('email', cleanEmail)
    .maybeSingle();

  if (existing) {
    // Link user_id if it was NULL but is now provided
    if (userId && !existing.user_id) {
      const { data: updated } = await supabase
        .from('esim_cash_accounts')
        .update({ user_id: userId })
        .eq('id', existing.id)
        .select('*')
        .single();
      return updated as EsimCashAccountRow;
    }
    return existing as EsimCashAccountRow;
  }

  // Create new account
  const affiliateCode = generateAffiliateCode();
  const { data: created, error } = await supabase
    .from('esim_cash_accounts')
    .insert({
      email: cleanEmail,
      user_id: userId,
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
 * Apply loyalty calculations, referrals, and credit cashback/referrals upon successful checkout payment.
 * Idempotent: safe to run multiple times for the same order.
 */
export async function applyOrderCompletionCashback(
  supabase: ReturnType<typeof createServiceClient>,
  orderId: string
) {
  // Fetch order with its tariff details
  const { data: order, error: orderErr } = await supabase
    .from('orders')
    .select('*, tariffs(name, country_name)')
    .eq('id', orderId)
    .single();

  if (orderErr || !order) {
    console.error(`[cashback] Order ${orderId} not found:`, orderErr?.message);
    return;
  }

  const o = order as any;

  // Idempotency check: if cashback was already computed for this order, skip it.
  if (Number(o.cashback_earned_eur) > 0) {
    return;
  }

  const cleanEmail = o.customer_email.trim().toLowerCase();
  const account = await resolveEsimCashAccount(supabase, cleanEmail, o.user_id);

  // 1. Calculate base rate from rank
  const { rate: baseRate } = getUserRankAndRate(Number(account.total_spend_eur));
  let finalRate = baseRate;
  let usedQueueTicket = false;

  // 2. Queue logic: consume one +5% cashback ticket if available
  if (account.extra_cashback_queue > 0) {
    finalRate = baseRate + 0.05;
    usedQueueTicket = true;
  }

  // 3. Compute net amount spent (total amount - balance applied as discount)
  const netSpend = Math.max(0, Number(o.amount_eur) - Number(o.cashback_applied_eur));
  const earned = Math.round(netSpend * finalRate * 100) / 100;

  // 4. Update the account balance and total spend
  let newBalance = Number(account.balance_eur) + earned;
  let newSpend = Number(account.total_spend_eur) + netSpend;
  let newQueue = account.extra_cashback_queue;

  if (usedQueueTicket) {
    newQueue = Math.max(0, newQueue - 1);
  }

  // Deduct any applied balance from the account
  const applied = Number(o.cashback_applied_eur);
  if (applied > 0) {
    newBalance = Math.max(0, newBalance - applied);
  }

  // 5. Update account in DB
  const { error: accUpdateErr } = await supabase
    .from('esim_cash_accounts')
    .update({
      balance_eur: newBalance,
      total_spend_eur: newSpend,
      extra_cashback_queue: newQueue,
    })
    .eq('id', account.id);

  if (accUpdateErr) {
    console.error(`[cashback] Failed to update account ${account.id}:`, accUpdateErr.message);
    return;
  }

  // 6. Log transactions
  if (earned > 0) {
    await supabase.from('esim_cash_transactions').insert({
      email: cleanEmail,
      user_id: o.user_id,
      amount: earned,
      type: 'earn',
      description: `Cashback (${(finalRate * 100).toFixed(0)}%) für Kauf von ${o.tariffs?.name || 'eSIM'}`
    });
  }

  if (applied > 0) {
    await supabase.from('esim_cash_transactions').insert({
      email: cleanEmail,
      user_id: o.user_id,
      amount: -applied,
      type: 'spend',
      description: `Guthabeneinlösung für Bestellung #${o.id.split('-')[0].toUpperCase()}`
    });
  }

  // 7. Update order to mark it as processed
  await supabase
    .from('orders')
    .update({ cashback_earned_eur: earned })
    .eq('id', orderId);

  // 8. Referral Program ("Win-Win" logic)
  // Check if this is the user's first completed order to reward both buyer and referrer.
  const { count: completedOrders } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('customer_email', cleanEmail)
    .eq('status', 'completed');

  const isFirstPurchase = (completedOrders ?? 0) <= 1; // Since current order is now completed, count is 1.

  if (isFirstPurchase && o.referred_by_code) {
    const refCode = o.referred_by_code.trim();
    
    // Find the referrer account
    const { data: referrer } = await supabase
      .from('esim_cash_accounts')
      .select('*')
      .eq('affiliate_code', refCode)
      .maybeSingle();

    // Prevent self-referral
    if (referrer && referrer.email !== cleanEmail) {
      // 1. Credit Referrer
      await supabase.from('esim_cash_accounts')
        .update({ extra_cashback_queue: referrer.extra_cashback_queue + 1 })
        .eq('id', referrer.id);

      await supabase.from('esim_cash_transactions').insert({
        email: referrer.email,
        user_id: referrer.user_id,
        amount: 0.00,
        type: 'referral_bonus',
        description: `Freundschafts-Bonus (+5% Extra-Cashback) für die Empfehlung von ${cleanEmail}`
      });

      // 2. Credit Buyer
      await supabase.from('esim_cash_accounts')
        .update({ extra_cashback_queue: newQueue + 1 })
        .eq('id', account.id);

      await supabase.from('esim_cash_transactions').insert({
        email: cleanEmail,
        user_id: o.user_id,
        amount: 0.00,
        type: 'referral_bonus',
        description: `Freundschafts-Bonus (+5% Extra-Cashback) durch Empfehlungscode ${refCode}`
      });

      console.log(`[cashback] Referral bonus credited. Referrer: ${referrer.email}, Buyer: ${cleanEmail}`);
    }
  }

  // 9. Send Email Notifications
  try {
    if (o.user_id) {
      // Registered User: Send balance receipt
      await sendCashbackEarnedEmail({
        to: cleanEmail,
        earnedEur: earned,
        newBalanceEur: newBalance,
        rank: getUserRankAndRate(newSpend).rank,
        orderId: o.id,
        locale: o.locale ?? undefined,
      });
    } else {
      // Guest User: Check milestone thresholds (10€, 5€, 3€) and send reminders
      let highestMilestone = 0;
      let updateFlags: Partial<Database['public']['Tables']['esim_cash_accounts']['Update']> = {};

      if (newBalance >= 10.00 && !account.sent_email_10) {
        highestMilestone = 10;
        updateFlags = { sent_email_3: true, sent_email_5: true, sent_email_10: true };
      } else if (newBalance >= 5.00 && !account.sent_email_5) {
        highestMilestone = 5;
        updateFlags = { sent_email_3: true, sent_email_5: true };
      } else if (newBalance >= 3.00 && !account.sent_email_3) {
        highestMilestone = 3;
        updateFlags = { sent_email_3: true };
      }

      if (highestMilestone > 0) {
        await supabase
          .from('esim_cash_accounts')
          .update(updateFlags)
          .eq('id', account.id);

        await sendGuestMilestoneEmail({
          to: cleanEmail,
          balanceEur: newBalance,
          milestoneEur: highestMilestone,
          locale: o.locale ?? undefined,
        });
      }
    }
  } catch (emailErr) {
    console.error(`[cashback] Failed to send cashback email to ${cleanEmail}:`, emailErr);
  }
}
