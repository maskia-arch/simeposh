import { getEmailTranslations, normalizeEmailLocale } from '../i18n';

export interface CashbackEarnedData {
  to:            string;
  earnedEur:     number;
  newBalanceEur: number;
  rank:          string;
  orderId:       string;
  locale?:       string;
}

export interface GuestMilestoneData {
  to:            string;
  balanceEur:    number;
  milestoneEur:  number;
  locale?:       string;
}

export function buildCashbackEarnedHtml(data: CashbackEarnedData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);
  const shortOrderId = data.orderId.split('-')[0].toUpperCase();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;

  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <title>${t.cashbackEarnedTitle}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#2563eb,#3b82f6); padding:36px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p { margin:6px 0 0; color:#bfdbfe; font-size:13px; }
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
      <!-- PureSim Official Brand Header -->
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px; border-collapse:collapse;">
        <tr>
          <td align="center" style="vertical-align:middle; padding-right:8px;">
            <img src="${logoUrl}" width="44" height="44" alt="PureSim Logo" style="display:block; width:44px; height:44px; object-fit:contain; border:0; outline:none;" />
          </td>
          <td align="center" style="vertical-align:middle;">
            <span style="font-size:24px; font-weight:800; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:-0.5px; line-height:1.2;">
              <span style="color:#ffffff;">Pur</span><span style="color:#93c5fd;">eSim</span>
            </span>
          </td>
        </tr>
      </table>
      <h1>${t.cashbackEarnedTitle}</h1>
      <p>${t.esimOrderBadge(shortOrderId)}</p>
    </div>
    <div class="body">
      <p>${t.greeting()}</p>
      <p>${t.cashbackEarnedSub}</p>
      
      <div class="stat-card">
        <div class="stat-label">${t.cashbackEarnedValLabel}</div>
        <div class="stat-val">+${(Number(data.earnedEur) || 0).toFixed(2)} €</div>
      </div>

      <div class="info-grid">
        <div class="info-item">
          <div class="label">${t.cashbackNewBalanceLabel}</div>
          <div class="value">${(Number(data.newBalanceEur) || 0).toFixed(2)} €</div>
        </div>
        <div class="info-item">
          <div class="label">${t.cashbackCurrentRankLabel}</div>
          <div class="value">${data.rank}</div>
        </div>
      </div>
      
      <p style="font-size:13px;color:#6b7280;line-height:1.5;">${t.cashbackRedeemHint}</p>
    </div>
    <div class="footer">
      <p>${t.esimFooterQuestions} <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildCashbackEarnedText(data: CashbackEarnedData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);

  return `${t.cashbackEarnedTitle}
${t.esimOrderBadge(data.orderId)}

${t.cashbackEarnedValLabel}: +${(Number(data.earnedEur) || 0).toFixed(2)} €
${t.cashbackNewBalanceLabel}: ${(Number(data.newBalanceEur) || 0).toFixed(2)} €
${t.cashbackCurrentRankLabel}: ${data.rank}

${t.cashbackRedeemHint}
`;
}

