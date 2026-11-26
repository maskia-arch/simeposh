import { NextResponse } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { getReconciledUserCashAccount } from '@/lib/esim-cash';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const userClient = await createClient();
    const { data: { user } } = await userClient.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Anmeldung erforderlich' }, { status: 401 });
    }

    const body = await request.json() as { customCode?: string };
    const customCode = body.customCode?.trim();

    if (!customCode) {
      return NextResponse.json({ error: 'Code darf nicht leer sein' }, { status: 400 });
    }

    const code = customCode.toUpperCase();

    // Regex check: 3-20 chars, alphanumeric, dashes, underscores
    const codeRegex = /^[A-Z0-9_-]{3,20}$/;
    if (!codeRegex.test(code)) {
      return NextResponse.json({
        error: 'Ungültiger Code. Erlaubt sind 3-20 Zeichen (nur Großbuchstaben, Zahlen, Bindestrich und Unterstrich).'
      }, { status: 400 });
    }

    const service = createServiceClient();
    const cashAcc = await getReconciledUserCashAccount(user.id, user.email || '', { createIfMissing: true });
    if (!cashAcc) {
      return NextResponse.json({ error: 'eSIM Cash Konto nicht gefunden' }, { status: 404 });
    }

    // Check uniqueness across all accounts
    const { data: existing } = await service
      .from('esim_cash_accounts')
      .select('id, user_id')
      .eq('affiliate_code', code)
      .maybeSingle();

    if (existing) {
      if (existing.id !== cashAcc.id && existing.user_id !== user.id) {
        return NextResponse.json({ error: 'Dieser Code ist bereits vergeben' }, { status: 400 });
      }
      // Already belongs to the current user, just return success
      return NextResponse.json({ ok: true, code });
    }

    // Update user's code by reconciled account ID
    const { error: updateErr } = await service
      .from('esim_cash_accounts')
      .update({ affiliate_code: code })
      .eq('id', cashAcc.id);

    if (updateErr) {
      console.error('[update-code] db update error:', updateErr.message);
      return NextResponse.json({ error: 'Code konnte nicht aktualisiert werden' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, code });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[update-code] error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
