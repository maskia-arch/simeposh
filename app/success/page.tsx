import type { Metadata } from 'next';
import Link from 'next/link';
import { createServiceClient } from '@/lib/supabase/server';
import { formatEur, formatGb } from '@/lib/utils';
import { CountryFlag } from '@/components/CountryFlag';
import { ShieldIcon, HourglassIcon, SearchIcon, GlobeIcon } from '@/components/Icons';

export const metadata: Metadata = { title: 'Bestellung erfolgreich' };

// Never cache this page
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type OrderRow = any;

async function getOrders(ids: string[]): Promise<OrderRow[]> {
  if (ids.length === 0) return [];
  const supabase = createServiceClient();
  const { data } = await supabase
    .from('orders')
    .select('*, tariffs(*)')
    .in('id', ids)
    .in('status', ['completed', 'provisioning', 'paid']);
  return data ?? [];
}

function OrderCard({ order }: { order: OrderRow }) {
  const tariff = order.tariffs;
  const isCompleted = order.status === 'completed';

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6">
      {tariff && (
        <div className="mb-4 flex items-center gap-3">
          {tariff.country_code ? (
            <CountryFlag countryCode={tariff.country_code} countryName={tariff.country_name} size={32} className="shrink-0" />
          ) : (
            <GlobeIcon size={24} className="text-slate-400" />
          )}
          <div>
            <p className="font-semibold text-slate-800">{tariff.country_name}</p>
            <p className="text-xs text-slate-500">{tariff.name}</p>
          </div>
          <span className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium flex items-center gap-1.5 ${isCompleted ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {isCompleted ? (
              <>
                <ShieldIcon size={12} className="text-green-700" />
                <span>Bereit</span>
              </>
            ) : (
              <>
                <HourglassIcon size={12} className="text-amber-700" />
                <span>In Arbeit</span>
              </>
            )}
          </span>
        </div>
      )}

      {tariff && (
        <div className="mb-4 grid grid-cols-3 gap-3 text-sm">
          <div><p className="text-slate-500">Daten</p><p className="font-medium">{formatGb(tariff.data_gb)}</p></div>
          <div><p className="text-slate-500">Gültigkeit</p><p className="font-medium">{tariff.validity_days} Tage</p></div>
          <div><p className="text-slate-500">Bezahlt</p><p className="font-medium">{formatEur(order.amount_eur)}</p></div>
        </div>
      )}

      {isCompleted && order.iccid && (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
          {order.qr_code_url && (
            <div className="mb-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={order.qr_code_url} alt="eSIM QR-Code" width={160} height={160} className="rounded-lg" />
            </div>
          )}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">ICCID</span><span className="font-mono text-xs">{order.iccid}</span></div>
            {order.activation_code && (
              <div className="flex justify-between"><span className="text-slate-500">Aktivierungscode</span><span className="font-mono text-xs">{order.activation_code}</span></div>
            )}
            {order.apn && (
              <div className="flex justify-between"><span className="text-slate-500">APN</span><span className="font-mono text-xs">{order.apn}</span></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; orders?: string }>;
}) {
  const params = await searchParams;
  const ids = (params.orders ?? params.order ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const orders = await getOrders(ids);

  if (orders.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <div className="flex justify-center mb-4">
          <SearchIcon size={48} className="text-slate-300" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Bestellung wird bearbeitet</h1>
        <p className="text-slate-500 mb-6">
          Deine Bestellung wird gerade verarbeitet. Schau in deine E-Mails – du bekommst alle eSIM-Details und QR-Codes dorthin.
        </p>
        <Link href="/" className="rounded-xl bg-brand-600 px-6 py-3 text-white font-semibold hover:bg-brand-700 transition-colors">
          Zurück zur Startseite
        </Link>
      </div>
    );
  }

  const allCompleted = orders.every((o) => o.status === 'completed');
  const totalPaid = orders.reduce((s, o) => s + (o.amount_eur ?? 0), 0);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Status banner */}
      <div className={`mb-8 rounded-2xl p-6 text-center ${allCompleted ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
        <div className="flex justify-center mb-3">
          {allCompleted ? (
            <ShieldIcon size={48} className="text-green-600" />
          ) : (
            <HourglassIcon size={48} className="text-amber-500" />
          )}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {allCompleted
            ? (orders.length > 1 ? `${orders.length} eSIMs bereit!` : 'eSIM bereit!')
            : 'Zahlung bestätigt – eSIMs werden bereitgestellt…'}
        </h1>
        <p className="text-slate-600 text-sm">
          {allCompleted
            ? 'Alle Details wurden auch per E-Mail versendet.'
            : 'Deine eSIMs werden gerade vorbereitet. Du bekommst eine E-Mail, sobald sie bereit sind.'}
        </p>
        {orders.length > 1 && (
          <p className="mt-2 text-sm font-semibold text-slate-700">Gesamt bezahlt: {formatEur(totalPaid)}</p>
        )}
      </div>

      {/* Order cards */}
      <div className="space-y-4 mb-8">
        {orders.map((o) => <OrderCard key={o.id} order={o} />)}
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Link href="/dashboard" className="rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors">
          Zu meinen Bestellungen
        </Link>
        <Link href="/tariffs" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
          Weitere eSIMs kaufen
        </Link>
      </div>
    </div>
  );
}
