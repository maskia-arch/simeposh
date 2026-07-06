import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET: Fetches approved/all reviews, average rating, and counts
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

// POST: Submits new feedback
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rating = parseInt(body?.rating, 10);
    const comment = body?.comment?.trim() || null;
    const displayNameInput = body?.displayName?.trim() || 'Anonym';
    const orderId = body?.orderId?.trim() || null;
    if (isNaN(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Bitte gib eine Bewertung zwischen 1 und 5 Sternen ab.' }, { status: 400 });
    }
    if (!orderId) {
      return NextResponse.json({ error: 'Eine Einladung (Bestellungs-ID) ist erforderlich.' }, { status: 400 });
    }

    // 1. Verify that the order exists and has an active eSIM
    const { rows: orderRows } = await query(
      `SELECT id, customer_name, status, iccid FROM public.orders WHERE id = $1`,
      [orderId]
    );

    if (orderRows.length === 0) {
      return NextResponse.json({ error: 'Ungültige Bestellungs-ID.' }, { status: 400 });
    }

    const order = orderRows[0];
    const isActive = order.status === 'completed' || order.status === 'provisioning' || !!order.iccid;

    if (!isActive) {
      return NextResponse.json({ error: 'Diese Bestellung besitzt noch keine aktive eSIM.' }, { status: 400 });
    }

    // 2. Check if feedback has already been submitted for this order
    const { rows: duplicateRows } = await query(
      'SELECT id FROM public.feedbacks WHERE order_id = $1',
      [orderId]
    );

    if (duplicateRows.length > 0) {
      return NextResponse.json({ error: 'Für diese Bestellung wurde bereits eine Bewertung abgegeben.' }, { status: 400 });
    }

    let finalDisplayName = displayNameInput;
    if (!displayNameInput || displayNameInput.toLowerCase() === 'anonym') {
      finalDisplayName = 'Anonym';
    }

    const { rows: insertRows } = await query(
      `INSERT INTO public.feedbacks (order_id, rating, comment, display_name, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, rating, comment, display_name, is_verified, created_at`,
      [orderId, rating, comment, finalDisplayName, true]
    );

    return NextResponse.json({
      success: true,
      feedback: insertRows[0],
    });
  } catch (err: any) {
    console.error('[POST /api/feedbacks] Error:', err.message);
    return NextResponse.json({ error: 'Fehler beim Speichern der Bewertung.' }, { status: 500 });
  }
}
