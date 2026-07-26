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
    const { searchParams } = new URL(request.url);
    const queryEmail = searchParams.get('email');

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    const db = createServiceClient();

    // 1. Fetch ticket
    const { data: ticket, error: ticketErr } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // 2. Validate email ownership
    const userEmail = sessionUser?.email?.trim().toLowerCase();
    const reqEmail = queryEmail?.trim().toLowerCase();
    const ticketOwnerEmail = ticket.customer_email.trim().toLowerCase();

    if (userEmail !== ticketOwnerEmail && reqEmail !== ticketOwnerEmail) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    // 3. Fetch message thread (excluding internal notes for customer view)
    const { data: messages, error: msgErr } = await db
      .from('ticket_messages')
      .select('*')
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
    const { message, email, attachments = [] } = body;

    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Nachricht darf nicht leer sein' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    const db = createServiceClient();

    // Fetch ticket
    const { data: ticket, error: ticketErr } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (ticketErr || !ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    // Validate ownership
    const userEmail = sessionUser?.email?.trim().toLowerCase();
    const reqEmail = email?.trim().toLowerCase();
    const ticketOwnerEmail = ticket.customer_email.trim().toLowerCase();

    if (userEmail !== ticketOwnerEmail && reqEmail !== ticketOwnerEmail) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    const cleanMsg = message.trim();
    const senderName = sessionUser?.user_metadata?.full_name || ticket.customer_name || 'Kunde';

    // Insert message
    const { data: newMsg, error: insertErr } = await db
      .from('ticket_messages')
      .insert({
        ticket_id: ticketId,
        sender_type: 'customer',
        sender_email: ticketOwnerEmail,
        sender_name: senderName,
        message: cleanMsg,
        is_internal_note: false,
        attachments: Array.isArray(attachments) ? attachments : [],
      })
      .select('*')
      .single();

    if (insertErr || !newMsg) {
      console.error('[Ticket Reply API] DB Error:', insertErr);
      return NextResponse.json({ error: 'Antwort konnte nicht gespeichert werden' }, { status: 500 });
    }

    // Update ticket status to customer_reply and update timestamp
    await db
      .from('support_tickets')
      .update({
        status: 'customer_reply',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ticketId);

    // Notify admin
    sendTicketAdminAlertEmail({
      ticketNumber: ticket.ticket_number,
      customerEmail: ticketOwnerEmail,
      customerName: senderName,
      subject: `Re: ${ticket.subject}`,
      category: ticket.category,
      description: cleanMsg,
      invoiceId: ticket.invoice_id || undefined,
      iccid: ticket.iccid || undefined,
    }).catch((err) => console.error('[Ticket Reply API] Email notify error:', err));

    return NextResponse.json({
      success: true,
      message: newMsg,
    });
  } catch (err: any) {
    console.error('[Ticket Reply API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const ticketId = params.id;
    const body = await request.json();
    const { action, email } = body;

    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;

    const db = createServiceClient();

    const { data: ticket } = await db
      .from('support_tickets')
      .select('*')
      .eq('id', ticketId)
      .single();

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket nicht gefunden' }, { status: 404 });
    }

    const userEmail = sessionUser?.email?.trim().toLowerCase();
    const reqEmail = email?.trim().toLowerCase();
    const ticketOwnerEmail = ticket.customer_email.trim().toLowerCase();

    if (userEmail !== ticketOwnerEmail && reqEmail !== ticketOwnerEmail) {
      return NextResponse.json({ error: 'Zugriff verweigert' }, { status: 403 });
    }

    if (action === 'close') {
      await db
        .from('support_tickets')
        .update({
          status: 'closed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', ticketId);

      return NextResponse.json({ success: true, status: 'closed' });
    }

    return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
