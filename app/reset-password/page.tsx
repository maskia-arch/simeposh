'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';
import { formatDurationWithUnit } from '@/lib/i18n/plural';
import { NetworkIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';

function ResetPasswordForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { locale, t } = useTranslation();

  const token = searchParams.get('token') || '';

  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState(false);
  const [isRateLimited,setIsRateLimited]= useState(false);
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

    if (!token) {
      setError(t('reset_pw_error_invalid' as any) || 'Dieser Link ist ungültig oder bereits abgelaufen.');
      return;
    }

    if (password.length < 8) {
      setError(t('pw_rule_length' as any) || 'Das Passwort muss mindestens 8 Zeichen lang sein.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          const wait = data.retryAfter || 30;
          setIsRateLimited(true);
          setRetrySeconds(wait);
        } else {
          setError(data.error || t('reset_pw_error_invalid' as any));
        }
      } else {
        setSuccess(true);
        const prefix = locale === 'de' ? '' : `/${locale}`;
        setTimeout(() => {
          router.push(`${prefix}/login?pwReset=true`);
        }, 2000);
      }
    } catch {
      setError('Verbindungsfehler beim Speichern des neuen Passworts.');
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
            {t('reset_pw_title' as any) || 'Neues Passwort festlegen'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {t('reset_pw_desc' as any) || 'Gib ein neues Passwort mit mindestens 6 Zeichen ein.'}
          </p>
        </div>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-5 text-center space-y-3 shadow-sm animate-fadeIn">
            <p className="text-xs text-emerald-900 font-bold">
              {t('reset_pw_success' as any) || 'Dein Passwort wurde erfolgreich aktualisiert. Du wirst zum Login weitergeleitet.'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="reset-password" className="block text-sm font-medium text-slate-700 mb-1">
                {t('login_password')}
              </label>
              <div className="relative">
                <input
                  id="reset-password"
                  type={showPw ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  placeholder={t('register_pw_ph')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 pr-12 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  aria-label={showPw ? t('pw_toggle_hide') : t('pw_toggle_show')}
                  aria-pressed={showPw}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 flex items-center justify-center cursor-pointer min-w-[44px] min-h-[44px] rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                >
                  {showPw ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
                </button>
              </div>
            </div>

            <div className="min-h-[44px] flex items-center" role="status" aria-live="polite">
              {isRateLimited ? (
                <div className="w-full rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2.5 text-xs font-bold text-amber-900 text-center animate-fadeIn">
                  ⚠️ {(t('login_rate_limited' as any) || 'Zu viele Versuche. Bitte warte {time}.').replace(
                    '{time}',
                    formatDurationWithUnit(retrySeconds, locale)
                  )}
                </div>
              ) : error ? (
                <div className="w-full rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700 text-center animate-fadeIn">
                  {error}
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
                <span>{t('reset_pw_btn' as any) || 'Passwort speichern'}</span>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
