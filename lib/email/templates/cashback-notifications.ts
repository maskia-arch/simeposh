export interface CashbackEarnedData {
  to:            string;
  earnedEur:     number;
  newBalanceEur: number;
  rank:          string;
  orderId:       string;
}

export interface GuestMilestoneData {
  to:            string;
  balanceEur:    number;
  milestoneEur:  number;
}

export function buildCashbackEarnedHtml(data: CashbackEarnedData): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>eSIM Cash Gutschrift</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#2563eb,#3b82f6); padding:40px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:26px; font-weight:700; }
    .header p { margin:8px 0 0; color:#bfdbfe; font-size:14px; }
    .body { padding:32px; }
    .stat-card { background:#f0f7ff; border:1px solid #e0f2fe; border-radius:12px; padding:20px; text-align:center; margin-bottom:24px; }
    .stat-val { font-size:32px; font-weight:800; color:#2563eb; margin:4px 0; }
    .stat-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
    .info-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:24px; }
    .info-item { background:#f8fafc; border-radius:8px; padding:12px 14px; border:1px solid #f1f5f9; }
    .info-item .label { font-size:11px; color:#6b7280; text-transform:uppercase; letter-spacing:.5px; margin-bottom:4px; }
    .info-item .value { font-size:14px; font-weight:600; color:#111827; }
    .footer { background:#f8faff; border-top:1px solid #e5e7eb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#2563eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>💰 eSIM Cash gutgeschrieben!</h1>
      <p>Bestellung #${data.orderId.split('-')[0].toUpperCase()}</p>
    </div>
    <div class="body">
      <p>Hallo,</p>
      <p>vielen Dank für deinen Einkauf! Wir haben dir soeben neues <strong>eSIM Cash</strong> auf deinem Konto gutgeschrieben.</p>
      
      <div class="stat-card">
        <div class="stat-label">Erhaltenes Guthaben</div>
        <div class="stat-val">+${data.earnedEur.toFixed(2)} €</div>
        <div class="stat-label" style="margin-top:4px;">Umsatz-Cashback</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="label">Neues Gesamtguthaben</div>
          <div class="value">${data.newBalanceEur.toFixed(2)} €</div>
        </div>
        <div class="info-item">
          <div class="label">Aktueller Rang</div>
          <div class="value">${data.rank}</div>
        </div>
      </div>
      
      <p style="font-size:13px;color:#6b7280;line-height:1.5;">Dein Guthaben kannst du ganz bequem bei deinem nächsten Einkauf im Warenkorb als Sofort-Rabatt einlösen.</p>
    </div>
    <div class="footer">
      <p>Fragen? <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} eSIM Shop</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildCashbackEarnedText(data: CashbackEarnedData): string {
  return `eSIM Cash Gutschrift!
Bestellung: ${data.orderId}

Erhaltenes Guthaben: +${data.earnedEur.toFixed(2)} €
Neues Gesamtguthaben: ${data.newBalanceEur.toFixed(2)} €
Aktueller Rang: ${data.rank}

Du kannst dieses Guthaben bei deinem nächsten Einkauf im Warenkorb einlösen.
`;
}

export function buildGuestMilestoneHtml(data: GuestMilestoneData): string {
  const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/register`;
  
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <title>Dein eSIM Cash Guthaben wartet auf dich</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#059669,#10b981); padding:40px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:26px; font-weight:700; }
    .header p { margin:8px 0 0; color:#a7f3d0; font-size:14px; }
    .body { padding:32px; text-align:center; }
    .amount-box { display:inline-block; background:#ecfdf5; border:1px solid #a7f3d0; border-radius:12px; padding:20px 40px; margin:24px 0; }
    .amount-val { font-size:40px; font-weight:800; color:#059669; }
    .amount-label { font-size:12px; color:#047857; text-transform:uppercase; letter-spacing:1px; margin-top:4px; }
    .btn { display:inline-block; background:#059669; color:#fff; text-decoration:none; font-weight:700; padding:14px 28px; border-radius:8px; margin-top:20px; box-shadow:0 4px 12px rgba(5,150,105,0.2); }
    .btn:hover { background:#047857; }
    .footer { background:#f8faff; border-top:1px solid #e5e7eb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#059669; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>🎁 Dein Guthaben wartet!</h1>
      <p>Es liegen bereits Ersparnisse bereit</p>
    </div>
    <div class="body">
      <p>Hallo,</p>
      <p>du hast als Gast auf unserer Website eingekauft. Wusstest du schon? Du hast bereits folgendes <strong>eSIM Cash</strong>-Guthaben gesammelt:</p>
      
      <div class="amount-box">
        <div class="amount-val">${data.balanceEur.toFixed(2)} €</div>
        <div class="amount-label">Verfügbares Guthaben</div>
      </div>

      <p style="line-height:1.6;color:#4b5563;">Um dieses Guthaben sofort bei deinem nächsten Einkauf einlösen zu können, musst du dich lediglich mit dieser E-Mail-Adresse bei uns registrieren. Das Guthaben wird dann automatisch mit deinem neuen Konto verknüpft!</p>
      
      <a href="${registerUrl}" class="btn">Jetzt kostenlos registrieren</a>
    </div>
    <div class="footer">
      <p>Fragen? <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} eSIM Shop</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildGuestMilestoneText(data: GuestMilestoneData): string {
  const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/register`;
  
  return `Dein eSIM Cash Guthaben wartet auf dich!

Du hast bereits ${data.balanceEur.toFixed(2)} € eSIM Cash-Guthaben als Gast gesammelt.

Registriere dich einfach unter ${registerUrl} mit deiner E-Mail-Adresse, um dein Guthaben freizuschalten und bei deinem nächsten Einkauf einzulösen.
`;
}
