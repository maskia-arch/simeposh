/**
 * E-Mail service using Nodemailer over SMTP.
 * All credentials loaded strictly from process.env.
 */
import nodemailer from 'nodemailer';
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

  // Use Resend HTTP REST API if using Resend (avoids firewall port blocks)
  const isResend = host?.includes('resend.com') || pass?.startsWith('re_');

  if (isResend && pass) {
    try {
      console.log('[mailer] Dispatching email via Resend HTTP API to:', mailOptions.to);
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
          to: [mailOptions.to],
          subject: mailOptions.subject,
          html: mailOptions.html,
          text: mailOptions.text || undefined,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Resend API returned status ${response.status}: ${errText}`);
      }

      console.log(`[mailer] Resend HTTP email successfully sent to ${mailOptions.to}`);
      return;
    } catch (err) {
      console.error('[mailer] Resend HTTP API dispatch failed. Falling back to SMTP:', err);
    }
  }

  // Fallback to Nodemailer SMTP
  const transporter = createTransporter();
  await transporter.sendMail({
    from:    fromAddress(),
    to:      mailOptions.to,
    subject: mailOptions.subject,
    html:    mailOptions.html,
    text:    mailOptions.text,
  });
  console.log(`[mailer] SMTP email successfully sent to ${mailOptions.to}`);
}

// ─── Send eSIM purchase confirmation ─────────────────────────

export async function sendEsimEmail(data: EsimPurchasedData): Promise<void> {
  await sendMailThroughTransporter({
    to:      data.to,
    subject: `📱 Deine eSIM für ${data.countryName} ist bereit`,
    html:    buildEsimPurchasedHtml(data),
    text:    buildEsimPurchasedText(data),
  });
}

// ─── Send Top-Up confirmation ─────────────────────────────────

export async function sendTopUpEmail(data: TopUpConfirmedData & { to: string }): Promise<void> {
  await sendMailThroughTransporter({
    to:      data.to,
    subject: `✅ Top-Up erfolgreich – ${data.dataGb} GB aufgeladen`,
    html:    buildTopUpHtml(data),
    text:    buildTopUpText(data),
  });
}

// ─── Send eSIM Cash Earned notification ───────────────────────

export async function sendCashbackEarnedEmail(data: CashbackEarnedData): Promise<void> {
  await sendMailThroughTransporter({
    to:      data.to,
    subject: `💰 eSIM Cash erhalten! +${data.earnedEur.toFixed(2)} € gutgeschrieben`,
    html:    buildCashbackEarnedHtml(data),
    text:    buildCashbackEarnedText(data),
  });
}

// ─── Send Guest Milestone notification ────────────────────────

export async function sendGuestMilestoneEmail(data: GuestMilestoneData): Promise<void> {
  await sendMailThroughTransporter({
    to:      data.to,
    subject: `🎁 Schon ${data.balanceEur.toFixed(2)} € eSIM Cash warten auf dich!`,
    html:    buildGuestMilestoneHtml(data),
    text:    buildGuestMilestoneText(data),
  });
}

export async function sendGenericEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  await sendMailThroughTransporter(opts);
}
