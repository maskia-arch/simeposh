import { normalizeEmailLocale } from '../i18n';

export interface FeedbackInviteData {
  to:            string;
  customerName?: string;
  orderId:       string;
  tariffName?:   string;
  countryName?:  string;
  inviteUrl:     string;
  locale?:       string;
}

export function buildFeedbackInviteHtml(data: FeedbackInviteData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isEn = normLoc === 'en';

  const customerGreeting = data.customerName 
    ? (isEn ? `Hello ${data.customerName},` : `Hallo ${data.customerName},`)
    : (isEn ? 'Hello,' : 'Hallo,');

  const shortOrderId = data.orderId.split('-')[0].toUpperCase();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;

  const itemDetails = data.tariffName 
    ? `${data.countryName ? `${data.countryName} – ` : ''}${data.tariffName}`
    : (data.countryName || (isEn ? 'eSIM Order' : 'eSIM Bestellung'));

  return `<!DOCTYPE html>
<html lang="${normLoc}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isEn ? 'How was your experience with PureSim?' : 'Wie war deine Erfahrung mit PureSim?'}</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "PureSim",
    "url": "${appUrl}",
    "logo": "${logoUrl}"
  }
  </script>
  <style>
    body { margin:0; padding:0; background:#f4f7fb; font-family:'Helvetica Neue',Arial,sans-serif; color:#1a202c; -webkit-font-smoothing:antialiased; }
    .wrapper { max-width:600px; margin:40px auto; background:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 24px rgba(0,0,0,0.06); }
    .header { background:linear-gradient(135deg,#1d4ed8,#3b82f6); padding:36px 32px; text-align:center; }
    .header h1 { margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.3px; }
    .header p { margin:6px 0 0; color:#bfdbfe; font-size:13px; font-weight:500; }
    .body { padding:36px 32px; }
    .intro-box { background:#f8faff; border:1px solid #e0ecff; border-radius:12px; padding:16px 18px; margin:20px 0 24px; }
    .stars-preview { text-align:center; font-size:26px; letter-spacing:4px; margin:16px 0; color:#f59e0b; }
    .cta-container { text-align:center; margin:32px 0 28px; }
    .cta-button { background-color:#2563eb; color:#ffffff !important; padding:15px 34px; font-weight:700; font-size:15px; border-radius:10px; text-decoration:none; display:inline-block; box-shadow:0 4px 14px rgba(37,99,235,0.28); }
    .features-list { margin:24px 0; padding:0; list-style:none; }
    .features-list li { padding:6px 0; font-size:13px; color:#475569; display:flex; align-items:center; }
    .verified-badge-card { background:#ecfdf5; border:1px solid #a7f3d0; border-radius:10px; padding:14px 16px; margin-top:24px; }
    .footer { background:#f8faff; border-top:1px solid #e2e8f0; padding:24px 32px; text-align:center; font-size:12px; color:#94a3b8; line-height:1.5; }
    .footer a { color:#3b82f6; text-decoration:none; }
  </style>
</head>
<body>
  <div class="wrapper">
    <!-- Header -->
    <div class="header">
      <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin:0 auto 12px; border-collapse:collapse;">
        <tr>
          <td align="center" style="vertical-align:middle; padding-right:10px;">
            <img src="${logoUrl}" width="42" height="42" alt="PureSim Logo" style="display:block; width:42px; height:42px; object-fit:contain; border:0; outline:none;" />
          </td>
          <td align="center" style="vertical-align:middle;">
            <span style="font-size:24px; font-weight:800; font-family:'Helvetica Neue',Helvetica,Arial,sans-serif; letter-spacing:-0.5px; line-height:1.2;">
              <span style="color:#ffffff;">Pur</span><span style="color:#93c5fd;">eSim</span>
            </span>
          </td>
        </tr>
      </table>
      <h1>${isEn ? 'How was your experience with PureSim?' : 'Wie war deine Erfahrung mit PureSim?'}</h1>
      <p>${isEn ? `Order #${shortOrderId}` : `Bestellung #${shortOrderId}`}</p>
    </div>

    <!-- Body Content -->
    <div class="body">
      <p style="font-size:15px; font-weight:600; color:#1e293b; margin-top:0;">${customerGreeting}</p>
      
      <p style="font-size:14px; line-height:1.6; color:#475569;">
        ${isEn
          ? `Thank you for choosing PureSim for your connection. We would love to hear your feedback on your recent purchase of <strong>${itemDetails}</strong>.`
          : `vielen Dank, dass du dich für PureSim entschieden hast. Wir möchten gerne erfahren, wie zufrieden du mit deinem Kauf von <strong>${itemDetails}</strong> warst.`}
      </p>

      <div class="intro-box">
        <p style="font-size:13px; font-weight:600; color:#1e40af; margin:0 0 4px;">
          ${isEn ? '✨ Your feedback helps other travelers:' : '✨ Deine Meinung hilft anderen Reisenden:'}
        </p>
        <p style="font-size:13px; color:#475569; margin:0; line-height:1.5;">
          ${isEn
            ? 'Rate our service, website speed, and payment process in just 1 minute.'
            : 'Bewerte unseren Service, die Benutzerfreundlichkeit und die Kaufabwicklung in nur einer Minute.'}
        </p>
      </div>

      <div class="stars-preview">
        ★ ★ ★ ★ ★
      </div>

      <!-- Call to Action -->
      <div class="cta-container">
        <a href="${data.inviteUrl}" target="_blank" class="cta-button">
          ${isEn ? 'Leave a Review Now →' : 'Jetzt Bewertung abgeben →'}
        </a>
      </div>

      <!-- Verified Badge Note -->
      <div class="verified-badge-card">
        <table border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td width="28" style="vertical-align:top; font-size:18px; line-height:1;">
              ✅
            </td>
            <td style="vertical-align:top; padding-left:8px;">
              <p style="font-size:12px; font-weight:700; color:#065f46; margin:0;">
                ${isEn ? 'Verified Purchase Badge' : 'Auszeichnung als Verifizierter Kauf'}
              </p>
              <p style="font-size:11px; color:#047857; margin:3px 0 0; line-height:1.4;">
                ${isEn
                  ? 'Your review is linked to a confirmed transaction and will receive our official "Verified Purchase" badge. You can choose to post anonymously or with your custom alias.'
                  : 'Deine Bewertung ist direkt an deinen verifizierten Kauf gekoppelt und erhält das Siegel „Verifizierter Kauf“. Du kannst wählen, ob du anonym oder mit deinem Wunschnamen posten möchtest.'}
              </p>
            </td>
          </tr>
        </table>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p style="margin:0 0 6px;">
        ${isEn
          ? 'PureSim – Fast, Secure & Anonymous Global eSIM Connectivity'
          : 'PureSim – Schnelle, sichere & anonyme weltweite eSIM-Konnektivität'}
      </p>
      <p style="margin:0; font-size:11px;">
        ${isEn
          ? 'You received this email because you recently placed an order on PureSim. If you do not wish to leave feedback, you can safely ignore this email.'
          : 'Du erhältst diese E-Mail als einmalige Einladung zu deinem vergangenen Kauf. Wenn du kein Feedback abgeben möchtest, kannst du diese Nachricht einfach ignorieren.'}
      </p>
    </div>
  </div>
</body>
</html>`;
}

export function buildFeedbackInviteText(data: FeedbackInviteData): string {
  const normLoc = normalizeEmailLocale(data.locale);
  const isEn = normLoc === 'en';

  const customerGreeting = data.customerName 
    ? (isEn ? `Hello ${data.customerName},` : `Hallo ${data.customerName},`)
    : (isEn ? 'Hello,' : 'Hallo,');

  const shortOrderId = data.orderId.split('-')[0].toUpperCase();
  const itemDetails = data.tariffName 
    ? `${data.countryName ? `${data.countryName} – ` : ''}${data.tariffName}`
    : (data.countryName || (isEn ? 'eSIM Order' : 'eSIM Bestellung'));

  return `
${customerGreeting}

${isEn 
  ? `How was your experience with PureSim (#${shortOrderId})?` 
  : `Wie war deine Erfahrung mit PureSim (#${shortOrderId})?`}

${isEn
  ? `Thank you for choosing PureSim for your connection. We would love to hear your feedback on your recent purchase of ${itemDetails}.`
  : `vielen Dank, dass du dich für PureSim entschieden hast. Wir möchten gerne erfahren, wie zufrieden du mit deinem Kauf von ${itemDetails} warst.`}

${isEn
  ? 'Your review is linked to a confirmed transaction and will receive our official "Verified Purchase" badge. You can choose to post anonymously or with your custom alias.'
  : 'Deine Bewertung ist direkt an deinen verifizierten Kauf gekoppelt und erhält das Siegel „Verifizierter Kauf“. Du kannst wählen, ob du anonym oder mit deinem Wunschnamen posten möchtest.'}

${isEn ? 'Leave your review here:' : 'Hier deine Bewertung abgeben:'}
${data.inviteUrl}

--
PureSim – https://puresim.net
`.trim();
}
