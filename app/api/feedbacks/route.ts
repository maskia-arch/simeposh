import { NextResponse } from 'next/server';
import { query, getPool } from '@/lib/db';
import { isUuid } from '@/lib/utils';
import {
  checkRateLimit,
  getClientIp,
  sanitizeText,
  sanitizeDisplayName,
  verifyOrderAuthorization,
} from '@/lib/feedback/security';
import { sendCashbackEarnedEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetches all approved reviews, average rating, and distribution stats
export async function GET() {
  try {
    const { rows: feedbacks } = await query(
      'SELECT id, rating, comment, display_name, is_verified, source, reply_text, replied_at, created_at FROM public.feedbacks ORDER BY created_at DESC'
    );

    // Calculate stats
    const totalCount = feedbacks.length;
    let sum = 0;
    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    feedbacks.forEach((f: any) => {
      sum += f.rating;
      if (distribution[f.rating] !== undefined) {
        distribution[f.rating]++;
      }
    });

    const averageRating = totalCount > 0 ? parseFloat((sum / totalCount).toFixed(1)) : 0;

    return NextResponse.json({
      success: true,
      feedbacks,
      stats: {
        totalCount,
        averageRating,
        distribution,
      },
    });
  } catch (err: any) {
    console.error('[GET /api/feedbacks] Error:', err.message);
    return NextResponse.json({ error: 'Fehler beim Laden der Bewertungen.' }, { status: 500 });
  }
}

// POST: Submits new verified and tamper-proof feedback for a purchase transaction
export async function POST(request: Request) {
  try {
    // 0. Anti-Spam / Anti-Flood Rate Limiting (max 5 submissions per 10 minutes per IP)
    const ip = getClientIp(request);
    const rateCheck = checkRateLimit(`post-feedback:${ip}`, 5, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Zu viele Bewertungen eingereicht. Bitte versuche es später noch einmal.' },
        { status: 429, headers: { 'Retry-After': String(rateCheck.resetInSeconds) } }
      );
    }

    const body = await request.json();
    const rawRating = Math.floor(Number(body?.rating));
    const comment = sanitizeText(body?.comment, 2000) || null;
    const displayNameInput = sanitizeDisplayName(body?.displayName, 'Anonym');
    const token = typeof body?.token === 'string' ? body.token.trim() : null;

    const rawOrderId = typeof body?.orderId === 'string' ? body.orderId.trim() : '';
    const rawRef = typeof body?.ref === 'string' ? body.ref.trim() : '';
    const rawInvoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId.trim() : '';
    const rawIccid = typeof body?.iccid === 'string' ? body.iccid.trim() : '';

    const orderIdentifier = rawOrderId || rawRef || rawInvoiceId || rawIccid;

    if (isNaN(rawRating) || rawRating < 1 || rawRating > 5) {
      return NextResponse.json({ error: 'Bitte gib eine Bewertung zwischen 1 und 5 Sternen ab.' }, { status: 400 });
    }
    if (!orderIdentifier) {
      return NextResponse.json({ error: 'Eine Transaktions- oder Bestellungs-ID ist erforderlich.' }, { status: 400 });
    }

    // 1. Look up the order: by direct order UUID, checkout_ref, crypto session UUID, or ICCID
    let orderRow: any = null;
    let hasCheckoutSessionProof = false;

    // 1a. By direct order UUID
    if (isUuid(orderIdentifier)) {
      const { rows } = await query(
        `SELECT id, customer_name, customer_email, user_id, status, payment_confirmed_at, iccid, amount_eur, locale, created_at 
         FROM public.orders 
         WHERE id = $1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
    }

    // 1b. By checkout_ref (session proof)
    if (!orderRow && rawRef) {
      const { rows } = await query(
        `SELECT id, customer_name, customer_email, user_id, status, payment_confirmed_at, iccid, amount_eur, locale, created_at 
         FROM public.orders 
         WHERE checkout_ref = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [rawRef]
      );
      if (rows.length > 0) {
        orderRow = rows[0];
        hasCheckoutSessionProof = true;
      }
    }

    // 1c. By crypto session UUID (invoiceId in overview links - session proof)
    if (!orderRow && rawInvoiceId && isUuid(rawInvoiceId)) {
      const { rows: sessionRows } = await query(
        'SELECT order_ids FROM public.crypto_sessions WHERE id = $1',
        [rawInvoiceId]
      );
      if (sessionRows.length > 0 && sessionRows[0].order_ids) {
        let orderIds: string[] = [];
        const rawIds = sessionRows[0].order_ids;
        if (Array.isArray(rawIds)) orderIds = rawIds;
        else if (typeof rawIds === 'string') {
          try {
            const parsed = JSON.parse(rawIds);
            orderIds = Array.isArray(parsed) ? parsed : [rawIds];
          } catch {
            orderIds = rawIds.replace(/[{}]/g, '').split(',').map((s: string) => s.trim().replace(/^"|"$/g, ''));
          }
        }
        const cleanIds = orderIds.filter(isUuid);
        if (cleanIds.length > 0) {
          const { rows } = await query(
            `SELECT id, customer_name, customer_email, user_id, status, payment_confirmed_at, iccid, amount_eur, locale, created_at 
             FROM public.orders 
             WHERE id = ANY($1::uuid[]) 
             ORDER BY created_at DESC 
             LIMIT 1`,
            [cleanIds]
          );
          if (rows.length > 0) {
            orderRow = rows[0];
            hasCheckoutSessionProof = true;
          }
        }
      }
    }

    // 1d. By ICCID
    if (!orderRow && rawIccid) {
      const { rows } = await query(
        `SELECT id, customer_name, customer_email, user_id, status, payment_confirmed_at, iccid, amount_eur, locale, created_at 
         FROM public.orders 
         WHERE iccid = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [rawIccid]
      );
      if (rows.length > 0) {
        orderRow = rows[0];
        hasCheckoutSessionProof = true;
      }
    }

    if (!orderRow) {
      return NextResponse.json({ error: 'Ungültige Bestellungs- oder Transaktions-ID.' }, { status: 404 });
    }

    // 2. Validate that the order is a paid / completed transaction
    const isPaid = ['completed', 'paid', 'provisioning'].includes(orderRow.status) || 
                   !!orderRow.payment_confirmed_at || 
                   !!orderRow.iccid;

    if (!isPaid) {
      return NextResponse.json({ error: 'Nur bezahlte Bestellungen sind für eine Bewertung berechtigt.' }, { status: 400 });
    }

    // 3. Cryptographic Tamper-Proofing & Multi-Factor Authorization Check
    const authCheck = await verifyOrderAuthorization(orderRow, {
      token,
      hasCheckoutSessionProof,
    });

    if (!authCheck.authorized) {
      return NextResponse.json({
        error: authCheck.reason || 'Zugriff verweigert: Bitte nutze den persönlichen Bewertungslink aus deiner E-Mail.',
      }, { status: 403 });
    }

    const realOrderId = orderRow.id;
    const orderAmount = Math.max(0, Number(orderRow.amount_eur) || 0);
    // 1% eSIM Cash of the total order sum (rounded to 2 decimal places)
    const cashbackAmount = Math.round(orderAmount * 0.01 * 100) / 100;

    // 4. Atomic Transaction with Row Locking to guarantee exactly 1 review per purchase
    const pool = getPool();
    const client = await pool.connect();
    let updatedBalance = 0;

    try {
      await client.query('BEGIN');

      // Lock order row for update
      await client.query(
        'SELECT id FROM public.orders WHERE id = $1 FOR UPDATE',
        [realOrderId]
      );

      // Check duplicate within the locked transaction
      const { rows: duplicateRows } = await client.query(
        'SELECT id FROM public.feedbacks WHERE order_id = $1',
        [realOrderId]
      );

      if (duplicateRows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Für diese Transaktion wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
      }

      // Insert verified feedback with current timestamp (NOW()) and 1% cashback reward
      const { rows: insertRows } = await client.query(
        `INSERT INTO public.feedbacks (order_id, rating, comment, display_name, is_verified, cashback_reward_eur, created_at) 
         VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
         RETURNING id, rating, comment, display_name, is_verified, cashback_reward_eur, created_at`,
        [realOrderId, rawRating, comment, displayNameInput, true, cashbackAmount]
      );

      // Automatically credit 1% eSIM Cash to the customer account if cashbackAmount > 0
      if (cashbackAmount > 0 && orderRow.customer_email && orderRow.customer_email.trim()) {
        const cleanEmail = orderRow.customer_email.trim().toLowerCase();
        const affiliateCode = 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase();

        const { rows: accountRows } = await client.query(
          `INSERT INTO public.esim_cash_accounts (email, user_id, balance_eur, total_spend_eur, affiliate_code, created_at, updated_at)
           VALUES ($1, $2, $3, 0.00, $4, NOW(), NOW())
           ON CONFLICT (email) 
           DO UPDATE SET 
             balance_eur = public.esim_cash_accounts.balance_eur + $3,
             user_id = COALESCE(public.esim_cash_accounts.user_id, EXCLUDED.user_id),
             updated_at = NOW()
           RETURNING balance_eur`,
          [cleanEmail, orderRow.user_id || null, cashbackAmount, affiliateCode]
        );

        if (accountRows.length > 0) {
          updatedBalance = Number(accountRows[0].balance_eur);
        }

        const shortOrderId = realOrderId.slice(0, 8).toUpperCase();
        await client.query(
          `INSERT INTO public.esim_cash_transactions (email, user_id, amount, type, description, created_at)
           VALUES ($1, $2, $3, 'earn', $4, NOW())`,
          [
            cleanEmail,
            orderRow.user_id || null,
            cashbackAmount,
            `1% eSIM Cash Belohnung für Kaufbewertung (#${shortOrderId})`,
          ]
        );
      }

      // Mark this specific order as review_invited = true so no reminder email is sent for it.
      // Other or future orders of the customer remain independently reviewable and eligible.
      await client.query(
        'UPDATE public.orders SET review_invited = true WHERE id = $1',
        [realOrderId]
      );

      await client.query('COMMIT');

      // Asynchronously notify customer about earned 1% eSIM Cash
      if (cashbackAmount > 0 && orderRow.customer_email) {
        sendCashbackEarnedEmail({
          to: orderRow.customer_email.trim().toLowerCase(),
          earnedEur: cashbackAmount,
          newBalanceEur: updatedBalance,
          rank: 'Member',
          orderId: realOrderId,
          locale: orderRow.locale || 'de',
        }).catch((emailErr) => {
          console.warn('[POST /api/feedbacks] Notice: Cashback email notification could not be sent:', emailErr.message);
        });
      }

      return NextResponse.json({
        success: true,
        feedback: insertRows[0],
        cashbackEarned: cashbackAmount,
        newBalance: updatedBalance,
      });
    } catch (txErr: any) {
      await client.query('ROLLBACK');
      if (txErr.code === '23505') { // Postgres unique_violation
        return NextResponse.json({ error: 'Für diese Bestellung wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
      }
      throw txErr;
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('[POST /api/feedbacks] Error:', err.message);
    return NextResponse.json({ error: 'Fehler beim Speichern der Bewertung.' }, { status: 500 });
  }
}
