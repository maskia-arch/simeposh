'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { getTicketTranslations } from '@/lib/i18n/ticket-translations';

interface Ticket {
  id: string;
  ticket_number: string;
  customer_email: string;
  customer_name?: string;
  subject: string;
  category: string;
  status: string;
  priority: string;
  invoice_id?: string;
  iccid?: string;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_type: 'customer' | 'admin' | 'system';
  sender_email: string;
  sender_name?: string;
  message: string;
  attachments?: any;
  created_at: string;
}

function parseAttachments(raw: any): Array<{ name?: string; type?: string; dataUrl?: string }> {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

export function CustomerTicketsDashboard({ userEmail }: { userEmail: string }) {
  const { locale } = useTranslation();
  const t = getTicketTranslations(locale);

  const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
    open:           { label: t.statusOpen, cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    in_progress:    { label: t.statusInProgress, cls: 'bg-blue-50 text-blue-700 border border-blue-200' },
    answered:       { label: t.statusAnswered, cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' },
    customer_reply: { label: t.statusOpen, cls: 'bg-amber-50 text-amber-700 border border-amber-200' },
    closed:         { label: t.statusClosed, cls: 'bg-slate-100 text-slate-600 border border-slate-200' },
  };
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const fetchTickets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tickets?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Fehler beim Laden der Tickets');
      setTickets(data.tickets || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const openModal = urlParams.get('openModal');
      const iccidParam = urlParams.get('iccid');
      const invoiceIdParam = urlParams.get('invoiceId');
      const subjectParam = urlParams.get('subject');
      const categoryParam = urlParams.get('category');

      if (openModal === 'true' || iccidParam || invoiceIdParam) {
        window.dispatchEvent(new CustomEvent('open-ticket-modal', {
          detail: {
            iccid: iccidParam || undefined,
            invoiceId: invoiceIdParam || undefined,
            subject: subjectParam || (iccidParam ? `Hilfe bei eSIM Aktivierung (${iccidParam})` : undefined),
            category: categoryParam || (iccidParam ? 'activation' : 'general'),
            initialEmail: userEmail,
          }
        }));
      }
    } catch {}
  }, [userEmail]);

  const selectTicket = async (t: Ticket) => {
    setSelectedTicket(t);
    setLoadingThread(true);
    setReplyText('');
    try {
      const res = await fetch(`/api/tickets/${t.id}?email=${encodeURIComponent(userEmail)}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load ticket thread:', err);
    } finally {
      setLoadingThread(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: replyText.trim(),
          email: userEmail,
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || 'Antwort fehlgeschlagen');

      setReplyText('');
      setMessages((prev) => [...prev, data.message]);
      setSelectedTicket((prev) => prev ? { ...prev, status: 'customer_reply' } : null);
      fetchTickets();
    } catch (err: any) {
      alert(err.message || 'Antwort konnte nicht gesendet werden');
    } finally {
      setSendingReply(false);
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    if (!confirm('Möchtest du dieses Ticket wirklich als gelöst schließen?')) return;

    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'close', email: userEmail }),
      });
      if (res.ok) {
        setSelectedTicket((prev) => prev ? { ...prev, status: 'closed' } : null);
        fetchTickets();
      }
    } catch (err) {
      console.error('Close ticket error:', err);
    }
  };

  const filteredTickets = tickets.filter((t) => {
    if (filter === 'open') return t.status !== 'closed';
    if (filter === 'closed') return t.status === 'closed';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <span>🎫</span> {t.tabTicketsTitle}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t.tabTicketsSub}
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-blue-50 border border-blue-200/80 px-2.5 py-1 text-[11px] font-medium text-blue-900">
            <span>⏱️</span>
            <span>{t.responseTimeNotice}</span>
          </div>
        </div>
        <button
          onClick={() => {
            try {
              window.dispatchEvent(new CustomEvent('open-ticket-modal', { detail: { initialEmail: userEmail } }));
            } catch {}
          }}
          className="rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors flex items-center gap-1.5"
        >
          <span>+</span> {t.newTicketBtn}
        </button>
      </div>

      {/* Main Grid: Ticket List & Thread View */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Ticket List (Left Side) */}
        <div className="md:col-span-5 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                filter === 'all' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.filterAll} ({tickets.length})
            </button>
            <button
              onClick={() => setFilter('open')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                filter === 'open' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.filterOpen} ({tickets.filter((t) => t.status !== 'closed').length})
            </button>
            <button
              onClick={() => setFilter('closed')}
              className={`rounded-lg px-3 py-1 text-xs font-semibold transition-colors ${
                filter === 'closed' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              {t.filterClosed} ({tickets.filter((t) => t.status === 'closed').length})
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">...</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-50 text-xs text-red-600 font-medium">{error}</div>
          ) : filteredTickets.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-400">
              <p className="text-2xl mb-2">📬</p>
              <p className="text-xs font-medium">{t.noTickets}</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
              {filteredTickets.map((tk) => {
                const badge = STATUS_BADGE[tk.status] || STATUS_BADGE.open;
                const isSelected = selectedTicket?.id === tk.id;
                return (
                  <div
                    key={tk.id}
                    onClick={() => selectTicket(tk)}
                    className={`rounded-xl border p-3.5 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-brand-600 bg-brand-50/40 ring-1 ring-brand-600'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-[11px] font-bold text-slate-600">{tk.ticket_number}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-900 text-xs truncate mb-1">{tk.subject}</p>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{new Date(tk.updated_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}</span>
                      {tk.iccid && <span className="font-mono">ICCID</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Ticket Thread View (Right Side) */}
        <div className="md:col-span-7">
          {selectedTicket ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 flex flex-col min-h-[450px]">
              {/* Thread Header */}
              <div className="border-b border-slate-100 pb-4 mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md">
                      {selectedTicket.ticket_number}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${(STATUS_BADGE[selectedTicket.status] || STATUS_BADGE.open).cls}`}>
                      {(STATUS_BADGE[selectedTicket.status] || STATUS_BADGE.open).label}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">{selectedTicket.subject}</h3>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400 mt-1">
                    <span>{new Date(selectedTicket.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US')}</span>
                    {selectedTicket.invoice_id && <span>Invoice: <code className="font-mono text-slate-600">{selectedTicket.invoice_id}</code></span>}
                    {selectedTicket.iccid && <span>ICCID: <code className="font-mono text-slate-600">{selectedTicket.iccid}</code></span>}
                  </div>
                </div>

                {selectedTicket.status !== 'closed' && (
                  <button
                    onClick={handleCloseTicket}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    ✓ {t.closeTicketBtn}
                  </button>
                )}
              </div>

              {/* Messages Thread */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] mb-4">
                {loadingThread ? (
                  <div className="p-8 text-center text-xs text-slate-400">...</div>
                ) : messages.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">—</div>
                ) : (
                  messages.map((m) => {
                    const isAdmin = m.sender_type === 'admin';
                    return (
                      <div
                        key={m.id}
                        className={`rounded-2xl p-4 text-xs leading-relaxed max-w-[88%] ${
                          isAdmin
                            ? 'bg-blue-50/80 border border-blue-200/80 text-blue-950 ml-0 mr-auto'
                            : 'bg-slate-100 text-slate-800 ml-auto mr-0'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5 border-b border-slate-200/60 pb-1 text-[11px]">
                          <span className="font-bold">
                            {isAdmin ? '🛡️ PureSim Support' : `👤 ${m.sender_name || 'Du'}`}
                          </span>
                          <span className="text-slate-400">
                            {new Date(m.created_at).toLocaleString(locale === 'de' ? 'de-DE' : 'en-US', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap">{m.message}</p>

                        {/* Render attachments & image preview */}
                        {(() => {
                          const attList = parseAttachments(m.attachments);
                          if (attList.length === 0) return null;
                          return (
                            <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-col gap-2">
                              {attList.map((att: any, idx: number) => {
                                const isImg = att.dataUrl?.startsWith('data:image/') || att.type?.startsWith('image/') || (att.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(att.name));

                                return (
                                  <div key={idx} className="space-y-1">
                                    {isImg && att.dataUrl && (
                                      <a href={att.dataUrl} target="_blank" rel="noreferrer" className="block max-w-xs">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                          src={att.dataUrl}
                                          alt={att.name || 'Screenshot'}
                                          className="max-h-56 rounded-xl border border-slate-300 object-contain bg-white hover:opacity-95 transition-opacity shadow-xs"
                                        />
                                      </a>
                                    )}
                                    <a
                                      href={att.dataUrl || '#'}
                                      download={att.name || 'anhang'}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-[11px] font-semibold text-brand-700 shadow-xs border border-slate-200 hover:bg-brand-50"
                                    >
                                      📎 {att.name || 'Anhang herunterladen'}
                                    </a>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== 'closed' ? (
                <form onSubmit={handleSendReply} className="border-t border-slate-100 pt-3 flex gap-2">
                  <input
                    type="text"
                    required
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={t.replyPlaceholder}
                    className="flex-1 rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900 focus:border-brand-600 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={sendingReply || !replyText.trim()}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-bold text-white hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {sendingReply ? '...' : t.sendBtn}
                  </button>
                </form>
              ) : (
                <div className="border-t border-slate-100 pt-3 text-center text-xs text-slate-400 italic">
                  {t.ticketClosedNotice}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400 h-full flex flex-col items-center justify-center">
              <p className="text-3xl mb-2">👈</p>
              <p className="text-sm font-medium">{t.selectTicketHint}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
