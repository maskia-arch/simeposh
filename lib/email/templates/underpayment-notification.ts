/**
 * Email template for crypto underpayment / partial payment notifications.
 * Informs the customer about received amount, required amount, and missing difference.
 */

export interface UnderpaymentData {
  to: string;
  customerName?: string;
  orderId: string;
  coin: string;
  receivedAmount: string;
  expectedAmount: string;
  remainingAmount: string;
  walletAddress: string;
  paymentMemo?: string | null;
  locale?: string;
}

export function buildUnderpaymentHtml(data: UnderpaymentData): string {
  const isDe = (data.locale || 'de').toLowerCase().startsWith('de');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;
  const checkoutUrl = `${appUrl}/checkout/${data.orderId}`;
  const supportUrl = `${appUrl}/dashboard?tab=tickets`;

  const title = isDe ? 'Teilzahlung / Unterzahlung erkannt' : 'Partial / Underpayment Detected';
  const greeting = isDe
    ? `Hallo ${data.customerName || 'Kunde'},`
    : `Hello ${data.customerName || 'Customer'},`;

  const intro = isDe
    ? `wir haben deine Krypto-Zahlung für die Bestellung <strong>${data.orderId}</strong> erhalten. Es liegt jedoch eine geringfügige Unterzahlung vor.`
    : `we received your crypto payment for order <strong>${data.orderId}</strong>. However, the received amount is less than required.`;

  const detailsTitle = isDe ? 'Zahlungsdetails' : 'Payment Details';
  const labelCoin = isDe ? 'Kryptowährung' : 'Cryptocurrency';
  const labelReceived = isDe ? 'Erhaltener Betrag' : 'Received Amount';
  const labelExpected = isDe ? 'Geforderter Betrag' : 'Required Amount';
  const labelRemaining = isDe ? 'Verbleibender Differenzbetrag' : 'Remaining Difference';
  const labelAddress = isDe ? 'Ziel-Adresse' : 'Target Address';
  const labelMemo = isDe ? 'Verwendungszweck / Memo' : 'Payment Memo';

  const instructions = isDe
    ? `Bitte sende den verbleibenden Differenzbetrag von <strong>${data.remainingAmount} ${data.coin}</strong> an die obige Adresse, um deine Bestellung automatisch abzuschließen, oder wende dich an unseren Kundensupport.`
    : `Please send the remaining difference of <strong>${data.remainingAmount} ${data.coin}</strong> to the address above to complete your order automatically, or contact our support team.`;

  const ctaCheckout = isDe ? 'Zur Zahlungsseite' : 'Go to Payment Page';
  const ctaSupport = isDe ? 'Support-Ticket öffnen' : 'Open Support Ticket';

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; background: #ffffff; box-shadow: 0 4px 24px rgba(0,0,0,0.06);">
      <div style="text-align: center; margin-bottom: 24px;">
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
        <h2 style="color: #b91c1c; margin: 0 0 8px; font-size: 20px; font-weight: 800;">⚠ ${title}</h2>
      </div>

      <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-bottom: 12px;">${greeting}</p>
      <p style="color: #475569; font-size: 14px; line-height: 1.6; margin-bottom: 20px;">${intro}</p>

      <div style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; font-weight: 700; color: #991b1b;">${detailsTitle}</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">${labelCoin}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700;">${data.coin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">${labelReceived}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700; color: #0284c7;">${data.receivedAmount} ${data.coin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">${labelExpected}:</td>
            <td style="padding: 6px 0; text-align: right; font-weight: 700;">${data.expectedAmount} ${data.coin}</td>
          </tr>
          <tr style="border-top: 1px dashed #fca5a5;">
            <td style="padding: 8px 0 4px; font-weight: 700; color: #991b1b;">${labelRemaining}:</td>
            <td style="padding: 8px 0 4px; text-align: right; font-weight: 800; color: #dc2626; font-size: 14px;">${data.remainingAmount} ${data.coin}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">${labelAddress}:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-size: 11px; word-break: break-all;">${data.walletAddress}</td>
          </tr>
          ${data.paymentMemo ? `
          <tr>
            <td style="padding: 6px 0; font-weight: 600; color: #64748b;">${labelMemo}:</td>
            <td style="padding: 6px 0; text-align: right; font-family: monospace; font-weight: bold; color: #b91c1c;">${data.paymentMemo}</td>
          </tr>
          ` : ''}
        </table>
      </div>

      <p style="color: #475569; font-size: 13px; line-height: 1.6; margin-bottom: 24px;">${instructions}</p>

      <div style="text-align: center; margin-bottom: 24px; display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <a href="${checkoutUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 12px 20px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 13px;">
          ${ctaCheckout} →
        </a>
        <a href="${supportUrl}" target="_blank" style="background-color: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 12px 20px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 13px;">
          ${ctaSupport}
        </a>
      </div>

      <p style="color: #94a3b8; font-size: 11px; line-height: 1.4; text-align: center;">
        PureSim Support & Payment System
      </p>
    </div>
  `;
}

export function buildUnderpaymentText(data: UnderpaymentData): string {
  const isDe = (data.locale || 'de').toLowerCase().startsWith('de');
  if (isDe) {
    return `
Hallo ${data.customerName || 'Kunde'},

wir haben deine Krypto-Zahlung für die Bestellung ${data.orderId} erhalten. Es liegt jedoch eine geringfügige Unterzahlung vor:

- Erhaltener Betrag: ${data.receivedAmount} ${data.coin}
- Geforderter Betrag: ${data.expectedAmount} ${data.coin}
- Verbleibender Betrag: ${data.remainingAmount} ${data.coin}

Adresse: ${data.walletAddress}
${data.paymentMemo ? `Memo: ${data.paymentMemo}\n` : ''}

Bitte sende den verbleibenden Betrag von ${data.remainingAmount} ${data.coin} an die angegebene Adresse oder öffne ein Support-Ticket:
${process.env.NEXT_PUBLIC_APP_URL}/checkout/${data.orderId}
`.trim();
  }

  return `
Hello ${data.customerName || 'Customer'},

We received your crypto payment for order ${data.orderId}, but it was partially underpaid:

- Received: ${data.receivedAmount} ${data.coin}
- Required: ${data.expectedAmount} ${data.coin}
- Remaining: ${data.remainingAmount} ${data.coin}

Address: ${data.walletAddress}
${data.paymentMemo ? `Memo: ${data.paymentMemo}\n` : ''}

Please send the remaining ${data.remainingAmount} ${data.coin} or open a support ticket:
${process.env.NEXT_PUBLIC_APP_URL}/checkout/${data.orderId}
`.trim();
}
