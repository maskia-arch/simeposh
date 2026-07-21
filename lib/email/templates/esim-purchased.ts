import { getEmailTranslations, normalizeEmailLocale } from '../i18n';

export interface EsimPurchasedData {
  to:              string;   // recipient email address
  customerName?:   string;
  tariffName:      string;
  countryName:     string;
  dataGb:          number;
  validityDays:    number;
  priceEur:        number;
  iccid:           string;
  qrCodeUrl:       string;
  activationCode:  string;
  smdpAddress:     string;
  apn:             string;
  lpaCode:         string;
  orderId:         string;
  overviewUrl?:    string;
  locale?:         string;
}

export function buildEsimPurchasedHtml(data: EsimPurchasedData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);
  const greeting = t.greeting(data.customerName);
  const shortOrderId = data.orderId.split('-')[0].toUpperCase();

  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${t.esimTitle}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#1d4ed8,#3b82f6); padding:40px 32px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:26px; font-weight:700; letter-spacing:-0.3px; }
    .header p { margin:8px 0 0; color:#bfdbfe; font-size:14px; }
    .body { padding:32px; }
    .section { margin-bottom:28px; }
    .section h2 { font-size:16px; font-weight:600; color:#1e40af; margin:0 0 12px; border-bottom:2px solid #e0ecff; padding-bottom:6px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
    .info-item { background:#f8faff; border-radius:8px; padding:12px 14px; }
    .info-item .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .info-item .value { font-size:15px; font-weight:600; color:#111827; }
    .qr-box { text-align:center; background:#f0f4ff; border-radius:10px; padding:24px; margin:20px 0; }
    .qr-box img { width:180px; height:180px; border-radius:8px; }
    .qr-box p { margin:12px 0 0; font-size:13px; color:#4b5563; }
    .code-box { background:#1e293b; border-radius:8px; padding:16px 20px; font-family:'Courier New',monospace; font-size:13px; color:#e2e8f0; word-break:break-all; margin:8px 0; }
    .steps { counter-reset:steps; }
    .step { display:flex; gap:14px; margin-bottom:14px; }
    .step-num { background:#2563eb; color:#fff; width:26px; height:26px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; flex-shrink:0; margin-top:2px; }
    .step-text { font-size:14px; color:#374151; line-height:1.6; }
    .footer { background:#f8faff; border-top:1px solid #e5e7eb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#2563eb; text-decoration:none; }
    .badge { display:inline-block; background:#dcfce7; color:#166534; font-size:11px; font-weight:600; padding:3px 10px; border-radius:20px; margin-bottom:16px; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>${t.esimTitle}</h1>
      <p>${t.esimOrderBadge(shortOrderId)}</p>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p>${t.esimThankYou(data.countryName)}</p>

      ${data.overviewUrl ? `
      <div style="text-align: center; margin: 24px 0 32px;">
        <a href="${data.overviewUrl}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; font-size: 14px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(37,99,235,0.15);">
          ${t.esimInstallBtn}
        </a>
        <p style="margin: 8px 0 0; font-size: 11px; color: #6b7280;">${t.esimInstallSub}</p>
      </div>
      ` : ''}

      <div class="section">
        <h2>${t.esimPlanDetails}</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">${t.esimTariffLabel}</div>
            <div class="value">${data.tariffName}</div>
          </div>
          <div class="info-item">
            <div class="label">${t.esimDataLabel}</div>
            <div class="value">${data.dataGb} GB</div>
          </div>
          <div class="info-item">
            <div class="label">${t.esimValidityLabel}</div>
            <div class="value">${t.esimDays(data.validityDays)}</div>
          </div>
          <div class="info-item">
            <div class="label">${t.esimPaidLabel}</div>
            <div class="value">${data.priceEur.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>${t.esimQrTitle}</h2>
        <div class="qr-box">
          <img src="${data.qrCodeUrl}" alt="eSIM QR-Code" />
          <p>${t.esimQrSub}</p>
        </div>
      </div>

      <div class="section">
        <h2>${t.esimManualTitle}</h2>
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px">${t.esimManualSub}</p>
        <div class="info-item" style="margin-bottom:8px">
          <div class="label">ICCID</div>
          <div class="value" style="font-family:monospace">${data.iccid}</div>
        </div>
        <div class="info-item" style="margin-bottom:8px">
          <div class="label">SM-DP+ Adresse</div>
          <div class="value" style="font-family:monospace;font-size:13px">${data.smdpAddress}</div>
        </div>
        <div class="info-item" style="margin-bottom:8px">
          <div class="label">Aktivierungscode</div>
          <div class="value" style="font-family:monospace">${data.activationCode}</div>
        </div>
        ${data.apn ? `<div class="info-item">
          <div class="label">APN</div>
          <div class="value" style="font-family:monospace">${data.apn}</div>
        </div>` : ''}
        <p style="font-size:12px;color:#9ca3af;margin-top:8px">LPA-String: <span style="font-family:monospace">${data.lpaCode}</span></p>
      </div>

      <div class="section">
        <h2>${t.esimStepsTitle}</h2>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text">${t.esimStep1}</div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text">${t.esimStep2}</div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">${t.esimStep3}</div>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <div class="step-text">${t.esimStep4}</div>
          </div>
        </div>
      </div>

    </div>
    <div class="footer">
      <p>${t.esimFooterQuestions} <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim. ${t.esimFooterRights}</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildEsimPurchasedText(data: EsimPurchasedData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  return `${t.esimTitle}
${t.esimOrderBadge(data.orderId)}

${t.esimTariffLabel}: ${data.tariffName}
${t.esimDataLabel}: ${data.dataGb} GB | ${t.esimValidityLabel}: ${t.esimDays(data.validityDays)}
${t.esimPaidLabel}: ${data.priceEur.toFixed(2)} €

${data.overviewUrl ? `${t.esimInstallBtn}:
${data.overviewUrl}

` : ''}--- ${t.esimManualTitle} ---
ICCID:           ${data.iccid}
SM-DP+ Address:  ${data.smdpAddress}
Matching ID:     ${data.activationCode}
APN:             ${data.apn}
LPA-String:      ${data.lpaCode}

QR-Code: ${data.qrCodeUrl}

${t.esimStepsTitle}:
1. ${t.esimStep1.replace(/<[^>]+>/g, '')}
2. ${t.esimStep2.replace(/<[^>]+>/g, '')}
3. ${t.esimStep3}
4. ${t.esimStep4}
`;
}
