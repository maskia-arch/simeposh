'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { THEMES, ThemeConfig, ThemeAnimationType, getTheme } from './themes';
import type { Promotion } from './pricing-service';

export interface ThemePreset {
  id: string;
  name: string;
  themeId: string;
  discountPct: number;
  roundingStrategy: 'x9_down' | 'existing_x9';
  showReferencePrice: boolean;
  titleDe: string;
  titleEn: string;
  badgeDe: string;
  badgeEn: string;
  hasSnow?: boolean;
  hasFireworks?: boolean;
  animationType?: ThemeAnimationType;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'black_week',
    name: 'Black Week (15 %)',
    themeId: 'black_week',
    discountPct: 15,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Black Week: 15 % Rabatt auf alle neuen eSIM-Tarife',
    titleEn: 'Black Week: 15% off all new eSIM plans',
    badgeDe: '−15 %',
    badgeEn: '−15%',
    animationType: 'autumn_leaves',
  },
  {
    id: 'black_friday',
    name: 'Black Friday (25 %)',
    themeId: 'black_friday',
    discountPct: 25,
    roundingStrategy: 'x9_down',
    showReferencePrice: true,
    titleDe: 'Black Friday Deal: 25 % Rabatt auf alle neuen eSIMs – Nur heute!',
    titleEn: 'Black Friday Deal: 25% off all new eSIMs – Today only!',
    badgeDe: '−25 %',
    badgeEn: '−25%',
    animationType: 'confetti',
  },
  {
    id: 'cyber_monday',
    name: 'Cyber Monday (20 %)',
    themeId: 'cyber_monday',
    discountPct: 20,
    roundingStrategy: 'x9_down',
    showReferencePrice: true,
    titleDe: 'Cyber Monday: 20 % Rabatt auf alle eSIM-Pakete bis Mitternacht',
    titleEn: 'Cyber Monday: 20% off all eSIM packages until midnight',
    badgeDe: '−20 %',
    badgeEn: '−20%',
    animationType: 'confetti',
  },
  {
    id: 'weihnachten',
    name: 'Weihnachten (10 % + Schnee)',
    themeId: 'weihnachten',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Frohe Feiertage: 10 % Rabatt für deine Winter-Reisen',
    titleEn: 'Happy Holidays: 10% off for your winter travels',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    hasSnow: true,
    animationType: 'snow',
  },
  {
    id: 'silvester',
    name: 'Silvester / Neujahr (15 % + Feuerwerk)',
    themeId: 'silvester',
    discountPct: 15,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Frohes neues Jahr: 15 % Neujahrs-Rabatt auf weltweites Roaming',
    titleEn: 'Happy New Year: 15% New Year discount on global roaming',
    badgeDe: '−15 %',
    badgeEn: '−15%',
    hasFireworks: true,
    animationType: 'fireworks',
  },
  {
    id: 'sommer',
    name: 'Sommerurlaub (10 %)',
    themeId: 'sommer',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Summer Sale: 10 % Rabatt auf alle beliebten Urlaubs-Destinationen',
    titleEn: 'Summer Sale: 10% off all popular holiday destinations',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    animationType: 'sun_sparkles',
  },
  {
    id: 'ostern',
    name: 'Oster-Special (10 %)',
    themeId: 'ostern',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Oster-Angebot: 10 % Frühlings-Rabatt auf alle eSIMs',
    titleEn: 'Easter Special: 10% spring discount on all eSIMs',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    animationType: 'confetti',
  },
  {
    id: 'valentinstag',
    name: 'Valentinstag (14 % + Herzen)',
    themeId: 'weihnachten',
    discountPct: 14,
    roundingStrategy: 'x9_down',
    showReferencePrice: true,
    titleDe: 'Reise zu zweit: 14 % Valentinstags-Rabatt auf alle Tarife',
    titleEn: 'Travel together: 14% Valentine discount on all plans',
    badgeDe: '−14 %',
    badgeEn: '−14%',
    animationType: 'hearts',
  },
  {
    id: 'neutral',
    name: 'Feiertag Neutral (10 %)',
    themeId: 'neutral',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: 'Sonder-Aktion: 10 % Rabatt auf alle neuen Tarife',
    titleEn: 'Special Offer: 10% off all new plans',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    animationType: 'none',
  },
  {
    id: 'standard',
    name: 'Standard (Keine Aktion)',
    themeId: 'standard',
    discountPct: 0,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    titleDe: '',
    titleEn: '',
    badgeDe: '',
    badgeEn: '',
    animationType: 'none',
  },
];

