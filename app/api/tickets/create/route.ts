import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJwt } from '@/lib/auth/jwt';
import { createServiceClient } from '@/lib/supabase/server';
import { sendTicketCreatedEmail, sendTicketAdminAlertEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      email,
      name,
      subject,
      category = 'general',
      description,
      invoiceId,
      iccid,
      attachments = [],
    } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Gültige E-Mail-Adresse erforderlich' }, { status: 400 });
    }
    if (!subject || typeof subject !== 'string' || !subject.trim()) {
      return NextResponse.json({ error: 'Betreff ist erforderlich' }, { status: 400 });
    }
    if (!description || typeof description !== 'string' || !description.trim()) {
      return NextResponse.json({ error: 'Beschreibung ist erforderlich' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name ? String(name).trim() : null;
    const cleanSubject = String(subject).trim();
    const cleanCategory = String(category).trim();
    const cleanDesc = String(description).trim();
    const cleanInvoiceId = invoiceId ? String(invoiceId).trim() : null;
    const cleanIccid = iccid ? String(iccid).trim() : null;

    // Check if customer is authenticated
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;
    const sessionUser = token ? await verifyJwt(token) : null;
    const userId = sessionUser ? sessionUser.id : null;

    const db = createServiceClient();

    // 1. Create support ticket row
    const { data: ticket, error: ticketError } = await db
      .from('support_tickets')
      .insert({
        user_id: userId,
        customer_email: cleanEmail,
        customer_name: cleanName,
        subject: cleanSubject,
        category: cleanCategory,
        status: 'open',
        priority: 'medium',
        invoice_id: cleanInvoiceId,
        iccid: cleanIccid,
      })
      .select('*')
      .single();

    if (ticketError || !ticket) {
      console.error('[Ticket Create API] DB Error:', ticketError);
      return NextResponse.json({ error: 'Ticket konnte nicht erstellt werden' }, { status: 500 });
    }

    // 2. Create initial ticket message row
    const { error: msgError } = await db
      .from('ticket_messages')
      .insert({
        ticket_id: ticket.id,
        sender_type: 'customer',
        sender_email: cleanEmail,
        sender_name: cleanName,
        message: cleanDesc,
        is_internal_note: false,
        attachments: JSON.stringify(Array.isArray(attachments) ? attachments : []),
      });

    if (msgError) {
      console.error('[Ticket Create API] Message DB Error:', msgError);
    }

    // 3. Dispatch customer confirmation email asynchronously (no admin alert email)
    sendTicketCreatedEmail({
      ticketNumber: ticket.ticket_number,
      customerEmail: cleanEmail,
      customerName: cleanName || undefined,
      subject: cleanSubject,
      category: cleanCategory,
      description: cleanDesc,
      invoiceId: cleanInvoiceId || undefined,
      iccid: cleanIccid || undefined,
    }).catch((err) => console.error('[Ticket Create API] Email error:', err));

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticket_number: ticket.ticket_number,
        status: ticket.status,
        created_at: ticket.created_at,
      },
    });
  } catch (err: any) {
    console.error('[Ticket Create API] Exception:', err);
    return NextResponse.json({ error: err.message || 'Serverfehler' }, { status: 500 });
  }
}
