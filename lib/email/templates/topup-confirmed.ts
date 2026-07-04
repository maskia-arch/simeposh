export interface TopUpConfirmedData {
  customerName?: string;
  iccid:         string;
  tariffName:    string;
  dataGb:        number;
  validityDays:  number;
  priceEur:      number;
  orderId:       string;
}

export function buildTopUpHtml(data: TopUpConfirmedData): string {
  const greeting = data.customerName ? `Hallo ${data.customerName},` : 'Hallo,';

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Top-Up erfolgreich</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#059669,#10b981); padding:40px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:26px; font-weight:700; }
    .header p { margin:8px 0 0; color:#a7f3d0; font-size:14px; }
    .body { padding:32px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
    .info-item { background:#f0fdf4; border-radius:8px; padding:12px 14px; }
    .info-item .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .info-item .value { font-size:15px; font-weight:600; color:#111827; }
    .footer { background:#f8faff; border-top:1px solid #e5e7eb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#059669; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>✅ Top-Up erfolgreich!</h1>
      <p>Bestellung #${data.orderId.split('-')[0].toUpperCase()}</p>
    </div>
    <div class="body">
      <p>${greeting}</p>
      <p>dein eSIM-Datenpaket wurde erfolgreich aufgeladen. Die zusätzlichen Daten sind sofort verfügbar.</p>
      <div class="info-grid">
        <div class="info-item">
          <div class="label">ICCID</div>
          <div class="value" style="font-family:monospace;font-size:12px">${data.iccid}</div>
        </div>
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
      <p style="font-size:13px;color:#6b7280;">Du musst nichts weiter tun – die Daten wurden automatisch deiner eSIM gutgeschrieben.</p>
    </div>
    <div class="footer">
      <p>Fragen? <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildTopUpText(data: TopUpConfirmedData): string {
  return `Top-Up erfolgreich!
Bestellung: ${data.orderId}

ICCID: ${data.iccid}
Tarif: ${data.tariffName}
Daten: ${data.dataGb} GB | Gültigkeit: ${data.validityDays} Tage
Preis: ${data.priceEur.toFixed(2)} €

Die Daten wurden deiner eSIM automatisch gutgeschrieben.
`;
}
