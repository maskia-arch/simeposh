'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

export default function NewReviewPage() {
  const router = useRouter();
  const { locale } = useTranslation();
  const isDe = locale === 'de';

  const [orderId, setOrderId] = useState('');
  const [orderRef, setOrderRef] = useState('');
  const [verifying, setVerifying] = useState(true);
  const [orderVerified, setOrderVerified] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tariffName, setTariffName] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  
  // Name type options: 'anon' (Anonymous) or 'alias' (Custom Name)
  const [nameType, setNameType] = useState<'anon' | 'alias'>('anon');
  const [alias, setAlias] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const quickTags = isDe ? [
    '🚀 Schnelle Kaufabwicklung',
    '📱 Intuitive Website',
    '🌐 Zuverlässiger Service & Empfang',
    '🔒 Anonym & Sicher',
    '⚡ Sofortige Bereitstellung',
    '💬 Schneller Support'
  ] : [
    '🚀 Fast Process',
    '📱 Intuitive Website',
    '🌐 Great Service & Network',
    '🔒 Anonymous & Secure',
    '⚡ Instant Delivery',
    '💬 Great Support'
  ];

  // Verify orderId / ref from URL query param on mount
  useEffect(() => {
    async function verify() {
      const params = new URLSearchParams(window.location.search);
      const rawOrderId = params.get('orderId')?.trim();
      const rawRef = params.get('ref')?.trim();
      const identifier = rawOrderId || rawRef;
      
      if (!identifier) {
        setVerifying(false);
        return;
      }

      try {
        const queryParam = rawOrderId ? `orderId=${encodeURIComponent(rawOrderId)}` : `ref=${encodeURIComponent(rawRef || '')}`;
        const res = await fetch(`/api/feedbacks/verify-order?${queryParam}`);
        const data = await res.json();
        
        if (res.ok && data.success) {
          setOrderId(data.orderId || rawOrderId || '');
          setOrderRef(rawRef || '');
          setCustomerName(data.customerName || '');
          setTariffName(data.tariffName || null);
          setCountryName(data.countryName || null);
          
          if (data.alreadySubmitted) {
            setAlreadySubmitted(true);
          } else {
            setOrderVerified(true);
          }
        } else {
          setError(data.error || (isDe ? 'Verifizierung fehlgeschlagen.' : 'Verification failed.'));
        }
      } catch (err) {
        setError(isDe ? 'Netzwerkfehler bei der Verifizierung.' : 'Network verification error.');
      } finally {
        setVerifying(false);
      }
    }
    verify();
  }, [isDe]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => 
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
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
          orderId: orderId || null,
          ref: orderRef || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (isDe ? 'Fehler beim Speichern der Bewertung' : 'Failed to save review'));
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || (isDe ? 'Ein Fehler ist aufgetreten.' : 'An error occurred.'));
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading State
  if (verifying) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center animate-fade-in">
        <div className="inline-block animate-spin h-8 w-8 rounded-full border-4 border-brand-500 border-t-transparent"></div>
        <p className="mt-4 text-xs font-semibold text-slate-500">
          {isDe ? 'Transaktion wird verifiziert...' : 'Verifying transaction...'}
        </p>
      </div>
    );
  }

  // 2. Already Submitted State
  if (alreadySubmitted) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-fade-in">
        <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-lg">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 mb-6 text-emerald-600 text-3xl font-bold shadow-xs">
            ✓
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
            {isDe ? 'Bewertung bereits abgegeben' : 'Review Already Submitted'}
          </h2>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            {isDe 
              ? 'Du hast diese Transaktion bereits erfolgreich bewertet. Um die Authentizität unserer Kundenstimmen zu wahren, kann jeder Kauf genau einmal bewertet werden.'
              : 'You have already submitted a review for this purchase. To maintain authentic feedback, each transaction can be rated once.'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-8">
            <span>✓</span> {isDe ? 'Verifizierter Kauf online' : 'Verified Purchase Online'}
          </div>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/reviews')}
              className="w-full rounded-xl bg-brand-600 px-5 py-3.5 text-xs font-bold text-white hover:bg-brand-700 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              {isDe ? 'Alle Kundenbewertungen ansehen' : 'View all customer reviews'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl border border-slate-250 bg-white px-5 py-3.5 text-xs font-bold text-slate-650 hover:bg-slate-50 transition-all cursor-pointer"
            >
              {isDe ? 'Zur Startseite' : 'Back to homepage'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Unverified / Missing Invite Landing Page
  if (!orderVerified) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center animate-fade-in">
        <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-lg">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-amber-50 border border-amber-200 mb-6 text-amber-500 text-3xl font-bold shadow-xs">
            ⭐
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-3 tracking-tight">
            {isDe ? 'Verifizierte Kundenbewertungen' : 'Verified Customer Reviews'}
          </h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">
            {isDe 
              ? 'Um 100% echte und vertrauenswürdige Bewertungen zu garantieren, ist jede Rezension an eine bestätigte Transaktion gekoppelt.'
              : 'To guarantee 100% genuine and trustworthy ratings, every review is tied to a confirmed transaction.'}
          </p>
          {error && (
            <div className="mb-6 rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] font-semibold text-slate-500">
              {isDe ? 'Hinweis: ' : 'Notice: '} {error}
            </div>
          )}
          <p className="text-xs text-slate-400 mb-8 leading-relaxed">
            {isDe 
              ? 'Nach jedem Kauf kannst du direkt im Checkout oder über deinen persönlichen E-Mail-Link eine Bewertung abgeben.'
              : 'After each purchase you can leave a review directly in checkout or via your personal invitation link.'}
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push('/reviews')}
              className="w-full rounded-xl bg-brand-600 px-5 py-3.5 text-xs font-bold text-white hover:bg-brand-700 transition-all shadow-md hover:shadow-lg cursor-pointer"
            >
              {isDe ? 'Kundenbewertungen ansehen' : 'View customer reviews'}
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full rounded-xl border border-slate-250 bg-white px-5 py-3.5 text-xs font-bold text-slate-650 hover:bg-slate-50 transition-all cursor-pointer"
            >
              {isDe ? 'Zur Startseite' : 'Back to homepage'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Success State
  if (success) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <div className="bg-white border border-slate-150 rounded-3xl p-8 shadow-lg animate-fade-in">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-50 border border-emerald-200 mb-6 text-emerald-600 text-3xl font-bold shadow-xs">
            ✓
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-3 tracking-tight">
            {isDe ? 'Vielen Dank für dein Feedback!' : 'Thank you for your feedback!'}
          </h2>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            {isDe 
              ? 'Deine Bewertung wurde erfolgreich übermittelt und ist nun als verifizierter Kauf in unserem Review-Bereich veröffentlicht.' 
              : 'Your review has been successfully submitted and is now published as a verified purchase in our reviews section.'}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold mb-8">
            <span>✓</span> {isDe ? 'Auszeichnung: Verifizierter Kauf' : 'Badge: Verified Purchase'}
          </div>
          <button
            onClick={() => router.push('/reviews')}
            className="w-full rounded-xl bg-brand-600 px-5 py-3.5 text-xs font-bold text-white hover:bg-brand-700 transition-all shadow-md hover:shadow-lg cursor-pointer"
          >
            {isDe ? 'Zurück zu den Bewertungen' : 'Back to reviews'}
          </button>
        </div>
      </div>
    );
  }

  // 5. Form State (Verified Order)
  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="bg-white border border-slate-150 rounded-3xl p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
            ✓ {isDe ? 'Verifizierter Kauf' : 'Verified Purchase'}
          </span>
          {countryName && (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-650">
              {countryName}
            </span>
          )}
        </div>

        <h1 className="text-2xl font-black tracking-tight text-slate-900 mb-2">
          {customerName && customerName !== 'Kunde' ? `${isDe ? 'Hallo' : 'Hello'} ${customerName}! 👋` : (isDe ? 'Deine Erfahrung mit PureSim' : 'Your experience with PureSim')}
        </h1>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {tariffName 
            ? (isDe ? `Bewerte deinen Kauf von ${tariffName}. Dein Feedback hilft anderen Reisenden!` : `Review your purchase of ${tariffName}. Your feedback helps other travelers!`)
            : (isDe ? 'Teile deine Erfahrung mit PureSim. Dein ehrliches Feedback hilft anderen Reisenden.' : 'Share your experience with PureSim. Your honest rating helps other travelers.')}
        </p>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Star Rating selector */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {isDe ? 'Gesamtbewertung *' : 'Overall Rating *'}
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => {
                const isSelected = hoverRating !== null ? star <= hoverRating : star <= rating;
                return (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-1 cursor-pointer transition-transform duration-150 hover:scale-120 outline-none"
                  >
                    <svg
                      className={`h-9 w-9 ${isSelected ? 'text-amber-400 fill-amber-400 filter drop-shadow-xs' : 'text-slate-200 fill-slate-200'}`}
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

          {/* Quick-Tags */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              {isDe ? 'Was möchtest du hervorheben?' : 'What would you like to highlight?'}
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

          {/* Comment text */}
          <div>
            <label htmlFor="comment" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              {isDe ? 'Erfahrungsbericht (Optional)' : 'Review text (Optional)'}
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-2xl border border-slate-300 px-4 py-3.5 text-xs outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 h-28 leading-relaxed transition-all"
              placeholder={isDe ? 'Beschreibe deine Erfahrung mit dem Service, der Website und der Zahlung...' : 'Describe your experience with the service, website and payment...'}
            />
          </div>

          {/* Display Name Privacy Toggle */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              {isDe ? 'Name für die Veröffentlichung *' : 'Name for publication *'}
            </label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <button
                type="button"
                onClick={() => setNameType('anon')}
                className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all cursor-pointer ${nameType === 'anon' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                👤 {isDe ? 'Anonym verbleiben' : 'Stay Anonymous'}
              </button>
              <button
                type="button"
                onClick={() => setNameType('alias')}
                className={`rounded-xl px-4 py-3 text-xs font-bold border transition-all cursor-pointer ${nameType === 'alias' ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-xs' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
              >
                ✏️ {isDe ? 'Name / Alias wählen' : 'Choose Custom Name'}
              </button>
            </div>

            {nameType === 'alias' && (
              <input
                type="text"
                required
                value={alias}
                onChange={(e) => setAlias(e.target.value)}
                maxLength={50}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-xs outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-50/50 transition-all"
                placeholder={isDe ? 'z.B. Max M. oder CryptoTraveler' : 'e.g. Max M. or CryptoTraveler'}
              />
            )}
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 px-5 py-3.5 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-60 transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
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
              <>{isDe ? 'Verifizierte Bewertung absenden ⭐' : 'Submit Verified Review ⭐'}</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
