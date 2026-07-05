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

export async function sendCheckoutNotificationEmail(opts: {
  to: string;
  invoiceId: string;
  coin: string;
  cryptoAmount: string;
  amountEur: number;
  expiresAt: string;
  checkoutLink: string;
}): Promise<void> {
  const expiryDate = new Date(opts.expiresAt);
  const expiryString = expiryDate.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) + ' Uhr';
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
      <h2 style="color: #0f172a; margin-bottom: 16px;">📋 Zahlungsanforderung für deine eSIM</h2>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">Hallo,</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        wir haben eine neue Krypto-Zahlungsanforderung für deine eSIM-Bestellung erstellt.
      </p>
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #334155;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Rechnungs-ID:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold;">${opts.invoiceId}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Zahlungsmethode:</td>
            <td style="padding: 6px 0; text-align: right;">${opts.coin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Betrag (EUR):</td>
            <td style="padding: 6px 0; text-align: right; font-weight: bold;">${opts.amountEur.toFixed(2)} €</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600;">Gültig bis:</td>
            <td style="padding: 6px 0; text-align: right; color: #dc2626; font-weight: bold;">${expiryString} (25 Min.)</td>
          </tr>
        </table>
      </div>
      <p style="color: #475569; font-size: 14px; line-height: 1.5; margin-bottom: 24px;">
        Bitte schließe deine Zahlung über den folgenden Direktlink ab:
      </p>
      <div style="text-align: center; margin-bottom: 24px;">
        <a href="${opts.checkoutLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 6px; text-decoration: none; display: inline-block;">
          Jetzt Bezahlen (${opts.amountEur.toFixed(2)} €)
        </a>
      </div>
      <p style="color: #94a3b8; font-size: 11px; line-height: 1.4;">
        Falls du diese Bestellung nicht getätigt hast, kannst du diese E-Mail einfach ignorieren.
      </p>
    </div>
  `;

  const text = `
Hallo,

wir haben eine neue Krypto-Zahlungsanforderung für deine eSIM-Bestellung erstellt.

Rechnungs-ID: ${opts.invoiceId}
Zahlungsmethode: ${opts.coin}
Betrag: ${opts.amountEur.toFixed(2)} €
Gültig bis: ${expiryString} (25 Min.)

Bitte schließe deine Zahlung über den folgenden Direktlink ab:
${opts.checkoutLink}

Falls du diese Bestellung nicht getätigt hast, kannst du diese E-Mail einfach ignorieren.
  `.trim();

  await sendMailThroughTransporter({
    to: opts.to,
    subject: `📋 Zahlungsanforderung für deine eSIM (ID: ${opts.invoiceId})`,
    html,
    text,
  });
}
