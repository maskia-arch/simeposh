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
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
  });
}

function fromAddress(): string {
  const name    = process.env.SMTP_FROM_NAME    ?? 'PureSim';
  const address = process.env.SMTP_FROM_ADDRESS ?? process.env.SMTP_USER ?? '';
  return `"${name}" <${address}>`;
}

// ─── Send eSIM purchase confirmation ─────────────────────────

export async function sendEsimEmail(data: EsimPurchasedData): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `📱 Deine eSIM für ${data.countryName} ist bereit`,
    html:    buildEsimPurchasedHtml(data),
    text:    buildEsimPurchasedText(data),
  });

  console.log(`[mailer] eSIM confirmation sent to ${data.to}`);
}

// ─── Send Top-Up confirmation ─────────────────────────────────

export async function sendTopUpEmail(data: TopUpConfirmedData & { to: string }): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `✅ Top-Up erfolgreich – ${data.dataGb} GB aufgeladen`,
    html:    buildTopUpHtml(data),
    text:    buildTopUpText(data),
  });

  console.log(`[mailer] Top-up confirmation sent to ${data.to}`);
}

// ─── Send eSIM Cash Earned notification ───────────────────────

export async function sendCashbackEarnedEmail(data: CashbackEarnedData): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `💰 eSIM Cash erhalten! +${data.earnedEur.toFixed(2)} € gutgeschrieben`,
    html:    buildCashbackEarnedHtml(data),
    text:    buildCashbackEarnedText(data),
  });

  console.log(`[mailer] Cashback earned email sent to ${data.to}`);
}

// ─── Send Guest Milestone notification ────────────────────────

export async function sendGuestMilestoneEmail(data: GuestMilestoneData): Promise<void> {
  const transporter = createTransporter();

  await transporter.sendMail({
    from:    fromAddress(),
    to:      data.to,
    subject: `🎁 Schon ${data.balanceEur.toFixed(2)} € eSIM Cash warten auf dich!`,
    html:    buildGuestMilestoneHtml(data),
    text:    buildGuestMilestoneText(data),
  });

  console.log(`[mailer] Guest milestone reminder sent to ${data.to}`);
}

export async function sendGenericEmail(opts: { to: string; subject: string; html: string; text?: string }): Promise<void> {
  const transporter = createTransporter();
  await transporter.sendMail({
    from:    fromAddress(),
    to:      opts.to,
    subject: opts.subject,
    html:    opts.html,
    text:    opts.text,
  });
  console.log(`[mailer] Generic email sent to ${opts.to} | Subject: ${opts.subject}`);
}
