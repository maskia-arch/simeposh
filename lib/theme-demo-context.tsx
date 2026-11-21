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
  scope?: 'new_esim' | 'all' | 'specific';
  appliesToTopup?: boolean;
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
    name: 'Black Week (15 % · eSIM & Top-up)',
    themeId: 'black_week',
    discountPct: 15,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Black Week: 15 % Rabatt auf alle neuen eSIMs & Top-ups',
    titleEn: 'Black Week: 15% off all new eSIM plans & top-ups',
    badgeDe: '−15 %',
    badgeEn: '−15%',
    animationType: 'autumn_leaves',
  },
  {
    id: 'black_friday',
    name: 'Black Friday (25 % · Nur neue eSIMs)',
    themeId: 'black_friday',
    discountPct: 25,
    roundingStrategy: 'x9_down',
    showReferencePrice: true,
    scope: 'new_esim',
    appliesToTopup: false,
    titleDe: 'Black Friday Deal: 25 % Rabatt auf alle neuen eSIMs (keine Top-ups) – Nur heute!',
    titleEn: 'Black Friday Deal: 25% off all new eSIMs (no top-ups) – Today only!',
    badgeDe: '−25 %',
    badgeEn: '−25%',
    animationType: 'confetti',
  },
  {
    id: 'cyber_monday',
    name: 'Cyber Monday (20 % · eSIM & Top-up)',
    themeId: 'cyber_monday',
    discountPct: 20,
    roundingStrategy: 'x9_down',
    showReferencePrice: true,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Cyber Monday: 20 % Rabatt auf alle neuen eSIMs & Top-ups bis Mitternacht',
    titleEn: 'Cyber Monday: 20% off all new eSIM plans & top-ups until midnight',
    badgeDe: '−20 %',
    badgeEn: '−20%',
    animationType: 'confetti',
  },
  {
    id: 'weihnachten',
    name: 'Weihnachten (10 % + Schnee · eSIM & Top-up)',
    themeId: 'weihnachten',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Frohe Feiertage: 10 % Rabatt auf alle neuen eSIMs & Top-ups für deine Winter-Reisen',
    titleEn: 'Happy Holidays: 10% off all new eSIMs & top-ups for your winter travels',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    hasSnow: true,
    animationType: 'snow',
  },
  {
    id: 'silvester',
    name: 'Silvester / Neujahr (15 % + Feuerwerk · eSIM & Top-up)',
    themeId: 'silvester',
    discountPct: 15,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Frohes neues Jahr: 15 % Neujahrs-Rabatt auf alle eSIMs & Top-ups',
    titleEn: 'Happy New Year: 15% New Year discount on all eSIMs & top-ups',
    badgeDe: '−15 %',
    badgeEn: '−15%',
    hasFireworks: true,
    animationType: 'fireworks',
  },
  {
    id: 'sommer',
    name: 'Sommerurlaub (10 % · eSIM & Top-up)',
    themeId: 'sommer',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Summer Sale: 10 % Rabatt auf alle beliebten Urlaubs-Destinationen & Top-ups',
    titleEn: 'Summer Sale: 10% off all popular holiday destinations & top-ups',
    badgeDe: '−10 %',
    badgeEn: '−10%',
    animationType: 'sun_sparkles',
  },
  {
    id: 'ostern',
    name: 'Oster-Special (10 % · eSIM & Top-up)',
    themeId: 'ostern',
    discountPct: 10,
    roundingStrategy: 'x9_down',
    showReferencePrice: false,
    scope: 'all',
    appliesToTopup: true,
    titleDe: 'Oster-Angebot: 10 % Frühlings-Rabatt auf alle eSIMs & Top-ups',
    titleEn: 'Easter Special: 10% spring discount on all eSIMs & top-ups',
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
  activeTopupPromo: Promotion | null;
  presets: ThemePreset[];
  customThemes: Record<string, ThemeConfig>;
  isPanelOpen: boolean;
  setIsPanelOpen: (open: boolean) => void;
  selectPreset: (presetId: string) => void;
  updateActivePreset: (updates: Partial<ThemePreset>) => void;
  updateThemeColors: (themeId: string, updates: Partial<ThemeConfig>) => void;
  createNewPreset: (name?: string, baseThemeId?: string) => string;
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
  const [liveTopupPromo, setLiveTopupPromo] = useState<Promotion | null>(null);

  // Initialize demo mode in testenv/localhost OR load live promotions in production
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.port === '3000';

    const isTestMode = isTestEnv || isLocalhost;

    // PRODUCTION SECURITY GUARD:
    // On production (puresim.net), demo mode is strictly disallowed and impossible to activate.
    // Clean up any stale demo keys from localStorage and fetch official server promotions.
    if (!isTestMode) {
      setIsDemoActive(false);
      try {
        localStorage.removeItem('puresim_theme_demo_active');
        localStorage.removeItem('puresim_theme_demo_preset');
        localStorage.removeItem('puresim_theme_demo_custom_themes');
        localStorage.removeItem('puresim_theme_demo_custom_presets');
      } catch {}

      fetch('/api/promotions/active')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.promotion) {
            setLivePromo(data.promotion);
          }
          if (data?.topupPromotion) {
            setLiveTopupPromo(data.topupPromotion);
          }
        })
        .catch(() => {});
      return;
    }

    // TEST ENVIRONMENT / LOCALHOST ONLY:
    const urlParams = new URLSearchParams(window.location.search);
    const demoParam = urlParams.get('demo');
    const savedDemoState = localStorage.getItem('puresim_theme_demo_active');
    const savedPreset = localStorage.getItem('puresim_theme_demo_preset');
    const savedCustomThemes = localStorage.getItem('puresim_theme_demo_custom_themes');
    const savedCustomPresets = localStorage.getItem('puresim_theme_demo_custom_presets');

    if (savedCustomThemes) {
      try {
        setCustomThemes({ ...THEMES, ...JSON.parse(savedCustomThemes) });
      } catch {}
    }

    if (savedCustomPresets) {
      try {
        const parsed = JSON.parse(savedCustomPresets);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setPresets([...THEME_PRESETS, ...parsed]);
        }
      } catch {}
    }

    const shouldEnableDemo = demoParam === 'true' || demoParam === '1' || savedDemoState === 'true' || (isLocalhost && savedDemoState !== 'false');
    if (shouldEnableDemo) {
      setIsDemoActive(true);
      if (savedPreset) {
        setActivePresetId(savedPreset);
      }
    } else {
      // In test mode without active demo, also fetch active promotions from API
      fetch('/api/promotions/active')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.promotion) {
            setLivePromo(data.promotion);
          }
          if (data?.topupPromotion) {
            setLiveTopupPromo(data.topupPromotion);
          }
        })
        .catch(() => {});
    }
  }, [isTestEnv]);

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
    scope: currentPreset.scope || (currentPreset.appliesToTopup ? 'all' : 'new_esim'),
    applies_to_topup: Boolean(currentPreset.appliesToTopup),
    applies_to_cash: false,
    allow_voucher_stacking: false,
    starts_at: new Date(Date.now() - 3600000).toISOString(),
    ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
    priority: 100,
    status: 'active',
    theme_id: currentPreset.themeId,
    version: 1,
  } : null;

  const fallbackTopupPreset = presets.find((p) => p.appliesToTopup && p.discountPct > 0);
  const demoTopupPromo: Promotion | null = currentPreset.appliesToTopup
    ? demoPromo
    : (fallbackTopupPreset ? {
        id: `demo-${fallbackTopupPreset.id}-topup`,
        slug: `demo-${fallbackTopupPreset.id}-topup`,
        internal_name: `Demo: ${fallbackTopupPreset.name}`,
        titles: {
          de: fallbackTopupPreset.titleDe,
          en: fallbackTopupPreset.titleEn,
        },
        texts: {
          de: 'Top-up Rabatt greift aus der parallelen Aktion (z. B. Black Week).',
          en: 'Top-up discount applies from concurrent campaign (e.g. Black Week).',
        },
        badge_texts: {
          de: fallbackTopupPreset.badgeDe,
          en: fallbackTopupPreset.badgeEn,
        },
        discount_basis_points: Math.round(fallbackTopupPreset.discountPct * 100),
        rounding_strategy: fallbackTopupPreset.roundingStrategy,
        show_reference_price: fallbackTopupPreset.showReferencePrice,
        scope: fallbackTopupPreset.scope || 'all',
        applies_to_topup: true,
        applies_to_cash: false,
        allow_voucher_stacking: false,
        starts_at: new Date(Date.now() - 3600000).toISOString(),
        ends_at: new Date(Date.now() + 86400000 * 7).toISOString(),
        priority: 50,
        status: 'active',
        theme_id: fallbackTopupPreset.themeId,
        version: 1,
      } : null);

  const activePromo = isDemoActive ? demoPromo : livePromo;
  const activeTopupPromo = isDemoActive
    ? (currentPreset.appliesToTopup ? demoPromo : demoTopupPromo)
    : (liveTopupPromo || (livePromo?.applies_to_topup ? livePromo : null));

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

  const createNewPreset = (name?: string, baseThemeId?: string): string => {
    const timestamp = Date.now();
    const newThemeId = `custom_theme_${timestamp}`;
    const newPresetId = `custom_preset_${timestamp}`;
    const baseTheme = customThemes[baseThemeId || activeTheme.id] || activeTheme;
    const themeName = name || `Eigenes Theme ${presets.length + 1}`;

    const newThemeConfig: ThemeConfig = {
      ...baseTheme,
      id: newThemeId,
      name: themeName,
    };

    const newPreset: ThemePreset = {
      id: newPresetId,
      name: `${themeName} (10 % · eSIM & Top-up)`,
      themeId: newThemeId,
      discountPct: 10,
      roundingStrategy: 'x9_down',
      showReferencePrice: false,
      scope: 'all',
      appliesToTopup: true,
      titleDe: `${themeName}: 10 % Rabatt auf alle neuen eSIMs & Top-ups`,
      titleEn: `${themeName}: 10% off all new eSIM plans & top-ups`,
      badgeDe: '−10 %',
      badgeEn: '−10%',
      animationType: 'none',
    };

    const updatedCustomThemes = { ...customThemes, [newThemeId]: newThemeConfig };
    const updatedPresets = [...presets, newPreset];

    setCustomThemes(updatedCustomThemes);
    setPresets(updatedPresets);
    setActivePresetId(newPresetId);

    try {
      localStorage.setItem('puresim_theme_demo_custom_themes', JSON.stringify(updatedCustomThemes));
      const onlyCustomPresets = updatedPresets.filter((p) => !THEME_PRESETS.some((tp) => tp.id === p.id));
      localStorage.setItem('puresim_theme_demo_custom_presets', JSON.stringify(onlyCustomPresets));
      localStorage.setItem('puresim_theme_demo_preset', newPresetId);
    } catch {}

    return newPresetId;
  };

  const resetToDefaults = () => {
    setPresets(THEME_PRESETS);
    setCustomThemes(THEMES);
    try {
      localStorage.removeItem('puresim_theme_demo_custom_themes');
      localStorage.removeItem('puresim_theme_demo_custom_presets');
    } catch {}
  };

  return (
    <ThemeDemoContext.Provider
      value={{
        isDemoActive,
        activePresetId,
        activeTheme,
        activePromo,
        activeTopupPromo,
        presets,
        customThemes,
        isPanelOpen,
        setIsPanelOpen,
        selectPreset,
        updateActivePreset,
        updateThemeColors,
        createNewPreset,
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
      activeTopupPromo: null,
      presets: THEME_PRESETS,
      customThemes: THEMES,
      isPanelOpen: false,
      setIsPanelOpen: () => {},
      selectPreset: () => {},
      updateActivePreset: () => {},
      updateThemeColors: () => {},
      createNewPreset: () => 'standard',
      toggleDemo: () => {},
      resetToDefaults: () => {},
    };
  }
  return context;
}
