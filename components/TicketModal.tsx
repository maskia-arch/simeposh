'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { getTicketTranslations } from '@/lib/i18n/ticket-translations';

export interface TicketModalOptions {
  invoiceId?: string;
  iccid?: string;
  subject?: string;
  category?: string;
  initialEmail?: string;
  initialName?: string;
}

interface TicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  options?: TicketModalOptions;
}

export function TicketModal({ isOpen, onClose, options }: TicketModalProps) {
  const { locale } = useTranslation();
  const t = getTicketTranslations(locale);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [isEmailLocked, setIsEmailLocked] = useState(false);
  const [category, setCategory] = useState('general');
  const [subject, setSubject] = useState('');
  const [invoiceId, setInvoiceId] = useState('');
  const [iccid, setIccid] = useState('');
  const [description, setDescription] = useState('');
  const [attachments, setAttachments] = useState<Array<{ name: string; size: number; type: string; dataUrl: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdTicket, setCreatedTicket] = useState<{ id: string; ticket_number: string } | null>(null);

  // Intelligent pre-filling whenever modal opens
  useEffect(() => {
    if (isOpen) {
      setError(null);
      setCreatedTicket(null);

      // Category & Subject intelligent defaults
      setCategory(options?.category || 'general');
      setSubject(options?.subject || '');

      // Context IDs (Invoice ID & ICCID)
      setInvoiceId(options?.invoiceId || '');
      setIccid(options?.iccid || '');
      setDescription('');
      setAttachments([]);

      // Auto-detect logged in user or fallback to initialEmail
      fetch('/api/auth/me')
        .then((res) => res.json())
        .then((data) => {
          if (data.user?.email) {
            setEmail(data.user.email);
            setIsEmailLocked(true);
            if (data.user.user_metadata?.full_name) {
              setName(data.user.user_metadata.full_name);
            }
          } else {
            setIsEmailLocked(false);
            if (options?.initialEmail) {
              setEmail(options.initialEmail);
            }
          }
        })
        .catch(() => {
          setIsEmailLocked(false);
          if (options?.initialEmail) {
            setEmail(options.initialEmail);
          }
        });
    }
  }, [isOpen, options]);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    const newAttachments: Array<{ name: string; size: number; type: string; dataUrl: string }> = [];

    for (const file of fileList) {
      if (file.size > 5 * 1024 * 1024) {
        setError(`Datei "${file.name}" ist zu groß (max. 5 MB).`);
        continue;
      }

      try {
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        newAttachments.push({ name: file.name, size: file.size, type: file.type, dataUrl });
      } catch (err) {
        console.error('File read error:', err);
      }
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !email.includes('@')) {
      setError(locale === 'de' ? 'Bitte eine gültige E-Mail-Adresse angeben.' : 'Please enter a valid email address.');
      return;
    }
    if (!subject.trim()) {
      setError(locale === 'de' ? 'Bitte einen Betreff angeben.' : 'Please enter a subject.');
      return;
    }
    if (!description.trim()) {
      setError(locale === 'de' ? 'Bitte beschreibe dein Anliegen.' : 'Please describe your issue.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/tickets/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          subject: subject.trim(),
          category,
          description: description.trim(),
          invoiceId: invoiceId.trim() || undefined,
          iccid: iccid.trim() || undefined,
          attachments,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Erstellen fehlgeschlagen');
      }

      setCreatedTicket(data.ticket);
    } catch (err: any) {
      setError(err.message || 'Ein Unerwarteter Fehler ist aufgetreten.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600 font-bold text-lg">
              🎫
            </span>
            <div>
              <h3 className="font-bold text-slate-900 text-lg leading-tight">{t.modalTitle}</h3>
              <p className="text-xs text-slate-500">{t.modalSub}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Response Time Info Callout */}
        <div className="mt-3 rounded-xl bg-blue-50/80 border border-blue-200/80 p-3 text-xs text-blue-900 flex items-start gap-2 shadow-2xs">
          <span className="text-sm leading-none shrink-0 mt-0.5">⏱️</span>
          <span className="font-medium leading-relaxed">{t.responseTimeNotice}</span>
        </div>

        {/* Form Body */}
        <div className="overflow-y-auto pt-4 flex-1 pr-1">
          {createdTicket ? (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl">
                ✓
              </div>
              <h4 className="text-xl font-bold text-slate-900">{t.successTitle}</h4>
              <p className="text-sm text-slate-600">
                {t.successBadge}{' '}
                <span className="font-bold text-brand-700 bg-brand-50 px-2 py-1 rounded-md font-mono">
                  {createdTicket.ticket_number}
                </span>
              </p>
              <p className="text-xs text-slate-500">{t.successMsg}</p>
              <div className="pt-4 flex flex-col gap-2">
                <a
                  href="/dashboard?tab=tickets"
                  className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors text-center"
                >
                  {t.viewDashboardBtn}
                </a>
                <button
                  onClick={onClose}
                  className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors"
                >
                  {t.closeBtn}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs font-medium text-red-700">
                  {error}
                </div>
              )}

              {/* Email & Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.emailLabel}
                  </label>
                  <input
                    type="email"
                    required
                    readOnly={isEmailLocked}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="deine@email.de"
                    className={`w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-brand-600 focus:outline-none ${
                      isEmailLocked ? 'bg-slate-100 cursor-not-allowed text-slate-600 font-medium' : 'bg-white'
                    }`}
                  />
                  {isEmailLocked && (
                    <span className="text-[10px] text-emerald-600 font-medium">✓ Aus deinem Nutzerkonto vorausgefüllt</span>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.nameLabel}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Max Mustermann"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Category & Subject */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.categoryLabel}
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-brand-600 focus:outline-none bg-white"
                  >
                    <option value="general">{t.catGeneral}</option>
                    <option value="activation">{t.catActivation}</option>
                    <option value="payment">{t.catPayment}</option>
                    <option value="esim_issue">{t.catEsimIssue}</option>
                    <option value="refund">{t.catRefund}</option>
                    <option value="other">{t.catOther}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.subjectLabel}
                  </label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="z. B. QR-Code lässt sich nicht scannen"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm focus:border-brand-600 focus:outline-none"
                  />
                </div>
              </div>

              {/* Invoice ID & ICCID (Intelligent Context Fields) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.invoiceIdLabel}
                  </label>
                  <input
                    type="text"
                    value={invoiceId}
                    onChange={(e) => setInvoiceId(e.target.value)}
                    placeholder="INV-..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm font-mono focus:border-brand-600 focus:outline-none bg-slate-50/60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t.iccidLabel}
                  </label>
                  <input
                    type="text"
                    value={iccid}
                    onChange={(e) => setIccid(e.target.value)}
                    placeholder="89853..."
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-slate-900 text-sm font-mono focus:border-brand-600 focus:outline-none bg-slate-50/60"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.descriptionLabel}
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Bitte beschreibe dein Anliegen..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-slate-900 text-sm focus:border-brand-600 focus:outline-none"
                />
              </div>

              {/* File Upload / Attachments */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t.attachmentsLabel}
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 cursor-pointer"
                />
                {attachments.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {attachments.map((file, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
                      >
                        📷 {file.name}
                        <button
                          type="button"
                          onClick={() => removeAttachment(idx)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  {t.cancelBtn}
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {isSubmitting ? t.submitting : t.submitBtn}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
