import { NextResponse, type NextRequest } from 'next/server';
import { query as runRawQuery } from '@/lib/db';
import { extractRawOperators } from '@/lib/tariffs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin Prüfliste:
 * 1. "Angaben prüfen" (view=attributes or default):
 *    Lists all tariffs showing displayed values vs raw eSIM Access supplier fields side-by-side.
 *    Missing/unverified supplier fields are highlighted.
 * 2. "Unterschied prüfen" (view=diff):
 *    Lists tariffs flagged with needs_difference_review = true.
 *
 * Strictly adheres to Leak-Test 0: NO internal pricing (no ek_price, cost_price, margin, etc.)
 */
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const view = url.searchParams.get('view') || 'attributes';
    const search = (url.searchParams.get('q') || '').trim().toLowerCase();

    if (view === 'diff') {
      const sql = `
        SELECT id,
               package_code,
               name,
               country_code,
               COALESCE(NULLIF(region, ''), country_code) AS true_region,
               data_gb,
               validity_days,
               is_premium,
               premium_diff_chip,
               COALESCE(raw_data->'operatorList', '[]'::jsonb) AS operator_list,
               COALESCE(raw_data->>'ipExport', '') AS ip_export,
               needs_difference_review,
               hidden_reason,
               tariff_type
        FROM public.tariffs
        WHERE is_active = true AND (needs_difference_review = true OR hidden_reason IS NOT NULL)
        ORDER BY true_region, data_gb, validity_days, package_code;
      `;

      const res = await runRawQuery(sql);
      const reviewItems = res.rows.map((p: any) => {
        const rawOps = p.operator_list
          ? (Array.isArray(p.operator_list) ? p.operator_list : JSON.parse(p.operator_list))
              .map((o: any) => o.operatorName)
              .filter(Boolean)
          : [];

        let reason = 'Unterschied prüfen';
        if (p.hidden_reason) {
          reason = `Ausgeblendet: ${p.hidden_reason}`;
        } else if (p.tariff_type?.startsWith('unlimited')) {
          reason = 'Doppeltes Paket';
        }

        return {
          code: p.package_code,
          name: p.name,
          country_code: p.country_code,
          region: p.true_region,
          data_gb: p.data_gb,
          validity_days: p.validity_days,
          operators: rawOps,
          ip_export: p.ip_export || null,
          note: reason,
        };
      });

      const accept = request.headers.get('accept') || '';
      if (accept.includes('text/html')) {
        const rowsHtml = reviewItems
          .map(
            (item: any) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px; font-family: monospace; font-weight: bold;">${item.code}</td>
            <td style="padding: 10px;">${item.name}</td>
            <td style="padding: 10px;">${item.region} (${item.country_code})</td>
            <td style="padding: 10px;">${item.data_gb} GB / ${item.validity_days} Tage</td>
            <td style="padding: 10px;">${item.operators.join(', ') || 'Keine'}</td>
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
            <title>PureSim Admin – Unterschied prüfen</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }
              h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
              p { font-size: 14px; color: #475569; margin-bottom: 20px; }
              .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
              .tab { padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; }
              .tab-active { background: #2563eb; color: #fff; }
              .tab-inactive { background: #e2e8f0; color: #475569; }
              table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
              th { text-align: left; padding: 12px 10px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #475569; }
            </style>
          </head>
          <body>
            <div class="tabs">
              <a href="?view=attributes" class="tab tab-inactive">Angaben prüfen (Lieferantenabgleich)</a>
              <a href="?view=diff" class="tab tab-active">Unterschied prüfen (${reviewItems.length})</a>
            </div>
            <h1>Admin-Prüfliste: Unterschied prüfen</h1>
            <p>Zeigt alle Travel-Premium-Tarife, für die kein belegbarer technischer Unterschied (Netze, IP) gegenüber dem Standard-Tarif ermittelt werden konnte (${reviewItems.length} Einträge).</p>
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Tarifname</th>
                  <th>Region / Land</th>
                  <th>Volumen / Laufzeit</th>
                  <th>Netze</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="padding: 20px; text-align: center; color: #16a34a; font-weight: 600;">✓ Alle Tarife haben einen belegten Unterschied oder sind Standard.</td></tr>'}
              </tbody>
            </table>
          </body>
          </html>
        `;
        return new NextResponse(html, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
        });
      }

      return NextResponse.json({ total: reviewItems.length, items: reviewItems }, { headers: { 'Cache-Control': 'private, no-store' } });
    }

    // Default view: "Angaben prüfen" (Lieferantenabgleich aller Tarife)
    const sql = `
      SELECT id,
             package_code,
             name,
             country_code,
             region,
             data_gb,
             validity_days,
             tariff_type,
             is_premium,
             premium_diff_chip,
             breakout_ip,
             location_codes,
             needs_difference_review,
             raw_data
      FROM public.tariffs
      WHERE is_active = true AND hidden_reason IS NULL
      ORDER BY country_code, data_gb, validity_days, package_code;
    `;

    const res = await runRawQuery(sql);
    let allTariffs = res.rows;

    if (search) {
      allTariffs = allTariffs.filter(
        (t: any) =>
          t.package_code?.toLowerCase().includes(search) ||
          t.country_code?.toLowerCase().includes(search) ||
          t.name?.toLowerCase().includes(search),
      );
    }

    const items = allTariffs.map((t: any) => {
      const raw = t.raw_data || {};
      const rawOps = extractRawOperators(raw);
      const rawVolume = raw.volume ?? raw.totalVolume ?? null;
      const rawDuration = raw.duration ?? raw.validityDays ?? null;
      const rawIpExport = typeof raw.ipExport === 'string' && /^[A-Z]{2}$/i.test(raw.ipExport.trim())
        ? raw.ipExport.trim().toUpperCase()
        : null;
      const locList = Array.isArray(raw.locationNetworkList) ? raw.locationNetworkList : null;
      const locCount = locList ? locList.length : (t.location_codes ? t.location_codes.length : 1);

      // Check for missing supplier fields
      const hasMissingField = !rawVolume || !rawDuration || (t.breakout_ip && !rawIpExport);

      return {
        code: t.package_code,
        name: t.name,
        raw_name: raw.name || raw.slug || null,
        country: t.country_code,
        region: t.region || t.country_code,
        // Volumen
        display_volume: t.data_gb === 0 || t.data_gb === null ? 'Unlimited' : `${t.data_gb} GB`,
        raw_volume: rawVolume !== null ? `${rawVolume} MB/Bytes` : null,
        // Laufzeit
        display_duration: `${t.validity_days} Tage`,
        raw_duration: rawDuration !== null ? `${rawDuration} Tage/Stunden` : null,
        // Breakout IP
        display_ip: t.breakout_ip ? `${t.breakout_ip} IP` : 'Keine Angabe (Standard)',
        raw_ip: rawIpExport || 'Kein ipExport im JSON',
        // Netze
        display_operators: rawOps.join(', ') || '1 Netz',
        raw_operators_count: Array.isArray(raw.operatorList) ? raw.operatorList.length : 0,
        // Länder
        display_locations: `${locCount} ${locCount === 1 ? 'Land' : 'Länder'}`,
        raw_locations_count: locCount,
        // Chip & Type
        tariff_type: t.tariff_type,
        is_premium: t.is_premium,
        chip: t.premium_diff_chip || null,
        has_missing_field: hasMissingField,
        needs_diff_review: t.needs_difference_review,
      };
    });

    const accept = request.headers.get('accept') || '';
    if (accept.includes('text/html')) {
      const rowsHtml = items
        .slice(0, 500)
        .map(
          (item: any) => `
        <tr style="border-bottom: 1px solid #e2e8f0; ${item.has_missing_field ? 'background: #fffbeb;' : ''}">
          <td style="padding: 8px 10px; font-family: monospace; font-size: 12px; font-weight: bold;">${item.code}</td>
          <td style="padding: 8px 10px; font-size: 12px;">
            <div><strong>${item.name}</strong></div>
            <div style="font-size: 11px; color: #64748b;">Roh: ${item.raw_name || '<span style="color:#b91c1c;">Fehlt</span>'}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 12px;">${item.region} (${item.country})</td>
          <td style="padding: 8px 10px; font-size: 12px;">
            <div><strong>${item.display_volume}</strong> / <strong>${item.display_duration}</strong></div>
            <div style="font-size: 11px; color: #64748b;">Roh: ${item.raw_volume || '–'} / ${item.raw_duration || '–'}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 12px;">
            <div><strong>${item.display_ip}</strong></div>
            <div style="font-size: 11px; color: #64748b;">Roh (ipExport): ${item.raw_ip}</div>
          </td>
          <td style="padding: 8px 10px; font-size: 12px;">
            <div><strong>${item.display_operators}</strong></div>
            <div style="font-size: 11px; color: #64748b;">Roh (operatorList): ${item.raw_operators_count} Betreiber</div>
          </td>
          <td style="padding: 8px 10px; font-size: 12px;">
            ${item.chip ? `<span style="background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; font-weight: 600; font-size: 11px;">${item.chip}</span>` : `<span style="color: #64748b; font-size: 11px;">${item.tariff_type}</span>`}
          </td>
        </tr>
      `,
        )
        .join('');

      const html = `
        <!DOCTYPE html>
        <html lang="de">
        <head>
          <meta charset="utf-8">
          <title>PureSim Admin – Angaben prüfen</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; background: #f8fafc; color: #0f172a; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 8px; }
            p { font-size: 14px; color: #475569; margin-bottom: 20px; }
            .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
            .tab { padding: 8px 16px; border-radius: 6px; text-decoration: none; font-size: 13px; font-weight: 600; }
            .tab-active { background: #2563eb; color: #fff; }
            .tab-inactive { background: #e2e8f0; color: #475569; }
            table { width: 100%; border-collapse: collapse; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            th { text-align: left; padding: 12px 10px; background: #f1f5f9; font-size: 12px; text-transform: uppercase; color: #475569; }
            .search-bar { margin-bottom: 16px; display: flex; gap: 8px; }
            .search-bar input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; width: 300px; font-size: 13px; }
            .search-bar button { padding: 8px 14px; background: #2563eb; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="tabs">
            <a href="?view=attributes" class="tab tab-active">Angaben prüfen (Lieferantenabgleich: ${items.length})</a>
            <a href="?view=diff" class="tab tab-inactive">Unterschied prüfen</a>
          </div>
          <h1>Admin-Prüfliste: Angaben prüfen</h1>
          <p>Zeigt je angezeigter Tarifangabe den Wert und das zugehörige Lieferantenfeld aus eSIM Access nebeneinander. Keine internen Preise oder Margen.</p>
          <form class="search-bar" method="GET">
            <input type="hidden" name="view" value="attributes" />
            <input type="text" name="q" placeholder="Nach Paketcode, Land oder Name suchen..." value="${search}" />
            <button type="submit">Filtern</button>
          </form>
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Angezeigter Name vs. Rohfeld</th>
                <th>Region / Land</th>
                <th>Volumen & Laufzeit</th>
                <th>Breakout IP (ipExport)</th>
                <th>Betreiber (operatorList)</th>
                <th>Typ / Differenz-Chip</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
          ${items.length > 500 ? `<p style="margin-top: 12px; font-size: 12px; color: #64748b;">(Zeigt die ersten 500 von ${items.length} Tarifen. Nutze die Suche für spezifische Pakete.)</p>` : ''}
        </body>
        </html>
      `;

      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store' },
      });
    }

    return NextResponse.json(
      {
        total: items.length,
        items,
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
