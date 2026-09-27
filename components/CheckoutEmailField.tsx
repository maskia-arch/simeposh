'use client';

import { useTranslation } from '@/lib/i18n';
import { validateEmail } from '@/lib/validation/email';

interface CheckoutEmailFieldProps {
  email: string;
  onChange: (value: string) => void;
  error: string;
  onErrorChange: (error: string) => void;
  user: any;
  compact?: boolean;
}

export function CheckoutEmailField({
  email,
  onChange,
  error,
  onErrorChange,
  user,
  compact = false,
}: CheckoutEmailFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1">
      <label
        htmlFor="checkout-email"
        className="block text-[10px] font-bold uppercase tracking-wider text-slate-400"
      >
        {t('checkout_email_label')} <span className="text-red-500 font-bold" aria-hidden="true">*</span>
      </label>

      {user ? (
        <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200/80 px-3 py-2">
          <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
            Eingeloggt
          </span>
        </div>
      ) : (
        <div>
          <input
            id="checkout-email"
            data-testid="checkout-email-input"
            type="email"
            required
            aria-required="true"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby={error ? 'checkout-email-error' : undefined}
            value={email}
            onChange={(e) => {
              const val = e.target.value;
              onChange(val);
              if (error) {
                const res = validateEmail(val);
                if (res.isValid) {
                  onErrorChange('');
                }
              }
            }}
            onBlur={() => {
              const res = validateEmail(email);
              if (!res.isValid) {
                if (res.errorKey === 'empty') {
                  onErrorChange(t('checkout_email_empty'));
                } else {
                  onErrorChange(t('checkout_email_invalid'));
                }
              } else {
                onErrorChange('');
              }
            }}
            placeholder={t('checkout_email_ph')}
            className={`w-full rounded-xl border bg-white px-3 py-2 text-xs font-medium text-slate-900 outline-none transition-all placeholder:text-slate-400 ${
              error
                ? 'border-red-500 ring-2 ring-red-200 focus:border-red-500 focus:ring-red-200'
                : 'border-slate-300 focus:border-brand-500 focus:ring-2 focus:ring-brand-100'
            }`}
          />

          {error ? (
            <p
              id="checkout-email-error"
              data-testid="checkout-email-error"
              role="alert"
              className="mt-1 text-[11px] font-semibold text-red-600 leading-snug"
            >
              {error}
            </p>
          ) : (
            <p className="mt-1 text-[10px] text-slate-400 leading-snug">
              {t('checkout_email_hint')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
