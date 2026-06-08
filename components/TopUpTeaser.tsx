'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function TopUpTeaser() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">
          📶 {t('topup_title')}
        </h2>
        <p className="text-slate-600 max-w-lg">
          {t('topup_sub')}
        </p>
      </div>
      <Link
        href="/topup"
        className="shrink-0 rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white hover:bg-brand-700 transition-colors shadow-md"
      >
        {t('topup_cta')} →
      </Link>
    </div>
  );
}
