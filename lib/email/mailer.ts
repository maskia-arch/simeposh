/**
 * E-Mail service using Nodemailer over SMTP or Resend HTTP API.
 * Marked as High Priority for client push notifications & full multi-language i18n support.
 */
import nodemailer from 'nodemailer';
import { getEmailTranslations, formatBerlinTime, normalizeEmailLocale } from './i18n';
import {
  buildEsimPurchasedHtml,
  buildEsimPurchasedText,
  type EsimPurchasedData,
} from './templates/esim-purchased';
import {
  buildTopUpHtml,
  buildTopUpText,
  type TopUpConfirmedData,
} from './templates/topup-confirmed';
import {
  buildCashbackEarnedHtml,
  buildCashbackEarnedText,
  buildGuestMilestoneHtml,
  buildGuestMilestoneText,
  buildGuestExpirationReminderHtml,
  buildGuestExpirationReminderText,
  type CashbackEarnedData,
  type GuestMilestoneData,
  type GuestExpirationReminderData,
} from './templates/cashback-notifications';
import {
  buildTicketCreatedCustomerHtml,
  buildTicketCreatedAdminHtml,
  buildTicketAnsweredCustomerHtml,
  type TicketCreatedData,
  type TicketAnsweredData,
} from './templates/ticket-notifications';

function createTransporter() {
  const host   = process.env.SMTP_HOST;
  const port   = parseInt(process.env.SMTP_PORT ?? '587', 10);
  const secure = process.env.SMTP_SECURE === 'true';
  const user   = process.env.SMTP_USER;
  const pass   = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'Missing SMTP configuration. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.'
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // Outdated VM trust store safe fallback
  });
}

function fromAddress(): string {
  const name    = process.env.SMTP_FROM_NAME    ?? 'PureSim';
  const address = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER ?? '';
  return `"${name}" <${address}>`;
}

import { createServiceClient } from '@/lib/supabase/server';

