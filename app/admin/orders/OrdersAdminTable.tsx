'use client';

import { useState, useMemo } from 'react';
import { formatEur } from '@/lib/utils';

type OrderStatus = 'pending' | 'paid' | 'provisioning' | 'completed' | 'failed' | 'refunded';

interface Order {
  id:                  string;
  status:              OrderStatus;
  order_type:          string;
  customer_email:      string;
  customer_name:       string | null;
  amount_eur:          number;
  iccid:               string | null;
  top_up_iccid:        string | null;
  error_message:       string | null;
  sellauth_order_id:   string | null;
  payment_confirmed_at: string | null;
  created_at:          string;
  checkout_ref:        string | null;
  tariffs:             { name: string; country_name: string; flag_emoji: string | null; data_gb: number | null; validity_days: number } | null;
}

const STATUS_COLOR: Record<string, string> = {
  completed:    'bg-green-100 text-green-700',
  paid:         'bg-amber-100 text-amber-700',
  provisioning: 'bg-blue-100 text-blue-700',
  pending:      'bg-slate-100 text-slate-600',
  failed:       'bg-red-100 text-red-700',
  refunded:     'bg-purple-100 text-purple-700',
};
const STATUS_LABEL: Record<string, string> = {
  completed: 'Abgeschlossen', paid: 'Bezahlt', provisioning: 'In Arbeit',
  pending: 'Ausstehend', failed: 'Fehlgeschlagen', refunded: 'Erstattet',
};
const ALL_STATUSES: OrderStatus[] = ['pending','paid','provisioning','completed','failed','refunded'];

function getGroupStatus(orders: Order[]): OrderStatus {
  if (orders.some((o) => o.status === 'failed')) return 'failed';
  if (orders.some((o) => o.status === 'provisioning')) return 'provisioning';
  if (orders.some((o) => o.status === 'paid')) return 'paid';
  if (orders.some((o) => o.status === 'pending')) return 'pending';
  if (orders.some((o) => o.status === 'refunded')) return 'refunded';
  return 'completed';
}

