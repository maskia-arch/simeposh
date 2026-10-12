'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  display_name: string;
  is_verified: boolean;
  source: string | null;
  reply_text: string | null;
  replied_at: string | null;
  created_at: string;
}

interface Stats {
  totalCount: number;
  averageRating: number;
  distribution: Record<number, number>;
}

function FeedbackCard({ item, locale }: { item: Feedback; locale: string }) {
  const { t } = useTranslation();
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [err, setErr] = useState('');

  const handleTranslate = async () => {
    if (!item.comment) return;
    if (translatedText) {
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    setErr('');
    try {
      const res = await fetch('/api/feedbacks/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment: item.comment, locale })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Fehler bei der Übersetzung');
      }
      setTranslatedText(data.translation);
      setShowOriginal(false);
    } catch (e: any) {
      setErr(e.message || 'Fehler');
    } finally {
      setIsTranslating(false);
    }
  };

  const renderStars = (rating: number, size = 'h-4 w-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  const getInitials = (name: string) => {
    if (!name || name === 'Anonym') return 'A';
    return name.charAt(0).toUpperCase();
  };

  const getAvatarColorClass = (name: string) => {
    if (!name || name === 'Anonym') return 'from-slate-400 to-slate-500';
    const charCode = name.charCodeAt(0);
    const colors = [
      'from-brand-600 to-brand-800',
      'from-indigo-500 to-indigo-700',
      'from-sky-500 to-sky-700',
      'from-violet-500 to-violet-700',
      'from-emerald-500 to-emerald-700',
    ];
    return colors[charCode % colors.length];
  };

  return (
    <div className="border border-slate-150 rounded-3xl p-6 bg-white shadow-xs hover:shadow-md hover:border-slate-200 transition-all duration-300">
      <div className="flex items-start justify-between gap-4 mb-4">
        {/* User profile row */}
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full bg-gradient-to-br ${getAvatarColorClass(item.display_name)} text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-xs`}>
            {getInitials(item.display_name)}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-800 text-sm">{item.display_name}</span>
              
              {item.is_verified && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700">
                  ✓ {t('reviews_verified_badge')}
                </span>
              )}
              
              {/* Legacy Import Source Info Icon */}
              {item.source === 'ValueShop25.com' && (
                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setIsInfoOpen(!isInfoOpen)}
                    className="text-slate-400 hover:text-brand-600 transition-colors p-0.5 focus:outline-none cursor-pointer flex items-center min-w-[24px] min-h-[24px] justify-center"
                    title={t('reviews_source_info_btn')}
                    aria-label={t('reviews_source_info_btn')}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                  
                  {isInfoOpen && (
                    <div className="absolute left-0 top-6 z-20 w-64 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xl text-[11px] text-slate-600 animate-fade-in leading-relaxed">
                      <p className="font-bold text-slate-800 flex items-center gap-1">
                        <span>ℹ️</span> {t('reviews_source_info_title')}
                      </p>
                      <p className="mt-1.5 text-slate-500">
                        {t('reviews_source_info_desc')}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {new Date(item.created_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Stars */}
        <div className="shrink-0">{renderStars(item.rating, 'h-4 w-4')}</div>
      </div>

      {item.comment && (
        <div className="pl-0 md:pl-13">
          <p className="text-slate-700 text-[13px] leading-relaxed whitespace-pre-line">
            {showOriginal ? item.comment : translatedText}
          </p>

          {/* Translate button */}
          <div className="mt-3 flex items-center gap-2">
            {isTranslating ? (
              <span className="inline-block animate-spin h-3.5 w-3.5 rounded-full border-2 border-brand-500 border-t-transparent"></span>
            ) : showOriginal ? (
              <button
                type="button"
                onClick={handleTranslate}
                aria-label={t('reviews_translate_btn')}
                className="text-[10px] font-bold text-brand-600 hover:text-brand-850 cursor-pointer flex items-center gap-1 bg-brand-50 hover:bg-brand-100/70 px-2.5 py-1 rounded-lg transition-all min-h-[32px]"
              >
                🌐 {t('reviews_translate_btn')}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowOriginal(true)}
                aria-label={t('reviews_show_original')}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 cursor-pointer flex items-center gap-1 bg-slate-100 hover:bg-slate-205 px-2.5 py-1 rounded-lg transition-all min-h-[32px]"
              >
                ↩ {t('reviews_show_original')}
              </button>
            )}
            {err && <span className="text-[10px] text-red-500">{err}</span>}
          </div>
        </div>
      )}

      {/* Admin reply section */}
      {item.reply_text && (
        <div className="mt-5 ml-0 md:ml-13 border-t border-slate-100 pt-4 pl-4 border-l-2 border-l-brand-600 bg-brand-50/20 p-4 rounded-r-2xl">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-brand-900 flex items-center gap-1.5">
              💬 {t('reviews_support_reply')}
            </span>
            {item.replied_at && (
              <span className="text-[10px] text-slate-400">
                {new Date(item.replied_at).toLocaleDateString(locale === 'de' ? 'de-DE' : 'en-US', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-650 leading-relaxed">
            {item.reply_text}
          </p>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  const { locale, t } = useTranslation();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalCount: 0,
    averageRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Rating Filter state
  const [ratingFilter, setRatingFilter] = useState<string>('all');

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const res = await fetch('/api/feedbacks');
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Fehler beim Laden der Bewertungen');
        }
        setFeedbacks(data.feedbacks || []);
        setStats(data.stats || {
          totalCount: 0,
          averageRating: 0,
          distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
        });
      } catch (err: any) {
        setError(err.message || 'Ein unerwarteter Fehler ist aufgetreten');
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  const renderStars = (rating: number, size = 'h-4 w-4') => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`${size} ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  // Filter feedbacks locally based on active ratingFilter chip
  const filteredFeedbacks = feedbacks.filter((fb) => {
    if (ratingFilter === 'all') return true;
    return fb.rating.toString() === ratingFilter;
  });

  const ratingChips = ['all', '5', '4', '3', '2', '1'];

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      {/* Header */}
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
          {t('reviews_heading')}{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-brand-850">{t('reviews_heading_highlight')}</span>
        </h1>
        <p className="mt-3 text-slate-500 max-w-2xl mx-auto text-sm leading-relaxed">
          {t('reviews_sub_text')}
        </p>
      </div>

      {error && (
        <div className="mb-8 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Stats Summary Grid */}
      {loading ? (
        <div className="mb-10 grid gap-6 md:grid-cols-3 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs" aria-busy="true">
          <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-6 md:border-b-0 md:border-r md:pb-0 motion-safe:animate-pulse">
            <div className="h-16 w-28 rounded-2xl bg-slate-200" />
            <div className="mt-4 h-5 w-28 rounded-lg bg-slate-100" />
            <div className="mt-3 h-4 w-36 rounded-md bg-slate-100" />
          </div>
          <div className="md:col-span-2 space-y-3.5 flex flex-col justify-center motion-safe:animate-pulse">
            {[5, 4, 3, 2, 1].map((stars) => (
              <div key={stars} className="flex items-center gap-3.5 text-xs font-semibold text-slate-400">
                <span className="w-14 shrink-0 text-right">{stars} {t('reviews_stars_word')}</span>
                <div className="h-3 flex-1 rounded-full bg-slate-100 overflow-hidden" />
                <div className="w-8 h-3 rounded bg-slate-100 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-10 grid gap-6 md:grid-cols-3 bg-white border border-slate-200/80 rounded-3xl p-6 md:p-8 shadow-xs">
          {/* Large Average Score */}
          <div className="flex flex-col items-center justify-center border-b border-slate-100 pb-6 md:border-b-0 md:border-r md:pb-0">
            <p className="text-6xl font-black text-slate-900 tracking-tight">{stats.averageRating}</p>
            <div className="mt-3">{renderStars(Math.round(stats.averageRating), 'h-5 w-5')}</div>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              {t('reviews_based_on').replace('{count}', String(stats.totalCount))}
            </p>
          </div>

          {/* Rating Bars Distribution */}
          <div className="md:col-span-2 space-y-3 flex flex-col justify-center">
            {[5, 4, 3, 2, 1].map((stars) => {
              const count = stats.distribution[stars] || 0;
              const percentage = stats.totalCount > 0 ? (count / stats.totalCount) * 100 : 0;
              return (
                <div key={stars} className="flex items-center gap-3.5 text-xs font-semibold text-slate-600">
                  <span className="w-14 shrink-0 text-right">
                    {stars} {t('reviews_stars_word')}
                  </span>
                  <div className="h-3 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-8 text-slate-400 text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters & CTA Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 pb-5">
        {/* Filter chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Filter:
          </span>
          <div className="flex gap-2">
            {ratingChips.map((chip) => {
              const isActive = ratingFilter === chip;
              const label = chip === 'all' ? t('reviews_filter_all') : `${chip} ★`;
              return (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setRatingFilter(chip)}
                  aria-label={chip === 'all' ? t('reviews_filter_all') : `${chip} ${t('reviews_stars_word')}`}
                  className={`rounded-full px-4 py-1.5 text-xs font-bold border transition-all cursor-pointer whitespace-nowrap min-h-[32px] ${isActive ? 'bg-brand-600 border-brand-600 text-white shadow-xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Trust Notice Info box */}
      <div className="mb-8 rounded-2xl border border-blue-150 bg-brand-50/20 px-5 py-4 text-xs font-medium text-brand-850 flex items-start gap-3">
        <span className="text-base leading-none">🔒</span>
        <div>
          <p className="font-bold text-slate-800 mb-0.5">
            {t('reviews_verified_title')}
          </p>
          <p className="leading-relaxed text-slate-500">
            {t('reviews_verified_desc')}
          </p>
        </div>
      </div>

      {/* Feedbacks List */}
      {loading ? (
        <div className="space-y-5" aria-busy="true" aria-label={t('reviews_loading')}>
          <span className="sr-only">{t('reviews_loading')}</span>
          {[1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="border border-slate-150 rounded-3xl p-6 bg-white shadow-xs motion-safe:animate-pulse space-y-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-1.5">
                    <div className="h-4 w-32 rounded bg-slate-200" />
                    <div className="h-3 w-20 rounded bg-slate-100" />
                  </div>
                </div>
                <div className="h-4 w-24 rounded bg-slate-200 shrink-0" />
              </div>
              <div className="space-y-2 pt-1 md:pl-13">
                <div className="h-3.5 w-full rounded bg-slate-100" />
                <div className="h-3.5 w-5/6 rounded bg-slate-100" />
                <div className="h-3.5 w-2/3 rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredFeedbacks.length === 0 ? (
        <div className="text-center py-16 bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl">
          <p className="text-slate-500 font-medium">
            {t('reviews_empty_filter')}
          </p>
          <button
            type="button"
            onClick={() => setRatingFilter('all')}
            className="text-xs font-bold text-brand-600 mt-2 hover:underline cursor-pointer min-h-[32px] inline-flex items-center justify-center px-3"
          >
            {t('reviews_reset_filter')}
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredFeedbacks.map((item) => (
            <FeedbackCard key={item.id} item={item} locale={locale} />
          ))}
        </div>
      )}
    </div>
  );
}
