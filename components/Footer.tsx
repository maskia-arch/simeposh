'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

export function Footer() {
  const { t } = useTranslation();
  const year  = new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white mt-16">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-3">
          <div>
            <p className="text-lg font-bold text-brand-700">📡 {t('nav_tagline')}</p>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {t('hero_badge')}
            </p>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-3">{t('footer_nav_title')}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/tariffs"   className="hover:text-brand-700 transition-colors">{t('footer_browse')}</Link></li>
              <li><Link href="/topup"     className="hover:text-brand-700 transition-colors">{t('footer_topup')}</Link></li>
              <li><Link href="/dashboard" className="hover:text-brand-700 transition-colors">{t('footer_dashboard')}</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-slate-800 mb-3">{t('footer_legal_title')}</p>
            <ul className="space-y-2 text-sm text-slate-500">
              <li><Link href="/impressum"   className="hover:text-brand-700 transition-colors">{t('footer_imprint')}</Link></li>
              <li><Link href="/datenschutz" className="hover:text-brand-700 transition-colors">{t('footer_privacy')}</Link></li>
              <li><Link href="/agb"         className="hover:text-brand-700 transition-colors">{t('footer_terms')}</Link></li>
            </ul>
          </div>
        </div>
        <div className="mt-8 border-t border-slate-100 pt-6 text-center text-xs text-slate-400">
          {t('footer_copy', { year })}
        </div>
      </div>
    </footer>
  );
}