export function OrdersAdminTable({ orders: initial }: { orders: Order[] }) {
  const [orders,    setOrders]    = useState(initial);
  const [search,    setSearch]    = useState('');
  const [filter,    setFilter]    = useState<OrderStatus | 'all'>('all');
  const [updating,  setUpdating]  = useState<string | null>(null);
  const [expanded,  setExpanded]  = useState<string | null>(null);

  // Group orders by checkout_ref (fallback to order id if ref is null)
  const groupedOrders = useMemo(() => {
    const groups: Record<string, Order[]> = {};
    for (const o of orders) {
      const ref = o.checkout_ref || o.id;
      if (!groups[ref]) groups[ref] = [];
      groups[ref].push(o);
    }

    return Object.entries(groups).map(([ref, items]) => {
      const first = items[0];
      const amount_eur_total = items.reduce((sum, item) => sum + Number(item.amount_eur), 0);
      return {
        checkout_ref: ref,
        customer_email: first.customer_email,
        customer_name: first.customer_name,
        created_at: first.created_at,
        payment_confirmed_at: first.payment_confirmed_at,
        sellauth_order_id: first.sellauth_order_id,
        amount_eur_total,
        status: getGroupStatus(items),
        orders: items,
      };
    }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const filtered = useMemo(() => {
    return groupedOrders.filter((g) => {
      const matchSearch = search === '' ||
        g.customer_email.toLowerCase().includes(search.toLowerCase()) ||
        g.checkout_ref.includes(search) ||
        g.orders.some(o => o.id.includes(search) || (o.iccid ?? '').includes(search) || (o.tariffs?.country_name ?? '').toLowerCase().includes(search.toLowerCase()));
      const matchFilter = filter === 'all' || g.status === filter;
      return matchSearch && matchFilter;
    });
  }, [groupedOrders, search, filter]);

  async function updateGroupStatus(group: typeof groupedOrders[0], newStatus: OrderStatus) {
    setUpdating(group.checkout_ref);
    try {
      const promises = group.orders.map((o) =>
        fetch(`/api/admin/orders/${o.id}`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ status: newStatus }),
        })
      );
      await Promise.all(promises);
      setOrders((prev) =>
        prev.map((o) =>
          group.orders.some((go) => go.id === o.id) ? { ...o, status: newStatus } : o
        )
      );
    } catch (err) {
      console.error('Failed to update group status:', err);
    } finally {
      setUpdating(null);
    }
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
      }
    } finally {
      setUpdating(null);
    }
  }

  async function deleteOrder(orderId: string) {
    if (!confirm('Möchtest du diese eSIM-Bestellung wirklich unwiderruflich löschen?')) return;
    setUpdating(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        alert('Fehler beim Löschen der Bestellung.');
      }
    } catch {
      alert('Fehler beim Löschen.');
    } finally {
      setUpdating(null);
    }
  }

  async function deleteGroup(group: typeof groupedOrders[0]) {
    if (!confirm(`Möchtest du diese gesamte Transaktion (${group.orders.length} Bestellung/en) wirklich löschen?`)) return;
    setUpdating(group.checkout_ref);
    try {
      const promises = group.orders.map((o) =>
        fetch(`/api/admin/orders/${o.id}`, { method: 'DELETE' })
      );
      await Promise.all(promises);
      setOrders((prev) => prev.filter((o) => !group.orders.some((go) => go.id === o.id)));
      if (expanded === group.checkout_ref) setExpanded(null);
    } catch {
      alert('Fehler beim Löschen der Gruppe.');
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div>
      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          type="search"
          placeholder="E-Mail, Bestell-ID, ICCID oder Land…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as OrderStatus | 'all')}
          className="rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-brand-500"
        >
          <option value="all">Alle Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        <p className="text-xs text-slate-400 whitespace-nowrap">{filtered.length} Transaktionen</p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Land / Tarif</th>
              <th className="px-4 py-3 text-left">Kunde</th>
              <th className="px-4 py-3 text-center">Typ</th>
              <th className="px-4 py-3 text-center">Status</th>
              <th className="px-4 py-3 text-right">Gesamtbetrag</th>
              <th className="px-4 py-3 text-center">Status ändern</th>
              <th className="px-4 py-3 text-right">Datum</th>
              <th className="px-4 py-3 text-center">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((g) => {
              const distinctCountries = Array.from(new Set(g.orders.map(o => o.tariffs?.country_name).filter(Boolean)));
              const distinctFlags = Array.from(new Set(g.orders.map(o => o.tariffs?.flag_emoji).filter(Boolean)));
              const countriesLabel = distinctCountries.join(', ');
              const flagsLabel = distinctFlags.join(' ') || '🌐';
              const itemsCountLabel = g.orders.length > 1 ? ` (x${g.orders.length})` : '';

              const isTopUpGroup = g.orders.every(o => o.order_type === 'top_up');
              const isMixedGroup = !isTopUpGroup && g.orders.some(o => o.order_type === 'top_up');

              return (
                <>
                  <tr key={g.checkout_ref} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{flagsLabel}</span>
                        <span className="truncate max-w-[180px]" title={countriesLabel}>{countriesLabel || '–'}</span>
                        <span className="text-xs text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded-full">{itemsCountLabel}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 truncate max-w-[160px]">{g.customer_email}</p>
                      {g.customer_name && (
                        <p className="text-xs text-slate-400">{g.customer_name}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {isTopUpGroup ? '📶 Top-Up' : isMixedGroup ? '🔄 Gemischt' : '🆕 Neu'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[g.status] ?? 'bg-slate-100'}`}>
                        {STATUS_LABEL[g.status] ?? g.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{formatEur(g.amount_eur_total)}</td>
                    <td className="px-4 py-3 text-center">
                      <select
                        value={g.status}
                        disabled={updating === g.checkout_ref}
                        onChange={(e) => updateGroupStatus(g, e.target.value as OrderStatus)}
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500 disabled:opacity-50"
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400 text-xs">
                      {new Date(g.created_at).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setExpanded(expanded === g.checkout_ref ? null : g.checkout_ref)}
                          className="text-xs text-brand-600 hover:text-brand-800 font-medium bg-brand-50 px-2 py-1 rounded"
                        >
                          {expanded === g.checkout_ref ? 'Schließen ▲' : 'Details ▼'}
                        </button>
                        <button
                          onClick={() => deleteGroup(g)}
                          disabled={updating !== null}
                          className="text-xs text-red-600 hover:text-red-800 font-medium bg-red-50 px-2 py-1 rounded disabled:opacity-50"
                          title="Gesamte Transaktion löschen"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>

                  {/* Expanded Row */}
                  {expanded === g.checkout_ref && (
                    <tr key={`${g.checkout_ref}-detail`} className="bg-slate-50/50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="border border-slate-200 rounded-xl bg-white p-4 space-y-4 shadow-inner">
                          <div className="flex justify-between items-center text-xs text-slate-500 border-b border-slate-100 pb-2">
                            <div>
                              <span>Transaktions-Ref: </span>
                              <span className="font-mono font-semibold text-slate-700">{g.checkout_ref}</span>
                            </div>
                            {g.sellauth_order_id && (
                              <div>
                                <span>Sellauth-Ref: </span>
                                <span className="font-mono font-semibold text-slate-700">{g.sellauth_order_id}</span>
                              </div>
                            )}
                          </div>

                          <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-700">Bestellte eSIMs:</p>
                            {g.orders.map((o) => (
                              <div key={o.id} className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 font-semibold text-slate-800">
                                    <span>{o.tariffs?.flag_emoji} {o.tariffs?.country_name}</span>
                                    <span>·</span>
                                    <span>{o.tariffs?.name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">({o.id.substring(0, 8)}...)</span>
                                  </div>
                                  <div className="text-slate-500 space-y-0.5">
                                    <p>Typ: {o.order_type === 'top_up' ? '📶 Top-Up' : '🆕 Neu'}</p>
                                    <p>Preis: {formatEur(o.amount_eur)}</p>
                                    {o.iccid ? (
                                      <p className="font-mono">ICCID: {o.iccid}</p>
                                    ) : (
                                      <p className="text-slate-400 italic">Noch nicht provisioniert</p>
                                    )}
                                    {o.top_up_iccid && (
                                      <p className="font-mono text-amber-600">Top-Up Ziel-ICCID: {o.top_up_iccid}</p>
                                    )}
                                    {o.payment_confirmed_at && (
                                      <p>Zahlungsdatum: {new Date(o.payment_confirmed_at).toLocaleString('de-DE')}</p>
                                    )}
                                    {o.error_message && (
                                      <p className="text-red-600 font-mono bg-red-50 p-1 rounded border border-red-100 break-all">
                                        Fehler: {o.error_message}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-3 self-end sm:self-center">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Status:</span>
                                    <select
                                      value={o.status}
                                      disabled={updating === o.id}
                                      onChange={(e) => updateOrderStatus(o.id, e.target.value as OrderStatus)}
                                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs outline-none focus:border-brand-500 bg-white"
                                    >
                                      {ALL_STATUSES.map((s) => (
                                        <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <button
                                    onClick={() => deleteOrder(o.id)}
                                    disabled={updating !== null}
                                    className="rounded-lg bg-red-100 p-1.5 text-red-700 hover:bg-red-200 disabled:opacity-50 transition-colors"
                                    title="Einzelbestellung löschen"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-400">Keine Bestellungen gefunden.</p>
        )}
      </div>
    </div>
  );
}
