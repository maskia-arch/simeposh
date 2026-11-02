import { NextResponse, type NextRequest } from 'next/server';
import { query as runRawQuery } from '@/lib/db';

/**
 * Admin Prüfliste "Unterschied prüfen":
 * Lists tariffs classified as Travel Premium according to the pricing rule,
 * but without any demonstrable difference (e.g. equal networks, no local/non-hk IP)
 * compared to the base standard tariff of the same group.
 *
 * Strictly adheres to Leak-Test 0: NO internal pricing (no ek_price, cost_price, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const sql = `
      SELECT id,
             package_code,
             name,
             country_code,
             COALESCE(NULLIF(region, ''), country_code) AS true_region,
             data_gb,
             validity_days,
             is_premium,
             COALESCE(raw_data->'operatorList', '[]'::jsonb) AS operator_list,
             COALESCE(raw_data->>'ipType', '') AS ip_type,
             needs_difference_review
      FROM public.tariffs
      WHERE is_active = true AND hidden_reason IS NULL AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
      ORDER BY true_region, data_gb, validity_days, sale_price_eur;
    `;

    const res = await runRawQuery(sql);
    const groups: Record<string, any[]> = {};

    for (const row of res.rows) {
      const key = `${row.true_region}__${row.data_gb}__${row.validity_days}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(row);
    }

    const reviewItems: any[] = [];

    for (const items of Object.values(groups)) {
      const standards = items.filter((x) => !x.is_premium);
      const premiums = items.filter((x) => x.is_premium);
      const baseStd = standards[0] || null;

      const stdOps = baseStd?.operator_list
        ? (Array.isArray(baseStd.operator_list) ? baseStd.operator_list : JSON.parse(baseStd.operator_list))
            .map((o: any) => o.operatorName)
            .filter(Boolean)
        : [];

      for (const p of premiums) {
        if (p.needs_difference_review || (!p.premium_diff_chip && p.is_premium)) {
          const premOps = p.operator_list
            ? (Array.isArray(p.operator_list) ? p.operator_list : JSON.parse(p.operator_list))
                .map((o: any) => o.operatorName)
                .filter(Boolean)
            : [];

          reviewItems.push({
            code: p.package_code,
            name: p.name,
            country_code: p.country_code,
            region: p.true_region,
            data_gb: p.data_gb,
            validity_days: p.validity_days,
            prem_operators: premOps,
            std_operators: stdOps,
            prem_ip_type: p.ip_type || 'Standard',
            std_ip_type: baseStd?.ip_type || 'Standard',
            standard_code: baseStd?.package_code || 'N/A',
            note: 'Kein belegbarer Unterschied zu Standard gefunden (gleiche Netze, keine abweichende IP)',
          });
        }
      }
    }

    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      const rowsHtml = reviewItems
        .map(
          (item) => `
        <tr style="border-bottom: 1px solid #e2e8f0;">
          <td style="padding: 10px; font-family: monospace; font-weight: bold;">${item.code}</td>
          <td style="padding: 10px;">${item.name}</td>
          <td style="padding: 10px;">${item.region} (${item.country_code})</td>
          <td style="padding: 10px;">${item.data_gb} GB / ${item.validity_days} Tage</td>
          <td style="padding: 10px;">${item.prem_operators.join(', ') || 'Keine'}</td>
          <td style="padding: 10px;">${item.std_operators.join(', ') || 'Keine'}</td>
          <td style="padding: 10px;">${item.standard_code}</td>
          <td style="padding: 10px; color: #b45309; font-weight: 500;">${item.note}</td>
        </tr>
      `,
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="utf-8">
          <title>PureSim Admin - Unterschied prüfen</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
            p { font-size: 14px; color: #475569; margin-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { text-align: left; padding: 12px 10px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #475569; }
          </style>
        </head>
        <body>
          <h1>Admin-Prüfliste: Unterschied prüfen</h1>
          <p>Zeigt alle Travel-Premium-Tarife, für die kein belegbarer technischer Unterschied (Netze, IP) gegenüber dem Standard-Tarif ermittelt werden konnte (${reviewItems.length} Einträge).</p>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Tarifname</th>
                <th>Region / Land</th>
                <th>Volumen / Laufzeit</th>
                <th>Netze (Premium)</th>
                <th>Netze (Standard)</th>
                <th>Vergleichs-Standard</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </body>
        </html>
      `;
      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'private, no-store',
        },
      });
    }

    return NextResponse.json(
      {
        total: reviewItems.length,
        items: reviewItems,
      },
      {
        headers: {
          'Cache-Control': 'private, no-store',
        },
      },
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
