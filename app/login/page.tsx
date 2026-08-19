'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import { NetworkIcon, MailIcon } from '@/components/Icons';

function LoginForm() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const supabase     = createClient();
  const { t }        = useTranslation();

  const isVerifiedParam = searchParams.get('verified') === 'true';

  const [email,            setEmail]            = useState('');
  const [password,         setPassword]         = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [isUnverified,     setIsUnverified]     = useState(false);
  const [unverifiedEmail,  setUnverifiedEmail]  = useState('');
  const [resending,        setResending]        = useState(false);
  const [resendSuccess,    setResendSuccess]    = useState('');
  const [resendError,      setResendError]      = useState('');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setIsUnverified(false);
    setResendSuccess('');
    setResendError('');

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });

    if (error) {
      const msg = error.message;
      if (msg === 'email_not_verified' || msg.includes('bestätigt') || msg.includes('not verified')) {
        setIsUnverified(true);
        setUnverifiedEmail(email);
        setError('Deine E-Mail-Adresse wurde noch nicht bestätigt.');
      } else {
        setError(msg);
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
      const data = await res.json();

      if (!res.ok) {
        setResendError(data.error || 'Fehler beim Senden der Aktivierungs-E-Mail.');
      } else {
        setResendSuccess(`✓ Ein neuer Bestätigungslink wurde an ${targetEmail} gesendet! Bitte überprüfe deinen Posteingang und Spam-Ordner.`);
      }
    } catch (err: any) {
      setResendError('Netzwerkfehler. Bitte versuche es später erneut.');
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
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
            ✓ E-Mail-Adresse erfolgreich bestätigt! Du kannst dich jetzt einloggen.
          </div>
        )}

        {/* Unverified Account Warning Box with Resend Option */}
        {isUnverified && (
          <div className="mb-5 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs space-y-3 animate-fadeIn shadow-sm text-slate-800">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <MailIcon size={20} className="text-amber-600 shrink-0" />
              <span>Konto noch nicht aktiviert</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Deine E-Mail-Adresse (<strong>{unverifiedEmail}</strong>) ist noch nicht bestätigt. Bitte klicke auf den Bestätigungslink in deiner Aktivierungs-E-Mail.
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
                  className="w-full rounded-xl bg-amber-600 hover:bg-amber-700 py-2.5 px-3 font-semibold text-white transition-colors disabled:opacity-60 text-xs shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {resending ? (
                    <span>Sende E-Mail...</span>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Aktivierungs-E-Mail erneut senden</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('login_email')}</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{t('login_password')}</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {error && !isUnverified && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors cursor-pointer"
          >
            {loading ? t('login_loading') : t('login_submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('login_no_account')}{' '}
          <Link href="/register" className="font-medium text-brand-600 hover:text-brand-800">
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
