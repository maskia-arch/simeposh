import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase/server';
import { verifyJwt } from '@/lib/auth/jwt';
import { cookies } from 'next/headers';
import { displayCountryName } from '@/lib/tariff-display';
import { formatCurrencyEuro, formatGb } from '@/lib/utils';
import { formatDaysWithUnit } from '@/lib/i18n/plural';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) return new NextResponse('Not Found', { status: 404 });

  let currentUserId: string | null = null;
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();
    if (user?.id) currentUserId = user.id;
  } catch {}

  if (!currentUserId) {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get('session_token')?.value;
      if (token) {
        const payload = await verifyJwt(token);
        if (payload?.id) currentUserId = payload.id;
      }
    } catch {}
  }

  if (!currentUserId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const db = createServiceClient();
  const { data: order } = await db
    .from('orders')
    .select('id, status, amount_eur, created_at, user_id, tariffs(country_name, country_code, data_gb, validity_days)')
    .eq('id', id)
    .eq('user_id', currentUserId)
    .maybeSingle();

  if (!order) {
    return new NextResponse('Order Not Found', { status: 404 });
  }

  const tariff = (order as any).tariffs;
  const locale = request.headers.get('x-locale') || 'de';
  const isDe = locale === 'de';

  const country = tariff
    ? displayCountryName({ country_code: tariff.country_code, country_name: tariff.country_name } as any, locale)
    : 'eSIM';

  const validityText = tariff ? formatDaysWithUnit(tariff.validity_days, locale) : '';
  const dataText = tariff ? formatGb(tariff.data_gb) : '';
  const tariffName = tariff ? `${country} · ${dataText} · ${validityText}` : 'PureSim eSIM';

  const formattedDate = new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: 'Europe/Berlin',
  }).format(new Date(order.created_at));

  const totalAmount = formatCurrencyEuro(Number(order.amount_eur || 0), locale);

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${isDe ? 'Zahlungsbeleg' : 'Payment Receipt'} - #${order.id.slice(0, 8)} | PureSim</title>
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 40px 20px;
      background: #f8fafc;
      color: #0f172a;
    }
    .receipt-box {
      max-width: 640px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #f1f5f9;
      padding-bottom: 24px;
      margin-bottom: 28px;
    }
    .brand {
      font-size: 26px;
      font-weight: 900;
      color: #1d4ed8;
      letter-spacing: -0.5px;
    }
    .meta-right {
      text-align: right;
      font-size: 13px;
      color: #64748b;
    }
    .title {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 4px 0;
      color: #0f172a;
    }
    .subtitle {
      font-size: 13px;
      color: #64748b;
      margin-bottom: 24px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 28px;
    }
    th {
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #64748b;
      padding-bottom: 12px;
      border-bottom: 1px solid #e2e8f0;
    }
    td {
      padding: 16px 0;
      font-size: 14px;
      border-bottom: 1px solid #f1f5f9;
    }
    .total-row td {
      font-size: 18px;
      font-weight: 800;
      border-bottom: none;
      padding-top: 20px;
      color: #0f172a;
    }
    .tax-notice {
      margin-top: 24px;
      padding: 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 11px;
      color: #94a3b8;
    }
    @media print {
      body {
        background: #ffffff;
        padding: 0;
      }
      .receipt-box {
        border: none;
        box-shadow: none;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="receipt-box">
    <div class="no-print" style="margin-bottom: 20px; text-align: right;">
      <button onclick="window.print()" style="background: #1d4ed8; color: #fff; font-weight: bold; border: none; border-radius: 8px; padding: 8px 16px; cursor: pointer; font-size: 13px;">
        ${isDe ? '🖨️ Drucken / Als PDF speichern' : '🖨️ Print / Save as PDF'}
      </button>
    </div>

    <div class="header">
      <div>
        <div class="brand">PureSim</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 4px;">PureSim.net</div>
      </div>
      <div class="meta-right">
        <div><strong>${isDe ? 'Bestellung' : 'Order'}:</strong> #${order.id.slice(0, 8)}</div>
        <div style="margin-top: 4px;">${formattedDate}</div>
      </div>
    </div>

    <div class="title">${isDe ? 'Zahlungsbeleg & Quittung' : 'Payment Receipt'}</div>
    <div class="subtitle">${isDe ? 'Vielen Dank für deine Bestellung bei PureSim!' : 'Thank you for your order with PureSim!'}</div>

    <table>
      <thead>
        <tr>
          <th>${isDe ? 'Position / Tarif' : 'Item / Plan'}</th>
          <th style="text-align: right;">${isDe ? 'Betrag' : 'Amount'}</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <strong>${tariffName}</strong><br />
            <span style="font-size: 12px; color: #64748b;">
              ${isDe ? 'Zahlungsmethode: Kryptowährung (Litecoin / LTC)' : 'Payment method: Cryptocurrency (Litecoin / LTC)'}
            </span>
          </td>
          <td style="text-align: right; font-weight: 600;">${totalAmount}</td>
        </tr>
        <tr class="total-row">
          <td>${isDe ? 'Gesamtbetrag' : 'Total Paid'}</td>
          <td style="text-align: right; color: #1d4ed8;">${totalAmount}</td>
        </tr>
      </tbody>
    </table>

    <div class="tax-notice">
      ${isDe
        ? '<strong>Hinweis zur Umsatzsteuer:</strong> Gemäß § 19 UStG wird keine Umsatzsteuer berechnet (Kleinunternehmerregelung).'
        : '<strong>VAT Notice:</strong> In accordance with § 19 UStG, no value-added tax is charged (small business regulation).'}
    </div>

    <div class="footer">
      PureSim.net · Support: support@puresim.net · ${new Date().getFullYear()}
    </div>
  </div>
  <script>
    if (window.location.search.includes('print=1')) {
      window.print();
    }
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'private, no-cache, no-store, must-revalidate',
      'x-robots-tag': 'noindex, nofollow',
    },
  });
}
