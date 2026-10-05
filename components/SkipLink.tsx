'use client';

import { useTranslation } from '@/lib/i18n';

export function SkipLink() {
  const { t } = useTranslation();
  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2.5 focus:text-white focus:font-bold focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
    >
      {t('skip_to_content')}
    </a>
  );
}
