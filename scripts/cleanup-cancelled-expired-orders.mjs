#!/usr/bin/env node
/**
 * scripts/cleanup-cancelled-expired-orders.mjs
 * 
 * Einmalige, wiederholbare Bereinigung fuer abgebrochene und abgelaufene Zahlungen.
 * Setzt zugehoerige Bestellungen auf 'cancelled' (storniert) bzw. 'expired' (abgelaufen).
 * Bestellungen mit Geldeingang (received_amount > 0) werden NIEMALS storniert/abgelaufen,
 * sondern zur manuellen Pruefung gelistet.
 *
 * Nutzung:
 *   node --env-file=.env.local scripts/cleanup-cancelled-expired-orders.mjs             # Trockenlauf (Default)
 *   node --env-file=.env.local scripts/cleanup-cancelled-expired-orders.mjs --dry-run   # Trockenlauf
 *   node --env-file=.env.local scripts/cleanup-cancelled-expired-orders.mjs --execute   # Wirklich ausfuehren
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';

// Load .env.local if DATABASE_URL is not already set in process.env
if (!process.env.DATABASE_URL) {
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    const fullPath = path.resolve(process.cwd(), envFile);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          let val = match[2].trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('FEHLER: DATABASE_URL Umgebungsvariable wurde nicht gefunden!');
  process.exit(1);
}

const isExecute = process.argv.includes('--execute');
const isDryRun = !isExecute;

const pool = new pg.Pool({
  connectionString,
});

async function runCleanup() {
  const client = await pool.connect();
  console.log('='.repeat(70));
  console.log(`BEREINIGUNG ABGEBROCHENER & ABGELAUFENER BESTELLUNGEN`);
  console.log(`MODUS: ${isDryRun ? '🔍 TROCKENLAUF (DRY-RUN - Keine Aenderungen)' : '⚡ ECHTLAUF (--execute - Aenderungen werden geschrieben)'}`);
  console.log('='.repeat(70));

  try {
    // 1. Hole alle relevanten Sessions: cancelled, expired oder pending mit Ablaufzeit in Vergangenheit
    const sessionsRes = await client.query(`
      SELECT id, status, order_ids, received_amount, expires_at, created_at
      FROM crypto_sessions
      WHERE status IN ('cancelled', 'expired')
         OR (status = 'pending' AND expires_at < NOW())
      ORDER BY created_at ASC
    `);

    console.log(`Gefundene Kandidaten-Sessions: ${sessionsRes.rows.length}`);

    const latePaymentReviewList = [];
    const ordersToCancel = [];
    const ordersToExpire = [];
    const sessionsToMarkExpired = [];
    let alreadyCleanCount = 0;

    for (const session of sessionsRes.rows) {
      const received = Number(session.received_amount) || 0;
      const isPastDue = session.expires_at && new Date(session.expires_at) < new Date();

      if (session.status === 'pending' && isPastDue) {
        sessionsToMarkExpired.push(session.id);
      }

      // Falls Geld eingegangen ist: Niemals stornieren/ablaufen lassen!
      if (received > 0) {
        latePaymentReviewList.push({
          sessionId: session.id,
          status: session.status,
          receivedAmount: received,
          orderIds: session.order_ids,
        });
        continue;
      }

      // Ziel-Status fuer die Bestellung
      const targetStatus = session.status === 'cancelled' ? 'cancelled' : 'expired';

      // Ermittle Order IDs (unterstuetzt sowohl Array als auch Postgres-Array String '{uuid,uuid}')
      let targetOrderIds = [];
      if (Array.isArray(session.order_ids)) {
        targetOrderIds.push(...session.order_ids.filter(Boolean));
      } else if (typeof session.order_ids === 'string') {
        const cleaned = session.order_ids.replace(/[{}"\s]/g, '');
        if (cleaned) {
          targetOrderIds.push(...cleaned.split(',').filter(Boolean));
        }
      }

      // Suche nach zugehoerigen Bestellungen
      let linkedOrders = [];
      if (targetOrderIds.length > 0) {
        const byIdRes = await client.query(`
          SELECT id, checkout_ref, status, customer_email, amount_eur
          FROM orders
          WHERE id = ANY($1::uuid[])
        `, [targetOrderIds]);
        linkedOrders.push(...byIdRes.rows);
      }

      // Suche zusaetzlich nach Bestellungen mit checkout_ref = session.id
      const byRefRes = await client.query(`
        SELECT id, checkout_ref, status, customer_email, amount_eur
        FROM orders
        WHERE checkout_ref = $1
      `, [session.id]);

      for (const ord of byRefRes.rows) {
        if (!linkedOrders.some(existing => existing.id === ord.id)) {
          linkedOrders.push(ord);
        }
      }

      for (const order of linkedOrders) {
        if (order.status === targetStatus) {
          alreadyCleanCount++;
          continue;
        }

        // Nicht ueberschreiben wenn abgeschlossen, bezahlt oder in manuelle Pruefung
        if (['completed', 'paid', 'provisioning', 'review'].includes(order.status)) {
          console.warn(`[WARNUNG] Ueberspringe Order ${order.id} mit Status '${order.status}' (Session ${session.id})`);
          continue;
        }

        const candidate = {
          orderId: order.id,
          customerEmail: order.customer_email,
          amountEur: order.amount_eur,
          currentStatus: order.status,
          targetStatus,
          sessionId: session.id,
        };

        if (targetStatus === 'cancelled') {
          ordersToCancel.push(candidate);
        } else {
          ordersToExpire.push(candidate);
        }
      }
    }

    console.log('\n--- DETAIL-UEBERSICHT DER GEFUNDENEN FAELLE ---');

    // Ausgabe der zu stornierenden Bestellungen
    console.log(`\nZu stornierende Bestellungen (cancelled) [${ordersToCancel.length}]:`);
    if (ordersToCancel.length === 0) {
      console.log('  Keine offenen Bestellungen fuer stornierte Sessions gefunden.');
    } else {
      for (const item of ordersToCancel) {
        console.log(`  - Order: ${item.orderId} | Kunde: ${item.customerEmail} | Betrag: €${item.amountEur} | Status: ${item.currentStatus} -> ${item.targetStatus} | Session: ${item.sessionId}`);
      }
    }

    // Ausgabe der abzulaufenden Bestellungen
    console.log(`\nZu ablaufende Bestellungen (expired) [${ordersToExpire.length}]:`);
    if (ordersToExpire.length === 0) {
      console.log('  Keine offenen Bestellungen fuer abgelaufene Sessions gefunden.');
    } else {
      for (const item of ordersToExpire) {
        console.log(`  - Order: ${item.orderId} | Kunde: ${item.customerEmail} | Betrag: €${item.amountEur} | Status: ${item.currentStatus} -> ${item.targetStatus} | Session: ${item.sessionId}`);
      }
    }

    // Ausgabe der Sessions mit Zahlungseingang (Manuelle Pruefung)
    console.log(`\nSessions mit Zahlungseingang (Manuelle Pruefung / NICHT angefasst) [${latePaymentReviewList.length}]:`);
    if (latePaymentReviewList.length === 0) {
      console.log('  Keine verspaeteten Zahlungen mit Geldeingang auf inaktiven Sessions vorhanden.');
    } else {
      for (const item of latePaymentReviewList) {
        console.log(`  - ⚠️ Session: ${item.sessionId} | Status: ${item.status} | Eingegangen: ${item.receivedAmount} Crypto | Order-IDs: ${JSON.stringify(item.orderIds)}`);
      }
    }

    // Falls ECHTLAUF: Updates in der Datenbank durchfuehren
    if (isExecute) {
      console.log('\n--- FUEHRE ECHTZEIT-UPDATES AUS ---');

      // Update past-due sessions to 'expired'
      if (sessionsToMarkExpired.length > 0) {
        await client.query(`
          UPDATE crypto_sessions
          SET status = 'expired', updated_at = NOW()
          WHERE id = ANY($1::uuid[])
        `, [sessionsToMarkExpired]);
        console.log(`✓ ${sessionsToMarkExpired.length} abgelaufene Sessions auf 'expired' gesetzt.`);
      }

      // Update orders to cancelled
      if (ordersToCancel.length > 0) {
        const cancelIds = ordersToCancel.map(o => o.orderId);
        await client.query(`
          UPDATE orders
          SET status = 'cancelled', updated_at = NOW()
          WHERE id = ANY($1::uuid[])
        `, [cancelIds]);
        console.log(`✓ ${ordersToCancel.length} Bestellungen erfolgreich auf 'cancelled' (storniert) gesetzt.`);
      }

      // Update orders to expired
      if (ordersToExpire.length > 0) {
        const expireIds = ordersToExpire.map(o => o.orderId);
        await client.query(`
          UPDATE orders
          SET status = 'expired', updated_at = NOW()
          WHERE id = ANY($1::uuid[])
        `, [expireIds]);
        console.log(`✓ ${ordersToExpire.length} Bestellungen erfolgreich auf 'expired' (abgelaufen) gesetzt.`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('ZUSAMMENFASSUNG:');
    console.log(`- Modus: ${isDryRun ? 'TROCKENLAUF (DRY-RUN)' : 'ECHTLAUF DURCHGEFUEHRT'}`);
    console.log(`- Bereit/Geaendert auf 'storniert' (cancelled): ${ordersToCancel.length}`);
    console.log(`- Bereit/Geaendert auf 'abgelaufen' (expired):   ${ordersToExpire.length}`);
    console.log(`- Bereits sauber im Zielstatus:                   ${alreadyCleanCount}`);
    console.log(`- Späte Zahlungen (Manuelle Prüfung geschützt):    ${latePaymentReviewList.length}`);
    console.log('='.repeat(70));

  } finally {
    client.release();
    await pool.end();
  }
}

runCleanup().catch(err => {
  console.error('Fataler Fehler bei der Bereinigung:', err);
  process.exit(1);
});
