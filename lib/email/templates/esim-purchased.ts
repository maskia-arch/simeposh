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
}

export function buildEsimPurchasedHtml(data: EsimPurchasedData): string {
  const greeting = data.customerName
    ? `Hallo ${data.customerName},`
    : 'Hallo,';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Deine eSIM ist bereit</title>
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
      <h1>📱 Deine eSIM ist bereit!</h1>
      <p>Bestellung #${data.orderId.split('-')[0].toUpperCase()}</p>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p>vielen Dank für deinen Einkauf. Deine eSIM für <strong>${data.countryName}</strong> wurde erfolgreich aktiviert und ist jetzt einsatzbereit.</p>

      <div class="section">
        <h2>📦 Tarifdetails</h2>
        <div class="info-grid">
          <div class="info-item">
            <div class="label">Tarif</div>
            <div class="value">${data.tariffName}</div>
          </div>
          <div class="info-item">
            <div class="label">Datenvolumen</div>
            <div class="value">${data.dataGb} GB</div>
          </div>
          <div class="info-item">
            <div class="label">Gültigkeit</div>
            <div class="value">${data.validityDays} Tage</div>
          </div>
          <div class="info-item">
            <div class="label">Bezahlt</div>
            <div class="value">${data.priceEur.toFixed(2)} €</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>📷 QR-Code Installation (empfohlen)</h2>
        <div class="qr-box">
          <img src="${data.qrCodeUrl}" alt="eSIM QR-Code" />
          <p>Scanne diesen QR-Code in den Einstellungen deines Smartphones<br/>(Einstellungen → Mobilfunk → eSIM hinzufügen)</p>
        </div>
      </div>

      <div class="section">
        <h2>⌨️ Manuelle Aktivierung (Alternative)</h2>
        <p style="font-size:13px;color:#6b7280;margin:0 0 8px">Falls der QR-Code nicht funktioniert, kannst du die eSIM manuell hinzufügen:</p>
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
        <h2>📖 Installationsanleitung</h2>
        <div class="steps">
          <div class="step">
            <div class="step-num">1</div>
            <div class="step-text"><strong>iPhone:</strong> Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code verwenden</div>
          </div>
          <div class="step">
            <div class="step-num">2</div>
            <div class="step-text"><strong>Android:</strong> Einstellungen → Netzwerk → SIM-Karten → eSIM hinzufügen → QR-Code scannen</div>
          </div>
          <div class="step">
            <div class="step-num">3</div>
            <div class="step-text">Wähle die neue eSIM für Mobilfunkdaten aus und aktiviere „Datenroaming".</div>
          </div>
          <div class="step">
            <div class="step-num">4</div>
            <div class="step-text">Die Gültigkeitsdauer beginnt mit der ersten Datennutzung.</div>
          </div>
        </div>
      </div>

    </div>
    <div class="footer">
      <p>Fragen? Schreib uns: <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim. Alle Rechte vorbehalten.</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildEsimPurchasedText(data: EsimPurchasedData): string {
  return `Deine eSIM ist bereit!
Bestellung: ${data.orderId}

Tarif: ${data.tariffName}
Land: ${data.countryName}
Daten: ${data.dataGb} GB | Gültigkeit: ${data.validityDays} Tage
Preis: ${data.priceEur.toFixed(2)} €

--- AKTIVIERUNGSDATEN ---
ICCID:           ${data.iccid}
SM-DP+ Adresse:  ${data.smdpAddress}
Aktivierungscode: ${data.activationCode}
APN:             ${data.apn}
LPA-String:      ${data.lpaCode}

QR-Code: ${data.qrCodeUrl}

Anleitung:
1. iPhone: Einstellungen → Mobilfunk → eSIM hinzufügen → QR-Code verwenden
2. Android: Einstellungen → Netzwerk → SIM-Karten → eSIM hinzufügen → QR-Code scannen
3. Datenroaming aktivieren
4. Gültigkeit beginnt mit der ersten Datennutzung.
`;
}
