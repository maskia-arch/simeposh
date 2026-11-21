'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { getTheme } from '@/lib/themes';
import { useThemeDemo } from '@/lib/theme-demo-context';
import { ThemeDecorations } from './ThemeDecorations';
import type { Promotion } from '@/lib/pricing-service';

interface Props {
  initialPromo?: Promotion | null;
}

export function PromotionBanner({ initialPromo }: Props) {
  const { locale } = useTranslation();
  const demo = useThemeDemo();
  const [serverPromo, setServerPromo] = useState<Promotion | null>(initialPromo ?? null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // If not provided from server and not in demo mode, fetch from client endpoint
    if (initialPromo === undefined && !demo.isDemoActive) {
      fetch('/api/promotions/active')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.promotion) setServerPromo(data.promotion);
        })
        .catch(() => {});
    }
  }, [initialPromo, demo.isDemoActive]);

  const activePromo = demo.isDemoActive ? demo.activePromo : serverPromo;
  if (!activePromo || dismissed) return null;

  const theme = demo.isDemoActive ? demo.activeTheme : getTheme(activePromo.theme_id);
  const localizedTitle = activePromo.titles?.[locale] || activePromo.titles?.de || activePromo.titles?.en || '';
  const localizedText = activePromo.texts?.[locale] || activePromo.texts?.de || activePromo.texts?.en || '';

  if (!localizedTitle && !localizedText) return null;

  return (
    <>
      <aside
        role="region"
        aria-label="Aktionshinweis"
        className={`${theme.bannerBg} ${theme.bannerText} border-b ${theme.bannerBorder} text-sm transition-colors duration-300 relative z-30`}
      >
        <div className="max-w-7xl mx-auto px-4 py-2 sm:py-2.5 flex items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
            <span className="font-bold tracking-wide uppercase px-2 py-0.5 rounded bg-black/20 text-xs">
              {activePromo.badge_texts?.[locale] || activePromo.badge_texts?.de || 'Aktion'}
            </span>
            <span className="font-medium">
              {localizedTitle}
            </span>
            {localizedText && (
              <span className="hidden md:inline opacity-85 text-xs">
                — {localizedText}
              </span>
            )}
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="text-current opacity-70 hover:opacity-100 p-1 text-sm leading-none rounded focus:outline-none focus:ring-2 focus:ring-current cursor-pointer"
            aria-label="Banner schließen"
          >
            ✕
          </button>
        </div>
      </aside>

      {/* Seasonal decorations if enabled by theme */}
      <ThemeDecorations type={theme.animationType || (theme.hasSnow ? 'snow' : theme.hasFireworks ? 'fireworks' : null)} />
    </>
  );
}
