'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function NewReviewPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  
  const [orderId, setOrderId] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  
  // Name type options: 'anon' (Anonymous) or 'alias' (Custom Name)
  const [nameType, setNameType] = useState<'anon' | 'alias'>('anon');
  const [alias, setAlias] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [isVerifyingOrder, setIsVerifyingOrder] = useState(false);
  const [orderVerified, setOrderVerified] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const isDe = locale === 'de';

  // Read orderId from URL query param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('orderId');
    if (id) {
      setOrderId(id);
      verifyOrder(id);
    }
  }, []);

  const verifyOrder = async (id: string) => {
    setIsVerifyingOrder(true);
    setError('');
    try {
      const res = await fetch(`/api/feedbacks`); // we check via API or just let the submission route handle validation
      // But to be secure, let's keep it simple: the submission route will validate it when POST is called.
      // We can just trust the presence of orderId for the UI presentation.
      setOrderVerified(true);
    } catch {
      // ignore
    } finally {
      setIsVerifyingOrder(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const displayName = nameType === 'anon' ? 'Anonym' : alias.trim();
    if (nameType === 'alias' && !displayName) {
      setError(isDe ? 'Bitte gib einen Namen oder ein Alias ein.' : 'Please enter a name or alias.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          comment: comment.trim(),
          displayName,
          orderId: orderId || null
        })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler beim Speichern der Bewertung');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Ein Fehler ist aufgetreten.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-md">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-250 mb-6 text-emerald-600 text-3xl">
            ✓
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-3">
            {isDe ? 'Vielen Dank für dein Feedback!' : 'Thank you for your feedback!'}
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            {isDe 
              ? 'Deine Bewertung wurde erfolgreich übermittelt und ist nun öffentlich einsehbar.' 
              : 'Your review has been successfully submitted and is now publicly visible.'}
          </p>
          <button
            onClick={() => router.push('/reviews')}
            className="w-full rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors shadow-sm"
          >
            {isDe ? 'Zurück zu den Bewertungen' : 'Back to reviews'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-md">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-2">
          {isDe ? 'Kauf bewerten' : 'Rate your purchase'}
        </h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          {isDe 
            ? 'Teile deine Erfahrung mit PureSim. Deine Bewertung hilft anderen Reisenden dabei, die richtige Entscheidung zu treffen.' 
            : 'Share your experience with PureSim. Your rating helps other travelers make the right choice.'}
        </p>

        {orderId && (
          <div className="mb-6 rounded-2xl border border-emerald-150 bg-emerald-50/50 p-4 flex items-start gap-2.5">
            <span className="text-emerald-700 text-base shrink-0 mt-0.5">✓</span>
            <div>
              <p className="text-xs font-bold text-emerald-800">
                {isDe ? 'Verifizierte Bewertung aktiv' : 'Verified Review Active'}
              </p>
              <p className="text-[11px] text-emerald-600 mt-0.5 leading-relaxed">
                {isDe 
                  ? 'Du bewertest aus einer E-Mail-Einladung heraus. Deine Bewertung erhält automatisch das Label "Verifizierter Kauf".' 
                  : 'You are reviewing from an email invitation. Your review will automatically get the "Verified Purchase" label.'}
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-800 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isDe ? 'Bewertung *' : 'Rating *'}
            </label>
            <div className="flex gap-2.5 py-1">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = hoverRating !== null ? star <= hoverRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 cursor-pointer transition-transform hover:scale-110 outline-none"
                  >
                    <svg
                      className={`h-9 w-9 ${isSelected ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isDe ? '5 Sterne ist die beste Bewertung' : '5 stars is the highest rating'}
            </p>
          </div>

          {/* Comment text */}
          <div>
            <label htmlFor="comment" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              {isDe ? 'Kommentar (Optional)' : 'Review Comment (Optional)'}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 h-28 leading-relaxed"
              placeholder={isDe ? 'Wie verlief die Aktivierung? Hattest du guten Empfang? Schreib uns deine Meinung...' : 'How was the activation? Did you have good network coverage? Write your feedback...'}
            />
          </div>

          {/* Display Name Privacy Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
              {isDe ? 'Öffentlicher Name *' : 'Public Display Name *'}
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setNameType('anon')}
                className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all cursor-pointer ${nameType === 'anon' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                👤 {isDe ? 'Anonym' : 'Anonymous'}
              </button>
              <button
                type="button"
                onClick={() => setNameType('alias')}
                className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all cursor-pointer ${nameType === 'alias' ? 'bg-brand-50 border-brand-500 text-brand-700' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                ✏️ {isDe ? 'Alias / Name' : 'Custom Alias'}
              </button>
            </div>

            {nameType === 'alias' && (
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
                placeholder={isDe ? 'z.B. Max M.' : 'e.g. Max M.'}
              />
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-5 py-3.5 text-sm font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                {isDe ? 'Wird gespeichert...' : 'Submitting review...'}
              </>
            ) : (
              <>{isDe ? 'Bewertung absenden' : 'Submit Review'}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
