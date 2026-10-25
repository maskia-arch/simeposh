import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { createServiceClient } from '@/lib/supabase/server';
import { sendTicketAdminAlertEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteParams {
  params: { id: string };
}

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const ticketId = params.id;

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createServiceClient();

    // 1. Fetch ticket
    const { data: ticket, error: ticketErr } = await db
      .from('support_tickets')
      .select('id, ticket_number, customer_email, customer_name, subject, category, status, priority, invoice_id, iccid, created_at, updated_at')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // 2. Validate email ownership strictly via session
    const userEmail = sessionUser.email.trim().toLowerCase();
    const ticketOwnerEmail = ticket.customer_email.trim().toLowerCase();

    if (userEmail !== ticketOwnerEmail) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // 3. Fetch message thread (excluding internal notes for customer view)
    const { data: messages, error: msgErr } = await db
      .from('ticket_messages')
      .select('id, ticket_id, sender_type, sender_email, sender_name, message, attachments, created_at')
      .eq('ticket_id', ticketId)
      .eq('is_internal_note', false)
      .order('created_at', { ascending: true });

    if (msgErr) {
      console.error('[Ticket Detail API] Error fetching messages:', msgErr);
    }

    return NextResponse.json({
      ticket,
      messages: messages ?? [],
    });
  } catch (err: any) {
    console.error('[Ticket Detail API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteParams) {
  try {
    const ticketId = params.id;
    const body = await request.json();
    const { message, attachments = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    if (!sessionUser || !sessionUser.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = createServiceClient();

    // Fetch ticket
    const { data: ticket, error: ticketErr } = await db
      .from('support_tickets')
      .select('id, ticket_number, customer_email, customer_name, subject, category, status, priority')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    if (ticket.status === 'closed') {
      return NextResponse.json({ error: 'Dieses Ticket ist geschlossen und kann nicht mehr beantwortet werden.' }, { status: 400 });
    }

    // Validate ownership strictly via session
    const userEmail = sessionUser.email.trim().toLowerCase();
    const ticketOwnerEmail = ticket.customer_email.trim().toLowerCase();

    if (userEmail !== ticketOwnerEmail) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const cleanMsg = message.trim();
    const senderName = sessionUser.fullName || sessionUser.user_metadata?.full_name || ticket.customer_name || 'Kunde';

    // Insert message
    const { data: newMsg, error: insertErr } = await db
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        sender_email: userEmail,
        sender_name: senderName,
        message: cleanMsg,
        attachments: Array.isArray(attachments) ? JSON.stringify(attachments) : null,
      })
      .select('id, ticket_id, sender_type, sender_email, sender_name, message, attachments, created_at')
      .single();

    if (insertErr) {
      console.error('[Ticket Reply Error]', insertErr);
      return NextResponse.json({ error: 'Nachricht konnte nicht gespeichert werden' }, { status: 500 });
    }

    // Update ticket status to customer_reply and update timestamp
    await db
      .from('support_tickets')
      .update({
        status: 'customer_reply',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    // Send admin notification
    try {
      await sendTicketAdminAlertEmail({
        ticketNumber: ticket.ticket_number,
        customerEmail: userEmail,
        customerName: senderName,
        subject: `[Antwort] ${ticket.subject}`,
        category: ticket.category,
        description: cleanMsg,
      });
    } catch (mailErr) {
      console.error('[Ticket Reply Admin Mail Error]', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (err: any) {
    console.error('[Ticket Reply Exception]', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
