'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { formatDurationWithUnit } from '@/lib/i18n/plural';
import { NetworkIcon, MailIcon, EyeIcon, EyeOffIcon } from '@/components/Icons';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();
  const { locale, t } = useTranslation();

  const isVerifiedParam = searchParams.get('verified') === 'true';
  const hasExpiredError = searchParams.get('error') === 'invalid_or_expired_link';

  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [showPw,           setShowPw]           = useState(false);
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState(hasExpiredError ? (t('reset_pw_error_invalid' as any) || 'Dieser Link ist ungültig oder bereits abgelaufen.') : '');
  const [isUnverified,     setIsUnverified]     = useState(false);
  const [unverifiedEmail,  setUnverifiedEmail]  = useState('');
  const [resending,        setResending]        = useState(false);
  const [resendSuccess,    setResendSuccess]    = useState('');
  const [resendError,      setResendError]      = useState('');

  // 429 Rate Limiting State (handles both API JSON 429 and Cloudflare HTML 429)
  const [isRateLimited,    setIsRateLimited]    = useState(false);
  const [retrySeconds,     setRetrySeconds]     = useState(0);

  // Active countdown effect for rate limit lockout
  useEffect(() => {
    if (!isRateLimited || retrySeconds <= 0) {
      if (isRateLimited && retrySeconds <= 0) {
        setIsRateLimited(false);
        setError('');
      }
      return;
    }
    const timer = setInterval(() => {
      setRetrySeconds((prev) => {
        if (prev <= 1) {
          setIsRateLimited(false);
          setError('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isRateLimited, retrySeconds]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (isRateLimited) return;

    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendSuccess('');
    setResendError('');

    const cleanEmail = email.trim().toLowerCase();
    const { data, error: loginErr } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (loginErr) {
      if (loginErr.status === 429 || loginErr.message === 'rate_limited') {
        const wait = loginErr.retryAfter || 30;
        setIsRateLimited(true);
        setRetrySeconds(wait);
        setLoading(false);
        return;
      }

      const msg = loginErr.message || '';
      if (msg === 'email_not_verified' || msg.includes('bestätigt') || msg.includes('not verified')) {
        setIsUnverified(true);
        setUnverifiedEmail(email);
        setError(t('login_unverified_title'));
      } else if (
        loginErr.status === 401 ||
        loginErr.status === 400 ||
        msg.toLowerCase().includes('ungültig') ||
        msg.toLowerCase().includes('invalid') ||
        msg.toLowerCase().includes('credentials') ||
        msg.toLowerCase().includes('passwort') ||
        msg.toLowerCase().includes('password')
      ) {
        setError(t('login_error_invalid_credentials' as any) || (locale === 'de' ? 'E-Mail oder Passwort ist falsch.' : 'Invalid email or password.'));
      } else {
        setError(msg || (locale === 'de' ? 'E-Mail oder Passwort ist falsch.' : 'Invalid email or password.'));
      }
      setLoading(false);
      return;
    }

    const redirectTo = searchParams.get('redirect');
    if (redirectTo) {
      router.push(redirectTo);
      router.refresh();
      return;
    }
    router.push('/dashboard');
    router.refresh();
  }

  async function handleResendEmail() {
    const targetEmail = unverifiedEmail || email;
    if (!targetEmail) return;

    setResending(true);
    setResendSuccess('');
    setResendError('');

    try {
      const res = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 429) {
          const wait = data.retryAfter || 30;
          setIsRateLimited(true);
          setRetrySeconds(wait);
        } else {
          setResendError(data.error || t('login_resend_error'));
        }
      } else {
        setResendSuccess(t('login_resend_success').replace('{email}', targetEmail));
      }
    } catch (err: any) {
      setResendError(t('login_resend_network_error'));
    } finally {
      setResending(false);
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
          <h1 className="text-2xl font-bold text-slate-900">{t('login_welcome')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('login_sub')}</p>
        </div>

        {/* Verification Success Toast */}
        {isVerifiedParam && (
          <div className="mb-5 rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-xs font-semibold text-emerald-800 text-center animate-fadeIn shadow-sm">
            {t('login_verified_toast')}
          </div>
        )}

        {/* Unverified Account Warning Box with Resend Option */}
        {isUnverified && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs space-y-3 animate-fadeIn shadow-sm text-slate-800">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <MailIcon size={20} className="text-amber-600 shrink-0" />
              <span>{t('login_unverified_title')}</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              {t('login_unverified_desc').replace('{email}', unverifiedEmail)}
            </p>

            {resendSuccess ? (
              <div className="rounded-xl bg-emerald-100 border border-emerald-300 p-3 font-medium text-emerald-900 text-xs animate-fadeIn">
                {resendSuccess}
              </div>
            ) : (
              <div className="pt-1">
                {resendError && (
                  <p className="text-red-600 font-medium mb-2">{resendError}</p>
                )}
                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 px-3 font-semibold text-white transition-colors disabled:opacity-60 text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer min-h-[44px]"
                >
                  {resending ? (
                    <span>{t('login_resending')}</span>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>{t('login_resend_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">{t('login_email')}</label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              placeholder={t('register_email_ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full min-h-[44px] rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition-all"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">{t('login_password')}</label>
              <Link
                href={`${prefix}/forgot-password`}
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded inline-flex items-center min-h-[44px]"
              >
                {t('login_forgot_pw_link' as any) || 'Passwort vergessen?'}
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="current-password"
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

          {/* Fixed-height live status / feedback slot (prevents layout jumping on error show/hide) */}
          <div className="min-h-[54px] flex items-center" role="status" aria-live="polite">
            {isRateLimited ? (
              <div className="w-full rounded-xl bg-amber-50 border border-amber-300 px-3.5 py-2.5 text-xs font-bold text-amber-900 text-center animate-fadeIn">
                ⚠️ {(t('login_rate_limited' as any) || 'Zu viele Versuche. Bitte warte {time}.').replace(
                  '{time}',
                  formatDurationWithUnit(retrySeconds, locale)
                )}
              </div>
            ) : error && !isUnverified ? (
              <div className="w-full rounded-xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-700 text-center animate-fadeIn">
                {error}
              </div>
            ) : (
              <div className="w-full h-[54px] opacity-0 pointer-events-none select-none" aria-hidden="true" />
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
              <span>
                {(t('btn_please_wait' as any) || (locale === 'de' ? 'Bitte warten ({time})' : 'Please wait ({time})')).replace(
                  '{time}',
                  formatDurationWithUnit(retrySeconds, locale)
                )}
              </span>
            ) : (
              <span>{t('login_submit')}</span>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('login_no_account')}{' '}
          <Link href={`${prefix}/register`} className="font-semibold text-brand-600 hover:text-brand-800 transition-colors">
            {t('login_register')}
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[70vh] items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" /></div>}>
      <LoginForm />
    </Suspense>
  );
}
