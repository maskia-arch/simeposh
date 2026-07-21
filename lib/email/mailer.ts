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
  type CashbackEarnedData,
  type GuestMilestoneData,
} from './templates/cashback-notifications';

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

async function sendMailThroughTransporter(mailOptions: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const host = process.env.SMTP_HOST;
  const pass = process.env.SMTP_PASS;
  const cleanTo = mailOptions.to.trim();

  if (!cleanTo || !cleanTo.includes('@')) {
    console.error('[mailer] Cannot send email: invalid or empty recipient address:', mailOptions.to);
    return;
  }

  const domain = (process.env.SMTP_FROM_ADDRESS?.split('@')[1] || 'puresim.com').toLowerCase();
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

  // Use Resend HTTP REST API if using Resend (avoids firewall port blocks)
  const isResend = host?.includes('resend.com') || pass?.startsWith('re_');

  if (isResend && pass) {
    try {
      console.log('[mailer] Dispatching High Priority email via Resend HTTP API to:', cleanTo);
      const fromName = process.env.SMTP_FROM_NAME ?? 'PureSim';
      const fromAddr = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER ?? 'noreply@puresim.com';
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
      return;
    } catch (err) {
      console.error('[mailer] Resend HTTP API dispatch failed. Falling back to SMTP:', err);
    }
  }

  // Fallback to Nodemailer SMTP
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
  } catch (smtpErr) {
    console.error('[mailer] SMTP dispatch failed for recipient:', cleanTo, smtpErr);
    throw smtpErr;
  }
}

// ─── Send eSIM purchase confirmation ─────────────────────────

export async function sendEsimEmail(data: EsimPurchasedData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:      data.to,
    subject: t.esimSubject(data.countryName),
    html:    buildEsimPurchasedHtml(data),
    text:    buildEsimPurchasedText(data),
  });
}

// ─── Send Top-Up confirmation ─────────────────────────────────

export async function sendTopUpEmail(data: TopUpConfirmedData & { to: string }): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:      data.to,
    subject: t.topUpSubject(data.dataGb),
    html:    buildTopUpHtml(data),
    text:    buildTopUpText(data),
  });
}

// ─── Send eSIM Cash Earned notification ───────────────────────

export async function sendCashbackEarnedEmail(data: CashbackEarnedData): Promise<void> {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  await sendMailThroughTransporter({
    to:      data.to,
    subject: t.cashbackEarnedSubject(data.earnedEur.toFixed(2)),
    html:    buildCashbackEarnedHtml(data),
    text:    buildCashbackEarnedText(data),
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

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <div style="text-align: center; margin-bottom: 20px;">
        <img src="https://puresim.com/icon.png" width="52" height="52" alt="PureSim" style="display: block; margin: 0 auto 12px; border-radius: 12px; box-shadow: 0 4px 14px rgba(0,0,0,0.15);" />
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
            <td style="padding: 6px 0; text-align: right; font-weight: bold;">${opts.amountEur.toFixed(2)} €</td>
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
          ${t.checkoutCta(opts.amountEur.toFixed(2))}
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
${t.amountLabel} ${opts.amountEur.toFixed(2)} €
${t.validUntilLabel} ${expiryDisplay}

${t.checkoutInstruction}
${opts.checkoutLink}

${t.checkoutIgnoreText}
  `.trim();

  await sendMailThroughTransporter({
    to: opts.to,
    subject: t.checkoutSubject(opts.invoiceId),
    html,
    text,
  });
}
