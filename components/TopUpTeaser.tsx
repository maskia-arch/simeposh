'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { NetworkIcon } from '@/components/Icons';
import { useThemeDemo } from '@/lib/theme-demo-context';

export function TopUpTeaser() {
  const { t, locale } = useTranslation();
  const prefix = locale === 'de' ? '' : `/${locale}`;
  const { activeTheme } = useThemeDemo();
  const accentColor = activeTheme.accentColor || activeTheme.heroHighlightColor || '#2563eb';

  return (
    <div className="flex flex-col items-start gap-6 md:flex-row md:items-center md:justify-between">
      <div>
        <h2
          style={{ color: activeTheme.isDark ? (activeTheme.cardTextColor || '#f4f4f5') : undefined }}
          className="text-2xl font-bold text-slate-900 mb-2 flex items-center gap-2"
        >
          <NetworkIcon size={24} style={{ color: accentColor }} className="shrink-0" />
          <span>{t('topup_title')}</span>
        </h2>
        <p
          style={{ color: activeTheme.isDark ? '#a1a1aa' : undefined }}
          className="text-slate-600 max-w-lg"
        >
          {t('topup_sub')}
        </p>
      </div>
      <Link
        href={`${prefix}/topup`}
        style={{
          background: activeTheme.btnPrimaryBg || undefined,
          color: activeTheme.btnPrimaryText || undefined,
        }}
        className="btn-primary shrink-0 shadow-md !px-6 !py-3"
      >
        {t('topup_cta')} →
      </Link>
    </div>
  );
}