interface ThemeDemoContextType {
  isDemoActive: boolean;
  activePresetId: string;
  activeTheme: ThemeConfig;
  activePromo: Promotion | null;
  customThemes: Record<string, ThemeConfig>;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  selectPreset: (presetId: string) => void;
  updateActivePreset: (updates: Partial<ThemePreset>) => void;
  updateThemeColors: (themeId: string, updates: Partial<ThemeConfig>) => void;
  toggleDemo: (active?: boolean) => void;
  resetToDefaults: () => void;
}

const ThemeDemoContext = createContext<ThemeDemoContextType | null>(null);

export function ThemeDemoProvider({ children }: { children: ReactNode }) {
  const isTestEnv = process.env.NEXT_PUBLIC_IS_TESTENV === 'true';
  const [isDemoActive, setIsDemoActive] = useState<boolean>(isTestEnv);
  const [activePresetId, setActivePresetId] = useState<string>('black_friday');
  const [presets, setPresets] = useState<ThemePreset[]>(THEME_PRESETS);
  const [customThemes, setCustomThemes] = useState<Record<string, ThemeConfig>>(THEMES);
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [livePromo, setLivePromo] = useState<Promotion | null>(null);

  // Initialize demo mode or load live promotion
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000';

    const savedDemoState = localStorage.getItem('puresim_theme_demo_active');
    const savedPreset = localStorage.getItem('puresim_theme_demo_preset');
    const savedCustomThemes = localStorage.getItem('puresim_theme_demo_custom_themes');

    if (savedCustomThemes) {
      try {
        setCustomThemes({ ...THEMES, ...JSON.parse(savedCustomThemes) });
      } catch {}
    }

    const shouldEnableDemo = demoParam === 'true' || demoParam === '1' || savedDemoState === 'true' || (isLocalhost && savedDemoState !== 'false');
    if (shouldEnableDemo) {
      setIsDemoActive(true);
      if (savedPreset && THEME_PRESETS.some((p) => p.id === savedPreset)) {
        setActivePresetId(savedPreset);
      }
    } else {
      // In production mode, fetch active promotion from API
      fetch('/api/promotions/active')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.promotion) {
            setLivePromo(data.promotion);
          }
        })
        .catch(() => {});
    }
  }, []);

  const currentPreset = presets.find((p) => p.id === activePresetId) || presets[0];
  const activeThemeId = isDemoActive ? currentPreset.themeId : (livePromo?.theme_id || 'standard');

  const activeTheme: ThemeConfig = isDemoActive
    ? {
        ...(customThemes[currentPreset.themeId] || getTheme(currentPreset.themeId)),
        hasSnow: currentPreset.hasSnow ?? (customThemes[currentPreset.themeId]?.hasSnow || false),
        hasFireworks: currentPreset.hasFireworks ?? (customThemes[currentPreset.themeId]?.hasFireworks || false),
        animationType: currentPreset.animationType ?? customThemes[currentPreset.themeId]?.animationType ?? 'none',
      }
    : (customThemes[activeThemeId] || getTheme(activeThemeId));

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.theme = activeTheme.id;
      document.documentElement.dataset.themeDark = activeTheme.isDark ? 'true' : 'false';
      const root = document.documentElement;

      if (activeTheme.pageBgColor) {
        document.body.style.backgroundColor = activeTheme.pageBgColor;
        document.body.style.color = activeTheme.pageTextColor || '#0f172a';
        root.style.setProperty('--theme-page-bg', activeTheme.pageBgColor);
        root.style.setProperty('--theme-page-text', activeTheme.pageTextColor || '#0f172a');
      } else {
        document.body.style.backgroundColor = '';
        document.body.style.color = '';
        root.style.removeProperty('--theme-page-bg');
        root.style.removeProperty('--theme-page-text');
      }

      if (activeTheme.navBgColor) {
        root.style.setProperty('--theme-nav-bg', activeTheme.navBgColor);
      }
      if (activeTheme.heroBgStyle) {
        root.style.setProperty('--theme-hero-bg', activeTheme.heroBgStyle);
      }
      if (activeTheme.cardBgColor) {
        root.style.setProperty('--theme-card-bg', activeTheme.cardBgColor);
      } else {
        root.style.removeProperty('--theme-card-bg');
      }
      if (activeTheme.cardBorderColor) {
        root.style.setProperty('--theme-card-border', activeTheme.cardBorderColor);
      } else {
        root.style.removeProperty('--theme-card-border');
      }
      root.style.setProperty('--theme-card-text', activeTheme.cardTextColor || (activeTheme.isDark ? '#f4f4f5' : '#0f172a'));

      const accent = activeTheme.accentColor || activeTheme.heroHighlightColor || '#2563eb';
      const accentBg = activeTheme.accentBgColor || 'rgba(37, 99, 235, 0.1)';
      const accentText = activeTheme.accentTextColor || accent;
      root.style.setProperty('--theme-accent', accent);
      root.style.setProperty('--theme-accent-bg', accentBg);
      root.style.setProperty('--theme-accent-text', accentText);

      if (activeTheme.btnPrimaryBg) {
        root.style.setProperty('--theme-btn-primary-bg', activeTheme.btnPrimaryBg);
      } else {
        root.style.removeProperty('--theme-btn-primary-bg');
      }
      if (activeTheme.btnPrimaryText) {
        root.style.setProperty('--theme-btn-primary-text', activeTheme.btnPrimaryText);
      } else {
        root.style.removeProperty('--theme-btn-primary-text');
      }
      if (activeTheme.btnSecondaryBg) {
        root.style.setProperty('--theme-btn-secondary-bg', activeTheme.btnSecondaryBg);
      } else {
        root.style.removeProperty('--theme-btn-secondary-bg');
      }
      if (activeTheme.btnSecondaryText) {
        root.style.setProperty('--theme-btn-secondary-text', activeTheme.btnSecondaryText);
      } else {
        root.style.removeProperty('--theme-btn-secondary-text');
      }
      if (activeTheme.btnSecondaryBorder) {
        root.style.setProperty('--theme-btn-secondary-border', activeTheme.btnSecondaryBorder);
      } else {
        root.style.removeProperty('--theme-btn-secondary-border');
      }
    }
  }, [activeTheme]);

  // Build synthetic demo promotion or provide live promotion
  const demoPromo: Promotion | null = isDemoActive && currentPreset.discountPct > 0 ? {
    id: `demo-${currentPreset.id}`,
    slug: `demo-${currentPreset.id}`,
    internal_name: `Demo: ${currentPreset.name}`,
    titles: {
      de: currentPreset.titleDe,
      en: currentPreset.titleEn,
    },
    texts: {
      de: 'Live Demo-Modus: Rabatt wird auf der gesamten Website simuliert.',
      en: 'Live demo mode: discount is simulated across the entire site.',
    },
    badge_texts: {
      de: currentPreset.badgeDe,
      en: currentPreset.badgeEn,
    },
    discount_basis_points: Math.round(currentPreset.discountPct * 100),
    rounding_strategy: currentPreset.roundingStrategy,
    show_reference_price: currentPreset.showReferencePrice,
    scope: 'new_esim',
    applies_to_topup: false,
    applies_to_cash: false,
    allow_voucher_stacking: false,
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    priority: 100,
    status: 'active',
    theme_id: currentPreset.themeId,
    version: 1,
  } : null;

  const activePromo = isDemoActive ? demoPromo : livePromo;

  const selectPreset = (presetId: string) => {
    setActivePresetId(presetId);
    try {
      localStorage.setItem('puresim_theme_demo_preset', presetId);
      localStorage.setItem('puresim_theme_demo_active', 'true');
    } catch {}
    setIsDemoActive(true);
  };

  const updateActivePreset = (updates: Partial<ThemePreset>) => {
    setPresets((prev) =>
      prev.map((p) => (p.id === activePresetId ? { ...p, ...updates } : p))
    );
  };

  const updateThemeColors = (themeId: string, updates: Partial<ThemeConfig>) => {
    setCustomThemes((prev) => {
      const updated = {
        ...prev,
        [themeId]: {
          ...(prev[themeId] || getTheme(themeId)),
          ...updates,
        },
      };
      try {
        localStorage.setItem('puresim_theme_demo_custom_themes', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleDemo = (active?: boolean) => {
    const next = active !== undefined ? active : !isDemoActive;
    setIsDemoActive(next);
    try {
      localStorage.setItem('puresim_theme_demo_active', String(next));
    } catch {}
  };

  const resetToDefaults = () => {
    setPresets(THEME_PRESETS);
    setCustomThemes(THEMES);
    try {
      localStorage.removeItem('puresim_theme_demo_custom_themes');
    } catch {}
  };

  return (
    <ThemeDemoContext.Provider
      value={{
        isDemoActive,
        activePresetId,
        activeTheme,
        activePromo,
        customThemes,
        isPanelOpen,
        setIsPanelOpen,
        selectPreset,
        updateActivePreset,
        updateThemeColors,
        toggleDemo,
        resetToDefaults,
      }}
    >
      {children}
    </ThemeDemoContext.Provider>
  );
}

export function useThemeDemo() {
  const context = useContext(ThemeDemoContext);
  if (!context) {
    // Return safe fallback if not wrapped
    return {
      isDemoActive: false,
      activePresetId: 'standard',
      activeTheme: THEMES.standard,
      activePromo: null,
      customThemes: THEMES,
      isPanelOpen: false,
      setIsPanelOpen: () => {},
      selectPreset: () => {},
      updateActivePreset: () => {},
      updateThemeColors: () => {},
      toggleDemo: () => {},
      resetToDefaults: () => {},
    };
  }
  return context;
}
