import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendGenericEmail } from '@/lib/email/mailer';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function handleInvite(request: Request) {
  // 1. Secure authorization check (Bearer SHOP_WEBHOOK_SECRET)
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.SHOP_WEBHOOK_SECRET;

  if (!expectedSecret) {
    console.error('[CRON Invite Feedbacks] SHOP_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Internal configuration error.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  try {
    // 2. Query completed orders with active eSIMs that haven't been invited yet
    const { rows: orders } = await query(
      `SELECT id, customer_email, customer_name, iccid 
       FROM public.orders 
       WHERE (status = 'completed' OR iccid IS NOT NULL) AND review_invited = false 
       LIMIT 50`
    );

    if (orders.length === 0) {
      return NextResponse.json({ success: true, message: 'Keine ausstehenden Einladungen gefunden.' });
    }

    console.log(`[CRON Invite Feedbacks] Found ${orders.length} orders to invite.`);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

    // 3. Loop and send emails
    for (const order of orders) {
      const inviteLink = `${appUrl.replace(/\/$/, '')}/reviews/new?orderId=${order.id}`;
      const customerName = order.customer_name || 'Kunde';

      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0f172a; margin-bottom: 16px;">✨ Wie war deine Erfahrung mit PureSim?</h2>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">Hallo ${customerName},</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            deine eSIM ist jetzt aktiv! Wir hoffen, du genießt deine Reise mit schneller und zuverlässiger Internetverbindung.
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5;">
            Deine Meinung ist uns sehr wichtig. Bitte nimm dir kurz eine Minute Zeit, um deinen Kauf bei uns zu bewerten. Dein Feedback hilft uns, unseren Service stetig zu verbessern.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" target="_blank" style="background-color: #2563eb; color: #ffffff; padding: 14px 28px; font-weight: bold; border-radius: 8px; text-decoration: none; display: inline-block; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">
              Jetzt Bewertung abgeben ⭐⭐⭐⭐⭐
            </a>
          </div>
          <p style="color: #475569; font-size: 13px; line-height: 1.5;">
            Als verifizierter Käufer wird deine Bewertung mit dem Label <strong>"Verifizierter Kauf"</strong> hervorgehoben.
          </p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #94a3b8; font-size: 11px; line-height: 1.4;">
            Diese Einladung senden wir nur einmalig an Käufer mit einer aktiven eSIM. Wenn du keine weiteren E-Mails erhalten möchtest, kannst du diese Nachricht einfach ignorieren.
          </p>
        </div>
      `;

      const text = `
Hallo ${customerName},

deine eSIM ist jetzt aktiv! Wir hoffen, du genießt deine Reise mit schneller und zuverlässiger Internetverbindung.

Deine Meinung ist uns sehr wichtig. Bitte nimm dir kurz eine Minute Zeit, um deinen Kauf bei uns zu bewerten. Dein Feedback hilft uns, unseren Service stetig zu verbessern.

Als verifizierter Käufer wird deine Bewertung mit dem Label "Verifizierter Kauf" hervorgehoben.

Jetzt Bewertung abgeben:
${inviteLink}

Diese Einladung senden wir nur einmalig an Käufer mit einer aktiven eSIM.
      `.trim();

      try {
        await sendGenericEmail({
          to: order.customer_email,
          subject: '✨ Wie war deine Erfahrung mit PureSim?',
          html,
          text
        });

        // 4. Mark order as review_invited in database
        await query(
          'UPDATE public.orders SET review_invited = true WHERE id = $1',
          [order.id]
        );
      } catch (emailErr: any) {
        console.error(`[CRON Invite Feedbacks] Failed to send email to ${order.customer_email}:`, emailErr.message);
      }
    }

    return NextResponse.json({
      success: true,
      message: `${orders.length} Einladungen wurden erfolgreich verarbeitet.`
    });
  } catch (err: any) {
    console.error('[CRON Invite Feedbacks] Error:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return handleInvite(request);
}

export async function POST(request: Request) {
  return handleInvite(request);
}
