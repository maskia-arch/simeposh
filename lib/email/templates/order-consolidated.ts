import { getEmailTranslations, normalizeEmailLocale } from '../i18n';
import { formatGb, formatEur } from '../../utils';
import { generateFeedbackToken } from '../../feedback/token';

export interface ConsolidatedOrderItem {
  orderId: string;
  type: 'new_esim' | 'top_up';
  countryName: string;
  tariffName: string;
  dataGb: number;
  validityDays: number;
  priceEur: number;
  iccid: string;
  // new_esim fields
  qrCodeUrl?: string | null;
  activationCode?: string | null;
  smdpAddress?: string | null;
  apn?: string | null;
  lpaCode?: string | null;
  overviewUrl?: string | null;
  // top_up fields
  topUpIccid?: string | null;
}

export interface ConsolidatedOrderData {
  to: string;
  customerName?: string;
  orderRef: string;
  totalPaidEur: number;
  items: ConsolidatedOrderItem[];
  locale?: string;
  isLatePayment?: boolean;
}

export function buildConsolidatedOrderHtml(data: ConsolidatedOrderData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isDe = normLoc === 'de';
  const t = getEmailTranslations(normLoc);

  const greeting = t.greeting(data.customerName);
  const shortOrderId = (data.orderRef || data.items[0]?.orderId || 'ORDER').split('-')[0].toUpperCase();

  const newEsims = data.items.filter((i) => i.type === 'new_esim');
  const topUps = data.items.filter((i) => i.type === 'top_up');
  const isAllTopUp = data.items.length > 0 && newEsims.length === 0;
  const isMixed = newEsims.length > 0 && topUps.length > 0;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net').replace(/\/$/, '');
  const logoUrl = `${appUrl}/logo.png`;

  // Dynamic Header Title
  let headerTitle = isDe ? 'Deine eSIM ist bereit' : 'Your eSIM is ready';
  let headerSub = isDe ? `Bestellung #${shortOrderId}` : `Order #${shortOrderId}`;

  if (isAllTopUp) {
    headerTitle = isDe ? '✅ Top-Up erfolgreich!' : '✅ Top-Up Successful!';
    headerSub = isDe ? 'Deine eSIM wurde aufgeladen' : 'Your eSIM has been recharged';
  } else if (isMixed) {
    headerTitle = isDe ? '✨ Deine Bestellung ist bereit' : '✨ Your Order is Ready';
    headerSub = isDe ? `${newEsims.length} neue eSIM(s) & ${topUps.length} Aufladung(en)` : `${newEsims.length} new eSIM(s) & ${topUps.length} recharge(s)`;
  } else if (newEsims.length > 1) {
    headerTitle = isDe ? `📱 Deine ${newEsims.length} eSIMs sind bereit` : `📱 Your ${newEsims.length} eSIMs are ready`;
  }

  // Generate Review URL using first order id
  const primaryOrderId = data.items[0]?.orderId || data.orderRef;
  const reviewToken = generateFeedbackToken(primaryOrderId, data.to);
  const reviewUrl = `${appUrl}/reviews/new?orderId=${encodeURIComponent(primaryOrderId)}&token=${encodeURIComponent(reviewToken)}`;

  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${headerTitle}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; -webkit-font-smoothing:antialiased; }
    .wrapper { max-width:620px; margin:36px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 30px rgba(0,0,0,0.06); }
    .header { background:linear-gradient(135deg,#059669,#10b981); padding:36px 32px; text-align:center; }
    .header.mixed { background:linear-gradient(135deg,#1e40af,#3b82f6); }
    .header h1 { margin:0; color:#ffffff; font-size:24px; font-weight:800; letter-spacing:-0.4px; }
    .header p { margin:6px 0 0; color:#a7f3d0; font-size:13px; font-weight:500; }
    .header.mixed p { color:#bfdbfe; }
    .body { padding:32px 28px; }
    .badge-bar { display:flex; justify-content:space-between; align-items:center; background:#f8faff; border-radius:10px; padding:12px 16px; margin:20px 0 24px; border:1px solid #e2e8f0; font-size:12px; }
    .item-card { border:1px solid #e2e8f0; border-radius:14px; padding:20px; margin-bottom:24px; background:#ffffff; box-shadow:0 2px 10px rgba(0,0,0,0.02); }
    .item-card.topup { border-color:#a7f3d0; background:#fafffd; }
    .item-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:14px; padding-bottom:10px; border-bottom:1px solid #f1f5f9; }
    .item-title { font-size:16px; font-weight:800; color:#0f172a; margin:0; }
    .item-tag { font-size:11px; font-weight:700; padding:3px 8px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; }
    .item-tag.new { background:#eff6ff; color:#1d4ed8; }
    .item-tag.topup { background:#ecfdf5; color:#047857; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:16px; }
    .info-box { background:#f8fafc; border-radius:8px; padding:10px 12px; }
    .info-box .lbl { font-size:10px; color:#64748b; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:2px; }
    .info-box .val { font-size:13px; font-weight:700; color:#0f172a; }
    .qr-box { text-align:center; background:#f0f7ff; border-radius:12px; padding:20px; margin:16px 0; border:1px solid #dbeafe; }
    .qr-box img { width:170px; height:170px; border-radius:8px; display:inline-block; }
    .code-box { background:#0f172a; border-radius:8px; padding:12px 14px; font-family:monospace; font-size:12px; color:#f8fafc; word-break:break-all; margin:6px 0 12px; }
    .guide-box { background:#f8fafc; border-radius:10px; padding:14px; font-size:12px; color:#334155; line-height:1.5; margin-top:14px; border:1px solid #e2e8f0; }
    .topup-notice { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px; font-size:12px; color:#166534; line-height:1.5; margin-top:10px; }
    .cta-btn { display:inline-block; background:#059669; color:#ffffff; font-size:13px; font-weight:700; text-decoration:none; padding:12px 24px; border-radius:10px; margin-top:16px; text-align:center; }
    .footer { background:#f8fafc; border-top:1px solid #e2e8f0; padding:24px 28px; text-align:center; font-size:12px; color:#94a3b8; }
    .footer a { color:#059669; text-decoration:none; font-weight:600; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header ${isMixed || !isAllTopUp ? 'mixed' : ''}">
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 10px;">
        <tr>
          <td align="center" style="vertical-align:middle; padding-right:8px;">
            <img src="${logoUrl}" width="40" height="40" alt="PureSim" style="display:block; width:40px; height:40px; object-fit:contain; border:0;" />
          </td>
          <td align="center" style="vertical-align:middle;">
            <span style="font-size:22px; font-weight:800; font-family:'Helvetica Neue',Arial,sans-serif; color:#ffffff;">
              PureSim
            </span>
          </td>
        </tr>
      </table>
      <h1>${headerTitle}</h1>
      <p>${headerSub}</p>
    </div>

    <!-- Body -->
    <div class="body">
      <p style="font-size:15px; font-weight:600; color:#0f172a; margin-top:0;">${greeting}</p>
      <p style="font-size:13px; color:#475569; line-height:1.6;">
        ${
          isAllTopUp
            ? (isDe ? 'dein Top-Up-Paket wurde erfolgreich aktiviert und deiner eSIM gutgeschrieben.' : 'your top-up package was successfully activated and credited to your eSIM.')
            : isMixed
              ? (isDe ? 'vielen Dank für deinen Einkauf! Deine neuen eSIMs sind bereit zur Installation und deine bestehenden eSIMs wurden aufgeladen.' : 'thank you for your purchase! Your new eSIMs are ready to install and your existing eSIMs have been recharged.')
              : (isDe ? 'vielen Dank für deinen Einkauf! Hier sind deine eSIM-Aktivierungsdaten für eine schnelle und unkomplizierte Einrichtung vor deiner Abreise.' : 'thank you for your purchase! Here are your eSIM activation details for a quick and easy setup before your trip.')
        }
      </p>

      <!-- Order Info Bar -->
      <div class="badge-bar">
        <div>
          <span style="color:#64748b; font-weight:600;">${isDe ? 'Bestellung:' : 'Order:'}</span>
          <strong style="color:#0f172a; margin-left:4px;">#${shortOrderId}</strong>
        </div>
        <div>
          <span style="color:#64748b; font-weight:600;">${isDe ? 'Positionen:' : 'Items:'}</span>
          <strong style="color:#0f172a; margin-left:4px;">${data.items.length}</strong>
        </div>
        <div>
          <span style="color:#64748b; font-weight:600;">${isDe ? 'Gesamt:' : 'Total:'}</span>
          <strong style="color:#059669; margin-left:4px;">${formatEur(data.totalPaidEur)}</strong>
        </div>
      </div>

      <!-- Items Loop -->
      ${data.items
        .map((item, idx) => {
          const isTopUp = item.type === 'top_up';
          const volStr = formatGb(item.dataGb);
          const daysStr = `${item.validityDays} ${isDe ? 'Tage' : 'Days'}`;

          if (isTopUp) {
            return `
            <div class="item-card topup">
              <div class="item-header">
                <div>
                  <h3 class="item-title">🔄 #${idx + 1} ${item.tariffName}</h3>
                  <span style="font-size:12px; color:#64748b;">${item.countryName}</span>
                </div>
                <span class="item-tag topup">${isDe ? 'Top-Up / Refill' : 'Top-Up / Refill'}</span>
              </div>

              <div class="info-grid">
                <div class="info-box">
                  <div class="lbl">${isDe ? 'Datenvolumen' : 'Data'}</div>
                  <div class="val">${volStr}</div>
                </div>
                <div class="info-box">
                  <div class="lbl">${isDe ? 'Gültigkeit' : 'Validity'}</div>
                  <div class="val">${daysStr}</div>
                </div>
                <div class="info-box" style="grid-column: span 2;">
                  <div class="lbl">${isDe ? 'Aufgeladene eSIM (ICCID)' : 'Recharged eSIM (ICCID)'}</div>
                  <div class="val" style="font-family:monospace; font-size:12px; color:#047857;">${item.topUpIccid || item.iccid}</div>
                </div>
              </div>

              <div class="topup-notice">
                <strong>✅ ${isDe ? 'Bereits aktiv' : 'Already active'}:</strong>
                ${isDe ? 'Das Datenpaket wurde deiner vorhandenen eSIM automatisch gutgeschrieben. Du musst keinen neuen QR-Code scannen!' : 'The data package was automatically added to your existing eSIM. No need to scan a new QR code!'}
              </div>
            </div>`;
          }

          // New eSIM Item
          return `
          <div class="item-card">
            <div class="item-header">
              <div>
                <h3 class="item-title">📱 #${idx + 1} ${item.tariffName}</h3>
                <span style="font-size:12px; color:#64748b;">${item.countryName}</span>
              </div>
              <span class="item-tag new">${isDe ? 'Neue eSIM' : 'New eSIM'}</span>
            </div>

            <div class="info-grid">
              <div class="info-box">
                <div class="lbl">${isDe ? 'Datenvolumen' : 'Data'}</div>
                <div class="val">${volStr}</div>
              </div>
              <div class="info-box">
                <div class="lbl">${isDe ? 'Gültigkeit' : 'Validity'}</div>
                <div class="val">${daysStr}</div>
              </div>
              <div class="info-box" style="grid-column: span 2;">
                <div class="lbl">ICCID</div>
                <div class="val" style="font-family:monospace; font-size:12px;">${item.iccid}</div>
              </div>
            </div>

            ${
              item.qrCodeUrl
                ? `
            <div class="qr-box">
              <img src="${item.qrCodeUrl}" alt="QR Code #${idx + 1}" />
              <p style="margin:8px 0 0; font-size:11px; color:#64748b; font-weight:600;">
                ${isDe ? 'Scanne diesen QR-Code in deinen Smartphone-Einstellungen' : 'Scan this QR code in your phone settings'}
              </p>
            </div>`
                : ''
            }

            ${
              item.smdpAddress && item.activationCode
                ? `
            <div style="margin-top:12px;">
              <div style="font-size:11px; font-weight:700; color:#475569; margin-bottom:4px;">${isDe ? 'Manuelle Aktivierungscodes:' : 'Manual activation codes:'}</div>
              <div class="code-box">
                <div><strong>SM-DP+:</strong> ${item.smdpAddress}</div>
                <div style="margin-top:4px;"><strong>Code:</strong> ${item.activationCode}</div>
                ${item.apn ? `<div style="margin-top:4px;"><strong>APN:</strong> ${item.apn}</div>` : ''}
              </div>
            </div>`
                : ''
            }

            <div class="guide-box">
              <strong>${isDe ? 'Installation:' : 'Installation:'}</strong><br/>
              • <strong>iPhone:</strong> ${isDe ? 'Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code scannen' : 'Settings → Cellular → Add eSIM → Scan QR code'}<br/>
              • <strong>Android:</strong> ${isDe ? 'Einstellungen → Netzwerk → SIM-Karten → eSIM hinzufügen' : 'Settings → Network → SIM cards → Add eSIM'}<br/>
              • <strong>Roaming:</strong> ${isDe ? 'Vor Ort Roaming für diese eSIM aktivieren.' : 'Enable Data Roaming for this eSIM at your destination.'}
            </div>
          </div>`;
        })
        .join('')}

      <!-- Trustpilot / Review Invitation Link -->
      <div style="background:#f8fafc; border-radius:12px; padding:18px; text-align:center; margin-top:20px; border:1px solid #e2e8f0;">
        <p style="font-size:13px; font-weight:700; color:#0f172a; margin:0 0 6px;">
          ${isDe ? 'Wie war dein Buchungserlebnis?' : 'How was your booking experience?'}
        </p>
        <p style="font-size:12px; color:#64748b; margin:0 0 12px;">
          ${isDe ? 'Teile dein ehrliches Feedback mit unserer Community.' : 'Share your honest feedback with our community.'}
        </p>
        <a href="${reviewUrl}" style="display:inline-block; background:#0f172a; color:#ffffff; font-size:12px; font-weight:700; text-decoration:none; padding:8px 18px; border-radius:8px;">
          ★ ${isDe ? 'Feedback abgeben' : 'Leave feedback'}
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin:0 0 6px;">${isDe ? 'Fragen oder Unterstützung benötigt?' : 'Questions or need help?'}</p>
      <p style="margin:0;"><a href="${appUrl}/dashboard?tab=tickets" target="_blank">${isDe ? 'Support-Ticket öffnen' : 'Open Support Ticket'}</a> · <a href="${appUrl}/dashboard">${isDe ? 'Mein Bereich' : 'Dashboard'}</a></p>
      <p style="margin:12px 0 0; color:#cbd5e1; font-size:11px;">© 2026 PureSim · All rights reserved</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildConsolidatedOrderText(data: ConsolidatedOrderData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isDe = normLoc === 'de';
  const shortOrderId = (data.orderRef || data.items[0]?.orderId || 'ORDER').split('-')[0].toUpperCase();

  let text = `PureSim - ${isDe ? 'Bestellbestätigung' : 'Order Confirmation'} #${shortOrderId}\n\n`;
  text += `${isDe ? 'Hallo' : 'Hello'} ${data.customerName || ''},\n\n`;
  text += `${isDe ? 'vielen Dank für deinen Einkauf bei PureSim.' : 'thank you for your purchase with PureSim.'}\n\n`;
  text += `----------------------------------------\n`;

  data.items.forEach((item, idx) => {
    const isTopUp = item.type === 'top_up';
    text += `#${idx + 1} ${item.tariffName} (${item.countryName})\n`;
    text += `Type: ${isTopUp ? 'Top-Up (Refill)' : 'New eSIM'}\n`;
    text += `Data: ${formatGb(item.dataGb)} | Validity: ${item.validityDays} ${isDe ? 'Tage' : 'Days'}\n`;
    text += `ICCID: ${isTopUp ? item.topUpIccid || item.iccid : item.iccid}\n`;
    if (!isTopUp && item.smdpAddress) {
      text += `SM-DP+: ${item.smdpAddress}\nActivation Code: ${item.activationCode}\n`;
    }
    text += `\n`;
  });

  text += `Total: ${formatEur(data.totalPaidEur)}\n\n`;
  text += `Support: https://puresim.net/dashboard?tab=tickets\n`;
  return text;
}
