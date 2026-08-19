import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { isUuid } from '@/lib/utils';

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

// POST: Submits new verified feedback for a purchase transaction
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rating = parseInt(body?.rating, 10);
    const comment = body?.comment ? String(body.comment).trim().slice(0, 2000) : null;
    const displayNameInput = body?.displayName ? String(body.displayName).trim().slice(0, 100) : 'Anonym';
    const orderIdentifier = (body?.orderId || body?.ref || '').trim();

    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Bitte gib eine Bewertung zwischen 1 und 5 Sternen ab.' }, { status: 400 });
    }
    if (!orderIdentifier) {
      return NextResponse.json({ error: 'Eine Transaktions- oder Bestellungs-ID ist erforderlich.' }, { status: 400 });
    }

    // 1. Look up the order either by ID (UUID) or by checkout_ref
    let orderRow: any = null;
    if (isUuid(orderIdentifier)) {
      const { rows } = await query(
        `SELECT id, customer_name, status, payment_confirmed_at, iccid, customer_email, created_at 
         FROM public.orders 
         WHERE id = $1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
    }

    if (!orderRow) {
      const { rows } = await query(
        `SELECT id, customer_name, status, payment_confirmed_at, iccid, customer_email, created_at 
         FROM public.orders 
         WHERE checkout_ref = $1 
         ORDER BY created_at DESC 
         LIMIT 1`,
        [orderIdentifier]
      );
      if (rows.length > 0) orderRow = rows[0];
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

    const realOrderId = orderRow.id;

    // 3. Prevent duplicate submissions for the same order
    const { rows: duplicateRows } = await query(
      'SELECT id FROM public.feedbacks WHERE order_id = $1',
      [realOrderId]
    );

    if (duplicateRows.length > 0) {
      return NextResponse.json({ error: 'Für diese Transaktion wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
    }

    let finalDisplayName = displayNameInput;
    if (!displayNameInput || displayNameInput.toLowerCase() === 'anonym' || displayNameInput.toLowerCase() === 'anonymous') {
      finalDisplayName = 'Anonym';
    }

    // The feedback timestamp reflects the actual purchase / transaction time
    const transactionTimestamp = orderRow.payment_confirmed_at || orderRow.created_at || new Date().toISOString();

    // 4. Insert verified feedback with transaction timestamp into database
    const { rows: insertRows } = await query(
      `INSERT INTO public.feedbacks (order_id, rating, comment, display_name, is_verified, created_at) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING id, rating, comment, display_name, is_verified, created_at`,
      [realOrderId, rating, comment, finalDisplayName, true, transactionTimestamp]
    );

    // 5. Mark the order as review_invited so no reminder email is sent 3 days later
    await query(
      'UPDATE public.orders SET review_invited = true WHERE id = $1',
      [realOrderId]
    );

    return NextResponse.json({
      success: true,
      feedback: insertRows[0],
    });
  } catch (err: any) {
    console.error('[POST /api/feedbacks] Error:', err.message);
    if (err.code === '23505') { // Postgres unique_violation
      return NextResponse.json({ error: 'Für diese Bestellung wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Fehler beim Speichern der Bewertung.' }, { status: 500 });
  }
}
