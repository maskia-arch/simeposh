'use client';

import { useState } from 'react';
import { formatGb } from '@/lib/utils';
import type { Database } from '@/lib/supabase/types';
import { useTranslation } from '@/lib/i18n';
import { Price } from '@/components/Price';
import { CryptoPaySelector } from '@/components/CryptoPaySelector';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface CheckoutModalProps {
  tariff:       Tariff;
  orderType?:   'new_esim' | 'top_up';
  topUpIccid?:  string;
  /** Custom day-pass duration (unlimited configs) — sent so the server recomputes the price. */
  days?:        number;
  onClose:      () => void;
}

export function CheckoutModal({
  tariff,
  orderType = 'new_esim',
  topUpIccid,
  days,
  onClose,
}: CheckoutModalProps) {
  const { t }               = useTranslation();
  const [email, setEmail]   = useState('');
  const isUnlimited = tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              {orderType === 'top_up' ? t('checkout_title_topup') : t('checkout_title_new')}
            </h2>
            <p className="text-sm text-slate-500">{tariff.country_name}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {/* Summary */}
        <div className="mb-5 rounded-xl bg-brand-50 p-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_plan')}</span>
            <span className="font-medium">{tariff.name}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_data')}</span>
            <span className="font-medium">
              {isUnlimited ? t('card_unlimited') : formatGb(tariff.data_gb)}
            </span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">{t('checkout_validity')}</span>
            <span className="font-medium">{tariff.validity_days} {t('checkout_days')}</span>
          </div>
          {orderType === 'top_up' && topUpIccid && (
            <div className="flex justify-between text-sm mb-1">
              <span className="text-slate-600">{t('checkout_iccid')}</span>
              <span className="font-mono text-xs">{topUpIccid}</span>
            </div>
          )}
          <div className="mt-2 flex justify-between border-t border-brand-200 pt-2">
            <span className="font-semibold text-slate-800">{t('checkout_total')}</span>
            <Price eur={tariff.sale_price_eur} className="text-xl font-bold text-brand-700" />
          </div>
        </div>

        {/* Email */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            {t('checkout_email_label')}
          </label>
          <input
            id="email"
            type="email"
            required
            placeholder={t('checkout_email_ph')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-1 text-xs text-slate-400">{t('checkout_email_hint')}</p>
        </div>

        {/* Crypto payment (no third-party processor) */}
        <CryptoPaySelector
          email={email}
          items={[{ tariffId: tariff.id, quantity: 1, days, topUpIccid: orderType === 'top_up' ? topUpIccid : undefined }]}
        />
      </div>
    </div>
  );
}
