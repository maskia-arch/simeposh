import { normalizeEmailLocale } from '../i18n';

export interface TicketCreatedData {
  ticketNumber:  string;
  customerEmail: string;
  customerName?: string;
  subject:        string;
  category:       string;
  description:    string;
  invoiceId?:     string;
  iccid?:          string;
  locale?:        string;
}

export interface TicketAnsweredData {
  ticketNumber:  string;
  customerEmail: string;
  customerName?: string;
  subject:        string;
  replyMessage:   string;
  senderName?:    string;
  locale?:        string;
}

export function buildTicketCreatedCustomerHtml(data: TicketCreatedData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;
  const ticketUrl = `${appUrl}/dashboard?tab=tickets`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
    .card { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: #dbeafe; color: #1e40af; font-weight: 700; font-size: 13px; padding: 4px 12px; border-radius: 20px; margin-bottom: 12px; }
    .details { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; }
    .details td { padding: 4px 0; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="${logoUrl}" width="40" height="40" alt="PureSim" style="margin-bottom:8px;" />
      <h2 style="margin:0; font-size:22px; color:#1e293b;">Support-Ticket empfangen</h2>
    </div>
    <div className="badge">${data.ticketNumber}</div>
    <p>Hallo ${data.customerName || 'Kunde'},</p>
    <p>wir haben deine Anfrage erfolgreich erhalten. Unser Support-Team bearbeitet dein Anliegen schnellstmöglich.</p>
    
    <div class="details">
      <table style="width:100%;">
        <tr><td><strong>Ticket ID:</strong></td><td style="text-align:right;">${data.ticketNumber}</td></tr>
        <tr><td><strong>Betreff:</strong></td><td style="text-align:right;">${data.subject}</td></tr>
        <tr><td><strong>Kategorie:</strong></td><td style="text-align:right;">${data.category}</td></tr>
        ${data.invoiceId ? `<tr><td><strong>Rechnungs-ID:</strong></td><td style="text-align:right; font-family:monospace;">${data.invoiceId}</td></tr>` : ''}
        ${data.iccid ? `<tr><td><strong>ICCID:</strong></td><td style="text-align:right; font-family:monospace;">${data.iccid}</td></tr>` : ''}
      </table>
    </div>

    <p style="font-size:14px; color:#334155; white-space:pre-wrap; background:#f8fafc; border-left:4px solid #2563eb; padding:12px;">${data.description}</p>

    <div style="text-align:center;">
      <a href="${ticketUrl}" class="btn">Ticket im Dashboard ansehen</a>
    </div>

    <div class="footer">
      PureSim Customer Support · Du kannst den Status deines Tickets jederzeit im Dashboard einsehen.
    </div>
  </div>
</body>
</html>`;
}

export function buildTicketCreatedAdminHtml(data: TicketCreatedData): string {
  const adminUrl = process.env.ADMIN_URL || 'http://localhost:3001/admin/tickets';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 20px; }
    .card { max-width: 650px; margin: 0 auto; background: #1e293b; border-radius: 12px; padding: 28px; border: 1px solid #334155; }
    .badge { background: #dc2626; color: #fff; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 12px; }
    .btn { display: inline-block; background: #2563eb; color: #fff; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">Neues Support-Ticket</span>
    <h2 style="margin: 12px 0 6px; color:#fff;">[${data.ticketNumber}] ${data.subject}</h2>
    <p style="color:#94a3b8; font-size:14px; margin:0 0 16px;">Von: <strong>${data.customerEmail}</strong> (${data.customerName || 'Gast'})</p>

    <table style="width:100%; color:#cbd5e1; font-size:13px; margin-bottom:16px;">
      <tr><td>Kategorie:</td><td><strong>${data.category}</strong></td></tr>
      ${data.invoiceId ? `<tr><td>Invoice ID:</td><td><code>${data.invoiceId}</code></td></tr>` : ''}
      ${data.iccid ? `<tr><td>ICCID:</td><td><code>${data.iccid}</code></td></tr>` : ''}
    </table>

    <div style="background:#0f172a; padding:16px; border-radius:8px; color:#e2e8f0; font-size:14px; white-space:pre-wrap;">${data.description}</div>

    <div style="text-align:center; margin-top:20px;">
      <a href="${adminUrl}" class="btn">Im Admin-Dashboard bearbeiten</a>
    </div>
  </div>
</body>
</html>`;
}

export function buildTicketAnsweredCustomerHtml(data: TicketAnsweredData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://puresim.net';
  const logoUrl = `${appUrl}/logo.png`;
  const ticketUrl = `${appUrl}/dashboard?tab=tickets`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 0; }
    .card { max-width: 600px; margin: 30px auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { text-align: center; margin-bottom: 24px; }
    .reply-box { background: #eff6ff; border-left: 4px solid #2563eb; border-radius: 0 8px 8px 0; padding: 16px; margin: 20px 0; font-size: 15px; color: #1e3a8a; white-space: pre-wrap; line-height: 1.6; }
    .btn { display: inline-block; background: #2563eb; color: #ffffff; padding: 12px 24px; font-weight: bold; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .footer { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 32px; border-top: 1px solid #f1f5f9; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <img src="${logoUrl}" width="40" height="40" alt="PureSim" style="margin-bottom:8px;" />
      <h2 style="margin:0; font-size:22px; color:#1e293b;">Neue Antwort auf dein Ticket</h2>
      <p style="color:#64748b; font-size:14px; margin:4px 0 0;">Ticket-ID: <strong>${data.ticketNumber}</strong></p>
    </div>
    
    <p>Hallo ${data.customerName || 'Kunde'},</p>
    <p>unser Support-Team hat auf dein Ticket <strong>"${data.subject}"</strong> geantwortet:</p>
    
    <div class="reply-box">${data.replyMessage}</div>

    <p style="font-size:14px; color:#475569;">Du kannst direkt auf diese Antwort im Dashboard reagieren oder weitere Fragen stellen.</p>

    <div style="text-align:center;">
      <a href="${ticketUrl}" class="btn">Auf Ticket antworten</a>
    </div>

    <div class="footer">
      PureSim Customer Support · Bei weiteren Fragen melde dich direkt im Ticket-Bereich deines Dashboards.
    </div>
  </div>
</body>
</html>`;
}
