'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

interface CheckoutFeedbackWidgetProps {
  orderRef?: string;
  orderId?: string;
  className?: string;
}

export function CheckoutFeedbackWidget({ orderRef, orderId, className = '' }: CheckoutFeedbackWidgetProps) {
  const { locale } = useTranslation();
  const isDe = locale === 'de';

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  const [nameType, setNameType] = useState<'anon' | 'alias'>('anon');
  const [alias, setAlias] = useState('');

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [verifiedOrderId, setVerifiedOrderId] = useState<string | null>(null);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const targetIdentifier = orderId || orderRef;

  const quickTags = isDe ? [
    '🚀 Schnelle Abwicklung',
    '📱 Intuitive Website',
    '🌐 Top Service & Empfang',
    '🔒 Anonym & Sicher',
    '⚡ Sofortige Bereitstellung'
  ] : [
    '🚀 Fast Process',
    '📱 Intuitive Website',
    '🌐 Great Service & Network',
    '🔒 Anonymous & Secure',
    '⚡ Instant Delivery'
  ];

  // Check eligibility & duplicate status on mount
  useEffect(() => {
    if (!targetIdentifier) {
      setChecking(false);
      return;
    }

    async function checkStatus() {
      try {
        const param = orderId ? `orderId=${encodeURIComponent(orderId)}` : `ref=${encodeURIComponent(orderRef || '')}`;
        const res = await fetch(`/api/feedbacks/verify-order?${param}`);
        const data = await res.json();

        if (res.ok && data.success) {
          setVerifiedOrderId(data.orderId);
          if (data.alreadySubmitted) {
            setAlreadySubmitted(true);
          }
        }
      } catch (err) {
        console.error('Feedback check failed:', err);
      } finally {
        setChecking(false);
      }
    }

    checkStatus();
  }, [targetIdentifier, orderId, orderRef]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      const next = exists ? prev.filter((t) => t !== tag) : [...prev, tag];
      
      // Auto-append or update tag text into comment if comment is empty or contains tags
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedOrderId && !targetIdentifier) return;

    setLoading(true);
    setError('');

    const displayName = nameType === 'anon' ? 'Anonym' : alias.trim();
    if (nameType === 'alias' && !displayName) {
      setError(isDe ? 'Bitte gib einen Namen oder ein Alias ein.' : 'Please enter a name or alias.');
      setLoading(false);
      return;
    }

    // Combine tags and comment
    let fullComment = comment.trim();
    if (selectedTags.length > 0) {
      const tagString = selectedTags.join(' • ');
      fullComment = fullComment ? `${tagString}\n\n${fullComment}` : tagString;
    }

    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: fullComment || null,
          displayName,
          orderId: verifiedOrderId || orderId || null,
          ref: orderRef || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isDe ? 'Fehler beim Speichern' : 'Failed to submit'));
      }

      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || (isDe ? 'Ein Fehler ist aufgetreten.' : 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return null;
  }

  // Already submitted state
  if (alreadySubmitted) {
    return (
      <div className={`rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm text-center ${className}`}>
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 font-black text-xl border border-emerald-150">
          ✓
        </div>
        <h3 className="text-base font-black text-slate-800 tracking-tight mb-1">
          {isDe ? 'Feedback bereits eingereicht' : 'Feedback already submitted'}
        </h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
          {isDe 
            ? 'Du hast diese Transaktion bereits erfolgreich bewertet. Deine Rezension ist mit dem Badge „Verifizierter Kauf“ online.' 
            : 'You have already reviewed this transaction. Your rating is published with the "Verified Purchase" badge.'}
        </p>
      </div>
    );
  }

  // Submitted success state
  if (submitted) {
    return (
      <div className={`rounded-3xl border border-emerald-200 bg-gradient-to-b from-emerald-50/70 via-white to-emerald-50/30 p-6 md:p-8 shadow-sm text-center animate-fade-in ${className}`}>
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500 text-white font-black text-2xl shadow-md shadow-emerald-500/20">
          ✓
        </div>
        <h3 className="text-xl font-black text-slate-900 tracking-tight mb-1.5">
          {isDe ? 'Vielen Dank für dein Feedback! ⭐' : 'Thank you for your feedback! ⭐'}
        </h3>
        <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed mb-4">
          {isDe 
            ? 'Deine Bewertung wurde erfolgreich übermittelt und ist nun als verifizierter Kauf in unserem Review-Bereich sichtbar.' 
            : 'Your review has been successfully submitted and is now published as a verified purchase in our reviews section.'}
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-800 text-[11px] font-bold">
          <span>✓</span> {isDe ? 'Verifizierter Kauf aktiviert' : 'Verified Purchase Active'}
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border border-slate-200/90 bg-white p-6 md:p-8 shadow-sm relative overflow-hidden ${className}`}>
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-5 border-b border-slate-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 mb-2">
            <span>✓</span> {isDe ? 'Verifizierter Kauf berechtigt' : 'Verified Purchase Eligible'}
          </div>
          <h3 className="text-lg font-black text-slate-900 tracking-tight">
            {isDe ? 'Wie war deine Erfahrung mit PureSim?' : 'How was your experience with PureSim?'}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {isDe 
              ? 'Bewerte unseren Service, den Kaufprozess und die Website in nur 1 Minute.' 
              : 'Rate our service, checkout process, and website in just 1 minute.'}
          </p>
        </div>

        {/* Stars Interactive Header Preview */}
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4, 5].map((star) => {
            const isFilled = hoverRating !== null ? star <= hoverRating : star <= rating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                className="p-1 cursor-pointer transition-transform hover:scale-125 focus:outline-none"
                aria-label={`${star} Sterne`}
              >
                <svg
                  className={`h-7 w-7 transition-colors ${
                    isFilled ? 'text-amber-400 fill-amber-400 filter drop-shadow-xs' : 'text-slate-200 fill-slate-200'
                  }`}
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              </button>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-3.5 text-xs font-semibold text-red-800">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Quick-Tags */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            {isDe ? 'Was hat dir besonders gefallen?' : 'What did you like most?'}
          </label>
          <div className="flex flex-wrap gap-2">
            {quickTags.map((tag) => {
              const active = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                    active
                      ? 'bg-brand-50 border-brand-400 text-brand-700 shadow-2xs'
                      : 'bg-slate-50/80 border-slate-200/80 text-slate-650 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                >
                  {active ? `✓ ${tag}` : `+ ${tag}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Comment Textarea */}
        <div>
          <label htmlFor="checkout-feedback-comment" className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
            {isDe ? 'Dein Erfahrungsbericht (Optional)' : 'Your review (Optional)'}
          </label>
          <textarea
            id="checkout-feedback-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            maxLength={1500}
            rows={3}
            className="w-full rounded-2xl border border-slate-250 bg-slate-50/50 p-3.5 text-xs text-slate-800 outline-none focus:border-brand-500 focus:bg-white focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-400"
            placeholder={
              isDe
                ? 'Wie lief die Zahlung, wie gefällt dir die Website und der Service?...'
                : 'How was the checkout, how do you like the website and service?...'
            }
          />
        </div>

        {/* Display Name Privacy Toggle */}
        <div>
          <label className="block text-[11px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            {isDe ? 'Veröffentlichung' : 'Publication'}
          </label>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setNameType('anon')}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-bold border transition-all cursor-pointer text-center ${
                nameType === 'anon'
                  ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-2xs'
                  : 'bg-white border-slate-250 text-slate-650 hover:bg-slate-50'
              }`}
            >
              👤 {isDe ? 'Anonym posten' : 'Post Anonymously'}
            </button>
            <button
              type="button"
              onClick={() => setNameType('alias')}
              className={`rounded-xl px-3.5 py-2.5 text-xs font-bold border transition-all cursor-pointer text-center ${
                nameType === 'alias'
                  ? 'bg-brand-50 border-brand-500 text-brand-800 shadow-2xs'
                  : 'bg-white border-slate-250 text-slate-650 hover:bg-slate-50'
              }`}
            >
              ✏️ {isDe ? 'Mit Alias / Name' : 'With Alias / Name'}
            </button>
          </div>

          {nameType === 'alias' && (
            <input
              type="text"
              required
              value={alias}
              onChange={(e) => setAlias(e.target.value)}
              maxLength={40}
              placeholder={isDe ? 'z.B. Alex M. oder CryptoTraveler' : 'e.g. Alex M. or CryptoTraveler'}
              className="mt-2.5 w-full rounded-xl border border-slate-250 bg-white p-3 text-xs text-slate-800 outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 transition-all placeholder:text-slate-400"
            />
          )}
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-brand-600 px-5 py-3.5 text-xs font-extrabold text-white shadow-md shadow-brand-600/20 hover:bg-brand-700 disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{isDe ? 'Wird übermittelt...' : 'Submitting...'}</span>
            </>
          ) : (
            <span>{isDe ? 'Bewertung jetzt absenden ⭐' : 'Submit Review Now ⭐'}</span>
          )}
        </button>
      </form>
    </div>
  );
}
