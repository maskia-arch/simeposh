import type { Metadata }      from 'next';
import { notFound, redirect } from 'next/navigation';
import Link                    from 'next/link';
import { createClient }        from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';

import { getEsimOverviewUrl } from '@/lib/url';
import { generateFeedbackToken } from '@/lib/feedback/token';

export const metadata: Metadata = { title: 'Bestelldetails' };
export const dynamic = 'force-dynamic';

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const service = createServiceClient();
  const { data: order } = await service
    .from('orders')
    .select('*, tariffs(*)')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (!order) notFound();

  const tariff = (order as any).tariffs;

  // Construct personal installation URL for esim.puresim.net
  const txId = (order as any).checkout_ref || order.id;
  const installUrl = order.iccid ? getEsimOverviewUrl(txId, order.iccid) : null;
  const isPaid = ['completed', 'paid', 'provisioning'].includes(order.status) || !!order.payment_confirmed_at || !!order.iccid;
  let existingFeedback: { id: string; rating: number; created_at: string } | null = null;
  if (isPaid) {
    try {
      const { data: fb } = await (service.from('feedbacks' as any))
        .select('id, rating, created_at')
        .eq('order_id', order.id)
        .maybeSingle();
      existingFeedback = fb as any;
    } catch (fbErr) {
      console.error('[OrderDetailPage] feedback query error:', fbErr);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-6 flex items-center gap-2">
        <Link href="/dashboard" className="text-sm font-medium text-brand-600 hover:text-brand-800">
          ← Mein Bereich
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-slate-900 mb-6">Bestelldetails</h1>

      {/* Primary Action Banner: Link to personal installation page on esim.puresim.net */}
      {installUrl && (
        <div className="mb-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl relative overflow-hidden">
          <div className="flex items-center gap-2 mb-3">
            <span className="rounded-full bg-brand-500/20 border border-brand-400/30 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-300">
              📱 Interaktive eSIM Einrichtungsseite
            </span>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">Installation &amp; Datenverbrauch</h2>
          <p className="mt-2 text-xs text-slate-300 leading-relaxed max-w-md">
            Die QR-Code Aktivierung, 1-Click automatische Installation, der Live-Datenverbrauch ("Check Usage") sowie die manuellen Zugangsdaten befinden sich auf deiner persönlichen Einrichtungsseite.
          </p>

          <div className="mt-5">
            <a
              href={installUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 active:bg-brand-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-brand-600/25 transition-all cursor-pointer"
            >
              <span>Einrichtungsseite aufrufen</span>
              <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>
      )}

      {/* Tariff & Order Specs */}
      {tariff && (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">{tariff.flag_emoji ?? '🌐'}</span>
            <div>
              <p className="font-bold text-slate-800">{tariff.country_name}</p>
              <p className="text-sm text-slate-500">{tariff.name}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><p className="text-slate-500">Daten</p><p className="font-medium text-slate-800">{formatGb(tariff.data_gb)}</p></div>
            <div><p className="text-slate-500">Gültigkeit</p><p className="font-medium text-slate-800">{tariff.validity_days} Tage</p></div>
            <div><p className="text-slate-500">Bezahlt</p><p className="font-medium text-slate-800">{formatEur(order.amount_eur)}</p></div>
            <div><p className="text-slate-500">Status</p><p className="font-medium capitalize text-slate-800">{order.status}</p></div>
            {order.iccid && (
              <div className="col-span-2 pt-2 border-t border-slate-100">
                <p className="text-slate-500">ICCID</p>
                <p className="font-mono text-xs text-slate-800 break-all">{order.iccid}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Verified Feedback CTA Banner */}
      {existingFeedback ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-emerald-800 text-sm flex items-center gap-1.5">
              <span>✓</span> Du hast diesen Kauf bewertet ({existingFeedback.rating} ★)
            </p>
            <p className="text-xs text-emerald-600 mt-0.5">Vielen Dank für dein Feedback zu dieser Bestellung!</p>
          </div>
          <Link href="/reviews" className="rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition-colors shrink-0">
            Reviews ansehen
          </Link>
        </div>
      ) : isPaid ? (
        <div className="mb-6 rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-amber-50/60 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-950 bg-amber-200/90 border border-amber-300 px-2 py-0.5 rounded-full">
                🎁 1% eSIM Cash Belohnung
              </span>
              <span className="text-amber-500 text-xs">★ ★ ★ ★ ★</span>
            </div>
            <p className="font-bold text-slate-800 text-sm">Wie zufrieden bist du mit deiner eSIM?</p>
            <p className="text-xs text-slate-600 mt-0.5">
              Teile deine Erfahrung in 1 Minute und erhalte {((Number(order.amount_eur) || 0) * 0.01).toFixed(2).replace('.', ',')} € (1%) direkt als eSIM Cash auf dein Guthabenkonto gutgeschrieben!
            </p>
          </div>
          <Link
            href={`/reviews/new?orderId=${order.id}&token=${generateFeedbackToken(order.id, order.customer_email)}`}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-bold text-xs px-4 py-2.5 shadow-sm transition-all shrink-0 hover:shadow-md active:scale-95"
          >
            <span>⭐</span> Jetzt bewerten (+1% Cash)
          </Link>
        </div>
      ) : null}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {order.iccid && (
          <Link
            href={`/topup?iccid=${order.iccid}`}
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            📶 eSIM aufladen
          </Link>
        )}
        <Link
          href="/tariffs"
          className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Neue eSIM kaufen
        </Link>
      </div>
    </div>
  );
}
