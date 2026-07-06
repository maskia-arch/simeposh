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

    let isVerified = false;
    let finalDisplayName = displayNameInput;

    // If orderId is provided, check if it's valid to mark the purchase as verified
    if (orderId) {
      const { rows: orderRows } = await query(
        'SELECT id, customer_name FROM public.orders WHERE id = $1',
        [orderId]
      );
      if (orderRows.length > 0) {
        isVerified = true;
        // If display name is not custom alias, we can default it or anonymize
        if (!displayNameInput || displayNameInput.toLowerCase() === 'anonym') {
          finalDisplayName = 'Anonym';
        }
      } else {
        // invalid orderId
        return NextResponse.json({ error: 'Ungültige Bestellungs-ID.' }, { status: 400 });
      }
    } else {
      // If not from an invitation email, it is not verified, but they can still leave a public review
      if (!displayNameInput) {
        finalDisplayName = 'Anonym';
      }
    }

    const { rows: insertRows } = await query(
      `INSERT INTO public.feedbacks (order_id, rating, comment, display_name, is_verified) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, rating, comment, display_name, is_verified, created_at`,
      [orderId, rating, comment, finalDisplayName, isVerified]
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