export function buildGuestMilestoneHtml(data: GuestMilestoneData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const registerUrl = `${appUrl}/register`;
  const logoUrl = `${appUrl}/logo.png`;
  
  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <title>${t.guestMilestoneSubject}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#059669,#10b981); padding:36px 32px; text-align:center; }
    .header h1 { margin:0; color:#fff; font-size:24px; font-weight:700; }
    .header p { margin:6px 0 0; color:#a7f3d0; font-size:13px; }
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
      <!-- PureSim Official Brand Header -->
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px; border-collapse:collapse;">
        <tr>
          <td align="center" style="vertical-align:middle; padding-right:8px;">
            <img src="${logoUrl}" width="44" height="44" alt="PureSim Logo" style="display:block; width:44px; height:44px; object-fit:contain; border:0; outline:none;" />
          </td>
          <td align="center" style="vertical-align:middle;">
            <span style="font-size:24px; font-weight:800; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:-0.5px; line-height:1.2;">
              <span style="color:#ffffff;">Pur</span><span style="color:#a7f3d0;">eSim</span>
            </span>
          </td>
        </tr>
      </table>
      <h1>${t.guestMilestoneTitle}</h1>
    </div>
    <div class="body">
      <p>${t.greeting()}</p>
      <p>${t.guestMilestoneSub}</p>
      
      <div class="amount-box">
        <div class="amount-val">${(Number(data.balanceEur) || 0).toFixed(2)} €</div>
        <div class="amount-label">${t.guestMilestoneValLabel}</div>
      </div>

      <p style="line-height:1.6;color:#4b5563;">${t.guestMilestoneText}</p>
      
      <a href="${registerUrl}" class="btn">${t.guestMilestoneBtn}</a>
    </div>
    <div class="footer">
      <p>${t.esimFooterQuestions} <a href="mailto:${process.env.SMTP_FROM_ADDRESS}">${process.env.SMTP_FROM_ADDRESS}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildGuestMilestoneText(data: GuestMilestoneData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const t = getEmailTranslations(normLoc);
  const registerUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net'}/register`;
  
  return `${t.guestMilestoneSubject}

${t.guestMilestoneSub} ${(Number(data.balanceEur) || 0).toFixed(2)} €

${t.guestMilestoneText}

${registerUrl}
`;
}

export interface GuestExpirationReminderData {
  to:                   string;
  balanceEur:           number;
  expiryDateFormatted:  string;
  daysRemaining:        number;
  locale?:              string;
}

export function buildGuestExpirationReminderHtml(data: GuestExpirationReminderData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isDe = normLoc === 'de';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net').replace(/\/$/, '');
  const registerUrl = `${appUrl}/register?email=${encodeURIComponent(data.to)}`;
  const logoUrl = `${appUrl}/logo.png`;
  const formattedBalance = (Number(data.balanceEur) || 0).toFixed(2);

  const subject = isDe
    ? `⏰ Dein eSIM Cash Guthaben (${formattedBalance} €) verfällt in Kürze – Jetzt verlängern!`
    : `⏰ Your eSIM Cash balance (${formattedBalance} €) expires soon – Extend now!`;

  const headline = isDe ? 'Dein Guthaben verfällt in Kürze' : 'Your balance expires soon';
  const subtext = isDe
    ? `Dein gesammeltes eSIM Cash Guthaben verfällt am <strong>${data.expiryDateFormatted}</strong>.`
    : `Your collected eSIM Cash balance expires on <strong>${data.expiryDateFormatted}</strong>.`;

  const boxTitle = isDe ? 'Sichere dir 2 volle Jahre Gültigkeit!' : 'Lock in 2 full years of validity!';
  const boxText = isDe
    ? `Als Gast-Nutzer verfällt dein gesammeltes Guthaben nach 90 Tagen. Erstelle dir jetzt in wenigen Sekunden ein kostenloses PureSim Nutzerkonto, um dein Guthaben sofort auf <strong>730 Tage (2 volle Jahre)</strong> zu verlängern!`
    : `As a guest user, your collected balance expires after 90 days. Create a free PureSim account in a few seconds to instantly extend your balance validity to <strong>730 days (2 full years)</strong>!`;

  const btnText = isDe
    ? '🚀 Jetzt kostenlos registrieren & 2 Jahre Gültigkeit sichern'
    : '🚀 Register for free now & claim 2 years validity';

  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <title>${subject}</title>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; }
    .wrapper { max-width:600px; margin:40px auto; background:#fff; border-radius:16px; overflow:hidden; box-shadow:0 8px 32px rgba(0,0,0,0.08); }
    .header { background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%); padding:36px 32px; text-align:center; }
    .header h1 { margin:10px 0 0; color:#fbbf24; font-size:24px; font-weight:800; letter-spacing:-0.5px; }
    .header p { margin:6px 0 0; color:#c7d2fe; font-size:14px; }
    .body { padding:32px; text-align:center; }
    .stat-card { background:linear-gradient(135deg,#fffbeb 0%,#fef3c7 100%); border:1px solid #fde68a; border-radius:16px; padding:24px; text-align:center; margin:20px 0; }
    .stat-val { font-size:42px; font-weight:900; color:#d97706; margin:4px 0; }
    .stat-label { font-size:12px; font-weight:700; color:#92400e; text-transform:uppercase; letter-spacing:1px; }
    .stat-sub { font-size:13px; color:#b45309; font-weight:600; margin-top:6px; }
    .promo-box { background:#f0fdf4; border:1.5px dashed #4ade80; border-radius:14px; padding:20px; text-align:left; margin:24px 0; }
    .promo-title { font-size:15px; font-weight:800; color:#166534; margin:0 0 8px; display:flex; align-items:center; gap:8px; }
    .promo-desc { font-size:13px; color:#15803d; line-height:1.6; margin:0; }
    .btn { display:inline-block; background:linear-gradient(135deg,#2563eb 0%,#1d4ed8 100%); color:#ffffff !important; text-decoration:none; font-weight:800; font-size:14px; padding:16px 32px; border-radius:12px; box-shadow:0 4px 16px rgba(37,99,235,0.3); margin-top:8px; }
    .footer { background:#f8faff; border-top:1px solid #e5e7eb; padding:24px 32px; text-align:center; font-size:12px; color:#9ca3af; }
    .footer a { color:#2563eb; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px; border-collapse:collapse;">
        <tr>
          <td align="center" style="vertical-align:middle; padding-right:8px;">
            <img src="${logoUrl}" width="44" height="44" alt="PureSim Logo" style="display:block; width:44px; height:44px; object-fit:contain; border:0; outline:none;" />
          </td>
          <td align="center" style="vertical-align:middle;">
            <span style="font-size:24px; font-weight:800; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:-0.5px; line-height:1.2;">
              <span style="color:#ffffff;">Pur</span><span style="color:#93c5fd;">eSim</span>
            </span>
          </td>
        </tr>
      </table>
      <h1>${headline}</h1>
      <p style="margin-top:4px;">${subtext}</p>
    </div>
    <div class="body">
      <div class="stat-card">
        <div class="stat-label">${isDe ? 'Verfügbares eSIM Cash' : 'Available eSIM Cash'}</div>
        <div class="stat-val">${formattedBalance} €</div>
        <div class="stat-sub">
          ${isDe ? `⏳ Verfällt am ${data.expiryDateFormatted} (in ${data.daysRemaining} Tagen)` : `⏳ Expires on ${data.expiryDateFormatted} (in ${data.daysRemaining} days)`}
        </div>
      </div>

      <div class="promo-box">
        <div class="promo-title">🎁 ${boxTitle}</div>
        <p class="promo-desc">${boxText}</p>
      </div>

      <a href="${registerUrl}" class="btn">${btnText}</a>
    </div>
    <div class="footer">
      <p>Fragen? kontaktiere uns unter <a href="mailto:${process.env.SMTP_FROM_ADDRESS || 'support@puresim.net'}">${process.env.SMTP_FROM_ADDRESS || 'support@puresim.net'}</a></p>
      <p style="margin-top:8px;color:#cbd5e1">© ${new Date().getFullYear()} PureSim. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildGuestExpirationReminderText(data: GuestExpirationReminderData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isDe = normLoc === 'de';
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net').replace(/\/$/, '');
  const registerUrl = `${appUrl}/register?email=${encodeURIComponent(data.to)}`;
  const formattedBalance = (Number(data.balanceEur) || 0).toFixed(2);

  return isDe
    ? `⏰ Dein eSIM Cash Guthaben (${formattedBalance} €) verfällt in Kürze!

Du hast aktuell ${formattedBalance} € eSIM Cash gesammelt.
Dein Guthaben verfällt am ${data.expiryDateFormatted} (in ${data.daysRemaining} Tagen).

🎁 SICHERE DIR 2 VOLLE JAHRE GÜLTIGKEIT:
Erstelle jetzt in wenigen Sekunden ein kostenloses PureSim Nutzerkonto, um dein Guthaben sofort auf 730 Tage (2 volle Jahre) zu verlängern!

Jetzt kostenlos registrieren:
${registerUrl}
`
    : `⏰ Your eSIM Cash balance (${formattedBalance} €) expires soon!

You currently have ${formattedBalance} € eSIM Cash.
Your balance expires on ${data.expiryDateFormatted} (in ${data.daysRemaining} days).

🎁 EXTEND YOUR VALIDITY TO 2 FULL YEARS:
Create a free PureSim account now to instantly extend your balance validity to 730 days (2 full years)!

Register for free now:
${registerUrl}
`;
}

