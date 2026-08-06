import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { getAccountExpirationInfo } from '@/lib/cashback';
import { sendGuestCashReminderEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  return handleCron(request);
}

export async function POST(request: Request) {
  return handleCron(request);
}

async function handleCron(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret') || authHeader?.replace(/^Bearer\s+/i, '');
    const expectedSecret = process.env.CRON_SECRET || process.env.SHOP_WEBHOOK_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: invalid or missing cron secret' }, { status: 401 });
    }

    const supabase = createServiceClient();
    const nowMs = Date.now();
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

    // Fetch all accounts with balance > 0
    const { data: accounts, error: fetchErr } = await supabase
      .from('esim_cash_accounts')
      .select('*')
      .gt('balance_eur', 0);

    if (fetchErr) {
      console.error('[cron/esim-cash] Failed to fetch accounts:', fetchErr.message);
      return NextResponse.json({ error: fetchErr.message }, { status: 500 });
    }

    let remindersSent = 0;
    let expiredAccountsCount = 0;

    if (accounts && accounts.length > 0) {
      for (const acc of accounts) {
        const balance = Number(acc.balance_eur || 0);
        if (balance <= 0) continue;

        const expInfo = getAccountExpirationInfo(acc);

        // 1. Check if balance has expired
        if (expInfo.isExpired) {
          // Zero out balance and record expiration transaction
          const { error: resetErr } = await supabase
            .from('esim_cash_accounts')
            .update({
              balance_eur: 0.00,
              updated_at: new Date().toISOString(),
            })
            .eq('id', acc.id);

          if (!resetErr) {
            await supabase.from('esim_cash_transactions').insert({
              email: acc.email,
              user_id: acc.user_id,
              amount: -balance,
              type: 'expire',
              description: acc.user_id
                ? 'Ablauf von eSIM Cash Guthaben nach 730 Tagen (Inaktivität)'
                : 'Ablauf von eSIM Cash Guthaben nach 90 Tagen (unregistriert)',
            });
            expiredAccountsCount++;
            console.log(`[cron/esim-cash] Expired balance (${balance} €) for ${acc.email} (registered: ${Boolean(acc.user_id)})`);
          }
          continue;
        }

        // 2. Process weekly reminder email for unregistered guest accounts
        if (!acc.user_id) {
          const lastReminderMs = acc.last_reminder_sent_at
            ? new Date(acc.last_reminder_sent_at).getTime()
            : 0;

          const timeSinceLastReminder = nowMs - lastReminderMs;

          if (timeSinceLastReminder >= SEVEN_DAYS_MS) {
            try {
              await sendGuestCashReminderEmail({
                to: acc.email,
                balanceEur: balance,
                expiryDateFormatted: expInfo.expiryDateFormatted,
                daysRemaining: expInfo.daysRemaining,
              });

              await supabase
                .from('esim_cash_accounts')
                .update({
                  last_reminder_sent_at: new Date().toISOString(),
                })
                .eq('id', acc.id);

              remindersSent++;
              console.log(`[cron/esim-cash] Sent weekly reminder email to guest ${acc.email} (${balance} € balance, expires ${expInfo.expiryDateFormatted})`);
            } catch (emailErr) {
              console.error(`[cron/esim-cash] Failed to send reminder email to ${acc.email}:`, emailErr);
            }
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      expiredAccountsCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[cron/esim-cash] Fatal cron execution error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