async function sendMailThroughTransporter(mailOptions: {
  to: string;
  subject: string;
  html: string;
  text?: string;
  emailType?: string;
  metadata?: any;
}): Promise<void> {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  const cleanTo = mailOptions.to.trim();

  if (!cleanTo || !cleanTo.includes('@')) {
    console.error('[mailer] Cannot send email: invalid or empty recipient address:', mailOptions.to);
    return;
  }

  const domain = (process.env.SMTP_FROM_ADDRESS?.split('@')[1] || 'puresim.net').toLowerCase();
  const msgId = `<ps-${Date.now()}-${Math.random().toString(36).substring(2, 9)}@${domain}>`;

  const priorityHeaders = {
    'X-Priority': '1 (Highest)',
    'X-MSMail-Priority': 'High',
    'Importance': 'High',
    'Priority': 'urgent',
    'Precedence': 'first-class',
    'X-Auto-Response-Suppress': 'OOF, AutoReply',
    'Message-ID': msgId,
  };

  let sendSuccess = false;

  // Use Resend HTTP REST API if using Resend (avoids firewall port blocks)
  const isResend = host?.includes('resend.com') || pass?.startsWith('re_');

  if (isResend && pass) {
    try {
      console.log('[mailer] Dispatching High Priority email via Resend HTTP API to:', cleanTo);
      const fromName = process.env.SMTP_FROM_NAME ?? 'PureSim';
      const fromAddr = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER ?? 'noreply@puresim.net';
      const cleanFrom = `"${fromName}" <${fromAddr}>`;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${pass}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: cleanFrom,
          to: [cleanTo],
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text || undefined,
          headers: priorityHeaders,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API returned status ${response.status}: ${errText}`);
      }

      console.log(`[mailer] Resend HTTP email successfully sent to ${cleanTo}`);
      sendSuccess = true;
    } catch (err) {
      console.error('[mailer] Resend HTTP API dispatch failed. Falling back to SMTP:', err);
    }
  }

  // Fallback to Nodemailer SMTP if Resend didn't send it
  if (!sendSuccess) {
    try {
      const transporter = createTransporter();
      await transporter.sendMail({
        from:     fromAddress(),
        to:       cleanTo,
        subject:  mailOptions.subject,
        html:     mailOptions.html,
        text:     mailOptions.text,
        priority: 'high',
        headers:  priorityHeaders,
        messageId: msgId,
      });
      console.log(`[mailer] High Priority SMTP email successfully sent to ${cleanTo}`);
      sendSuccess = true;
    } catch (smtpErr) {
      console.error('[mailer] SMTP dispatch failed for recipient:', cleanTo, smtpErr);
      throw smtpErr;
    }
  }

  // Log transcript to sent_emails table for admin audit & inspection
  try {
    const db = createServiceClient();
    await (db.from('sent_emails' as any)).insert({
      recipient_email: cleanTo.toLowerCase(),
      subject: mailOptions.subject,
      email_type: mailOptions.emailType || 'custom',
      body_html: mailOptions.html,
      body_text: mailOptions.text || null,
      metadata: mailOptions.metadata || {},
      status: 'sent',
      sent_at: new Date().toISOString(),
    });
    console.log(`[mailer] Saved email transcript for ${cleanTo} in sent_emails table`);
  } catch (logErr: any) {
    console.error('[mailer] Failed to save sent_emails transcript:', logErr.message);
  }

}


// ─── Send eSIM purchase confirmation ─────────────────────────

export async function sendEsimEmail(data: EsimPurchasedData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);
  const subject = data.isLatePayment ? t.esimLateSubject(data.countryName) : t.esimSubject(data.countryName);

  await sendMailThroughTransporter({
    to:        data.to,
    subject:   subject,
    html:      buildEsimPurchasedHtml(data),
    text:      buildEsimPurchasedText(data),
    emailType: data.isLatePayment ? 'verspaetet_lieferung' : 'esim_lieferung',
    metadata:  { order_id: data.orderId, iccid: data.iccid, country: data.countryName, is_late_payment: data.isLatePayment },
  });
}


// ─── Send Top-Up confirmation ─────────────────────────────────

export async function sendTopUpEmail(data: TopUpConfirmedData & { to: string }): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:        data.to,
    subject:   t.topUpSubject(data.dataGb),
    html:      buildTopUpHtml(data),
    text:      buildTopUpText(data),
    emailType: 'topup_bestaetigung',
    metadata:  { iccid: data.iccid, data_gb: data.dataGb },
  });
}

// ─── Send eSIM Cash Earned notification ───────────────────────

export async function sendCashbackEarnedEmail(data: CashbackEarnedData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:        data.to,
    subject:   t.cashbackEarnedSubject((Number(data.earnedEur) || 0).toFixed(2)),
    html:      buildCashbackEarnedHtml(data),
    text:      buildCashbackEarnedText(data),
    emailType: 'cashback_gutschrift',
    metadata:  { earned_eur: data.earnedEur, rank: data.rank, order_id: data.orderId },
  });

}


// ─── Send Guest Milestone notification ────────────────────────

export async function sendGuestMilestoneEmail(data: GuestMilestoneData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:      data.to,
    subject: t.guestMilestoneSubject,
    html:    buildGuestMilestoneHtml(data),
    text:    buildGuestMilestoneText(data),
  });
}

export async function sendGenericEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  await sendMailThroughTransporter(opts);
}

export async function sendCheckoutNotificationEmail(opts: {
  to: string;
  invoiceId: string;
  coin: string;
  cryptoAmount: string;
  amountEur: number;
  expiresAt: string;
  checkoutLink: string;
  locale?: string;
  durationMins?: number;
}): Promise<void> {
  const normLoc = normalizeEmailLocale(opts.locale);
  const t = getEmailTranslations(normLoc);
  const duration = opts.durationMins && opts.durationMins > 0 ? opts.durationMins : 30;
  const { fullString: berlinTimeFormatted } = formatBerlinTime(opts.expiresAt, normLoc);
  const expiryDisplay = `${berlinTimeFormatted} ${t.validMinutes(duration)}`;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <div style="text-align: center; margin-bottom: 20px;">
        <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px; border-collapse:collapse;">
          <tr>
            <td align="center" style="vertical-align:middle; padding-right:8px;">
              <img src="${logoUrl}" width="44" height="44" alt="PureSim Logo" style="display:block; width:44px; height:44px; object-fit:contain; border:0; outline:none;" />
            </td>
            <td align="center" style="vertical-align:middle;">
              <span style="font-size:24px; font-weight:800; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:-0.5px; line-height:1.2;">
                <span style="color:#1d4ed8;">Pur</span><span style="color:#0ea5e9;">eSim</span>
              </span>
            </td>
          </tr>
        </table>
        <h2 style="color: #0f172a; margin: 0 0 8px; font-size: 20px; font-weight: 800;">${t.checkoutTitle}</h2>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">${t.greeting()}</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        ${t.checkoutSub}
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">${t.invoiceIdLabel}</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold;">${opts.invoiceId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">${t.paymentMethodLabel}</td>
            <td style="padding: 6px 0; text-align: right;">${opts.coin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">${t.amountLabel}</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold;">${(Number(opts.amountEur) || 0).toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">${t.validUntilLabel}</td>
            <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: bold;">${expiryDisplay}</td>
          </tr>
        </table>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
        ${t.checkoutInstruction}
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${opts.checkoutLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block;">
          ${t.checkoutCta((Number(opts.amountEur) || 0).toFixed(2))}
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.4;">
        ${t.checkoutIgnoreText}
      </p>
    </div>
  `;

  const text = `
${t.greeting()}

${t.checkoutSub}

${t.invoiceIdLabel} ${opts.invoiceId}
${t.paymentMethodLabel} ${opts.coin}
${t.amountLabel} ${(Number(opts.amountEur) || 0).toFixed(2)} €
${t.validUntilLabel} ${expiryDisplay}

${t.checkoutInstruction}
${opts.checkoutLink}

${t.checkoutIgnoreText}
  `.trim();

  await sendMailThroughTransporter({
    to:        opts.to,
    subject:   t.checkoutSubject(opts.invoiceId),
    html,
    text,
    emailType: 'krypto_checkout',
    metadata:  { invoice_id: opts.invoiceId, coin: opts.coin, amount_eur: opts.amountEur },
  });
}

export async function sendTicketCreatedEmail(data: TicketCreatedData): Promise<void> {
  await sendMailThroughTransporter({
    to:        data.customerEmail,
    subject:   `[PureSim] Support-Ticket empfangen: ${data.ticketNumber}`,
    html:      buildTicketCreatedCustomerHtml(data),
    text:      `Hallo ${data.customerName || 'Kunde'},\n\nwir haben deine Anfrage (${data.ticketNumber}: ${data.subject}) erhalten.\nDu kannst dein Ticket im Dashboard verfolgen:\n${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=tickets`,
    emailType: 'support_ticket_erstellt',
    metadata:  { ticket_number: data.ticketNumber, category: data.category },
  });
}

export async function sendTicketAdminAlertEmail(data: TicketCreatedData): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'kaozpicks@gmail.com';
  await sendMailThroughTransporter({
    to:        adminEmail,
    subject:   `🚨 [Admin Alert] Neues Support-Ticket ${data.ticketNumber} von ${data.customerEmail}`,
    html:      buildTicketCreatedAdminHtml(data),
    text:      `Neues Ticket ${data.ticketNumber} von ${data.customerEmail}.\nBetreff: ${data.subject}\nNachricht:\n${data.description}`,
    emailType: 'admin_ticket_alert',
    metadata:  { ticket_number: data.ticketNumber },
  });
}

export async function sendTicketAnsweredEmail(data: TicketAnsweredData): Promise<void> {
  await sendMailThroughTransporter({
    to:        data.customerEmail,
    subject:   `[PureSim] Antwort auf Support-Ticket ${data.ticketNumber}`,
    html:      buildTicketAnsweredCustomerHtml(data),
    text:      `Hallo ${data.customerName || 'Kunde'},\n\nes gibt eine neue Antwort auf dein Ticket ${data.ticketNumber}:\n\n${data.replyMessage}\n\nAntworten kannst du im Dashboard:\n${process.env.NEXT_PUBLIC_APP_URL}/dashboard?tab=tickets`,
    emailType: 'support_ticket_antwort',
    metadata:  { ticket_number: data.ticketNumber },
  });
}



export async function sendGuestCashReminderEmail(data: GuestExpirationReminderData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const isDe = normLoc === 'de';
  const formattedBalance = (Number(data.balanceEur) || 0).toFixed(2);
  const subject = isDe
    ? `⏰ Dein eSIM Cash Guthaben (${formattedBalance} €) verfällt in Kürze – Jetzt verlängern!`
    : `⏰ Your eSIM Cash balance (${formattedBalance} €) expires soon – Extend now!`;

  await sendMailThroughTransporter({
    to:      data.to,
    subject: subject,
    html:    buildGuestExpirationReminderHtml(data),
    text:    buildGuestExpirationReminderText(data),
  });
}

