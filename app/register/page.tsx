'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/lib/i18n';
import type { TranslationKeys } from '@/lib/i18n';
import { MailIcon, NetworkIcon, EyeIcon, EyeOffIcon, ShieldIcon } from '@/components/Icons';

interface PasswordRule {
  id:    string;
  tKey:  TranslationKeys;
  test:  (pw: string) => boolean;
}

const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',  tKey: 'pw_rule_length',  test: (pw) => pw.length >= 8 },
  { id: 'upper',   tKey: 'pw_rule_upper',   test: (pw) => /[A-Z]/.test(pw) },
  { id: 'lower',   tKey: 'pw_rule_lower',   test: (pw) => /[a-z]/.test(pw) },
  { id: 'number',  tKey: 'pw_rule_number',  test: (pw) => /[0-9]/.test(pw) },
  { id: 'special', tKey: 'pw_rule_special', test: (pw) => /[^A-Za-z0-9]/.test(pw) },
];

const STRENGTH_KEYS = ['' as string, 'pw_weak', 'pw_fair', 'pw_medium', 'pw_strong', 'pw_very_strong'] as const;
const STRENGTH_COLORS = ['bg-slate-200', 'bg-red-500', 'bg-orange-500', 'bg-yellow-400', 'bg-blue-500', 'bg-green-500'];

function getStrength(pw: string) {
  const score = PASSWORD_RULES.filter((r) => r.test(pw)).length;
  return pw.length === 0 ? 0 : score;
}

export default function RegisterPage() {
  const router   = useRouter();
  const supabase = createClient();
  const { t }    = useTranslation();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState(false);

  const rules    = useMemo(() => PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(password) })), [password]);
  const score    = useMemo(() => getStrength(password), [password]);
  const allPassed = rules.every((r) => r.passed);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!allPassed) return;
    setLoading(true);
    setError('');

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  }

  if (success) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center mb-4">
            <MailIcon size={48} className="text-[#1d4ed8]" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('register_success_title')}</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            {t('register_success_sub', { email })}
          </p>
          <Link
            href="/login"
            className="mt-6 inline-block rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            {t('register_success_back')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-2">
            <NetworkIcon size={40} className="text-brand-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{t('register_title')}</h1>
          <p className="text-slate-500 text-sm mt-1">{t('register_sub')}</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          {/* E-mail */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
              {t('register_email')}
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t('register_email_ph')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
              {t('register_pw')}
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPw ? 'text' : 'password'}
                required
                autoComplete="new-password"
                placeholder={t('register_pw_ph')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 pr-10 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 transition"
              />
              <button
                type="button"
                onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-sm flex items-center justify-center"
                tabIndex={-1}
              >
                {showPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              </button>
            </div>

            {password.length > 0 && (
              <div className="mt-2 space-y-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((seg) => (
                    <div
                      key={seg}
                      className={`h-1.5 flex-1 rounded-full transition-colors ${
                        score >= seg ? STRENGTH_COLORS[score] : 'bg-slate-200'
                      }`}
                    />
                  ))}
                </div>
                {score > 0 && (
                  <p className={`text-xs font-medium ${
                    score <= 2 ? 'text-red-500' : score === 3 ? 'text-yellow-600' : score === 4 ? 'text-blue-600' : 'text-green-600'
                  }`}>
                    {score > 0 ? t(STRENGTH_KEYS[score] as import('@/lib/i18n').TranslationKeys) : ''}
                  </p>
                )}
                <ul className="space-y-1">
                  {rules.map((r) => (
                    <li key={r.id} className={`flex items-center gap-1.5 text-xs ${r.passed ? 'text-green-600' : 'text-slate-400'}`}>
                      {r.passed ? (
                        <ShieldIcon size={12} className="text-green-600 shrink-0" />
                      ) : (
                        <span className="inline-block w-3 h-3 rounded-full border border-slate-300 shrink-0" />
                      )}
                      {t(r.tKey)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !allPassed || !email}
            className="w-full rounded-xl bg-brand-600 py-3 font-semibold text-white hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? t('register_loading') : t('register_submit')}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          {t('register_has_account')}{' '}
          <Link href="/login" className="font-medium text-brand-600 hover:text-brand-800 transition-colors">
            {t('register_login')}
          </Link>
        </p>
      </div>
    </div>
  );
}
