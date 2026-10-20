'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { formatDurationWithUnit } from '@/lib/i18n/plural';
import { NetworkIcon } from '@/components/Icons';

export default function ForgotPasswordPage() {
  const { locale, t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [retrySeconds, setRetrySeconds] = useState(0);

  useEffect(() => {
    if (!isRateLimited || retrySeconds <= 0) {
      if (isRateLimited && retrySeconds <= 0) {
        setIsRateLimited(false);
      }
      return;
    }
    const timer = setInterval(() => {
      setRetrySeconds((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRateLimited, retrySeconds]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isRateLimited) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 429) {
        const wait = data.retryAfter || 30;
        setIsRateLimited(true);
        setRetrySeconds(wait);
      } else {
        setSubmitted(true);
      }
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  const prefix = locale === 'de' ? '' : `/${locale}`;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <NetworkIcon size={40} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t('forgot_pw_title' as any) || 'Passwort zurücksetzen'}
          </h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            {t('forgot_pw_desc' as any) || 'Gib deine E-Mail-Adresse ein. Wir senden dir einen Link zum Festlegen eines neuen Passworts.'}
          </p>
        </div>

        {submitted ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-4 shadow-sm animate-fadeIn">
            <div className="text-2xl">✉️</div>
            <p className="text-xs text-emerald-900 font-medium leading-relaxed">
              Wenn die Adresse gültig ist, haben wir dir einen Link zum Zurücksetzen deines Passworts geschickt. Bitte prüfe auch deinen Spam-Ordner.
            </p>
            <Link
              href={`${prefix}/login`}
              className="inline-flex min-h-[44px] items-center justify-center w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs py-2.5 px-4 transition-colors"
            >
              {t('forgot_pw_back_to_login' as any) || 'Zurück zur Anmeldung'}
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1">
                {t('login_email')}
              </label>
              <input
                id="forgot-email"
                type="email"
                required
                autoComplete="email"
                placeholder={t('register_email_ph')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
              />
            </div>

            <div className="min-h-[44px] flex items-center" role="status" aria-live="polite">
              {isRateLimited ? (
                <div className="w-full rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2.5 text-xs font-bold text-amber-900 text-center animate-fadeIn">
                  ⚠️ {(t('login_rate_limited' as any) || 'Zu viele Versuche. Bitte warte {time}.').replace(
                    '{time}',
                    formatDurationWithUnit(retrySeconds, locale)
                  )}
                </div>
              ) : (
                <div className="w-full h-full opacity-0 pointer-events-none select-none" aria-hidden="true" />
              )}
            </div>

            <button
              type="submit"
              disabled={loading || isRateLimited}
              className="w-full min-h-[44px] btn-primary disabled:opacity-50 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>{t('login_loading')}</span>
              ) : isRateLimited ? (
                <span>{formatDurationWithUnit(retrySeconds, locale)}</span>
              ) : (
                <span>{t('forgot_pw_btn' as any) || 'Reset-Link senden'}</span>
              )}
            </button>

            <div className="text-center pt-2">
              <Link
                href={`${prefix}/login`}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
              >
                ← {t('forgot_pw_back_to_login' as any) || 'Zurück zur Anmeldung'}
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
