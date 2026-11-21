/**
 * Seasonal Themes Configuration for PureSim.
 *
 * Provides WCAG AAA compliant color tokens, subtle seasonal accents,
 * hero backgrounds, navigation palettes, and lightweight particle effects.
 * Supports both Tailwind utility classes and guaranteed inline CSS values.
 * All themes gracefully fall back to 'standard'.
 */

export type ThemeAnimationType =
  | 'none'
  | 'snow'
  | 'fireworks'
  | 'confetti'
  | 'autumn_leaves'
  | 'hearts'
  | 'sun_sparkles';

export interface ThemeConfig {
  id: string;
  name: string;
  isDark?: boolean;

  // Banner
  bannerBg: string;
  bannerText: string;
  bannerBorder: string;
  bannerBgColor?: string;
  bannerTextColor?: string;
  bannerBorderColor?: string;

  // Badge
  badgeBg: string;
  badgeText: string;
  badgeBgColor?: string;
  badgeTextColor?: string;

  // Hero Section
  heroBg: string;
  heroBgStyle?: string;
  heroTextColor?: string;
  heroHighlightColor?: string;
  heroBadgeBg?: string;
  heroBadgeText?: string;

  // Navigation / Header
  navBg?: string;
  navText?: string;
  navBorder?: string;
  navBgColor?: string;
  navTextColor?: string;
  navBorderColor?: string;
  logoColor?: string;

  // Page Body & Container
  pageBgColor?: string;
  pageTextColor?: string;
  cardBgColor?: string;
  cardBorderColor?: string;
  cardTextColor?: string;

  // Buttons
  buttonClass?: string;
  secondaryButtonClass?: string;
  btnPrimaryBg?: string;
  btnPrimaryText?: string;
  btnSecondaryBg?: string;
  btnSecondaryText?: string;
  btnSecondaryBorder?: string;

  // Accent Color & Highlights (Icons, Step indicators, Links, Tags)
  accentColor?: string;
  accentBgColor?: string;
  accentTextColor?: string;

  // Animation
  hasSnow?: boolean;
  hasFireworks?: boolean;
  animationType?: ThemeAnimationType;
}

export const THEMES: Record<string, ThemeConfig> = {
  standard: {
    id: 'standard',
    name: 'Standard (PureSim Modern)',
    isDark: false,
    bannerBg: 'bg-gradient-to-r from-brand-600 via-brand-700 to-brand-800',
    bannerText: 'text-white',
    bannerBorder: 'border-brand-700',
    bannerBgColor: 'linear-gradient(to right, #2563eb, #1d4ed8, #1e40af)',
    bannerTextColor: '#ffffff',
    bannerBorderColor: '#1d4ed8',
    badgeBg: 'bg-white/20 text-white border-white/30',
    badgeText: 'text-white font-bold',
    badgeBgColor: 'rgba(255, 255, 255, 0.2)',
    badgeTextColor: '#ffffff',
    heroBg: 'bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white',
    heroBgStyle: 'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #3b82f6 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#bfdbfe',
    heroBadgeBg: 'rgba(255, 255, 255, 0.15)',
    heroBadgeText: '#ffffff',
    navBg: 'bg-white/80 backdrop-blur-sm',
    navText: 'text-slate-700',
    navBorder: 'border-slate-200',
    navBgColor: 'rgba(255, 255, 255, 0.95)',
    navTextColor: '#334155',
    navBorderColor: '#e2e8f0',
    logoColor: '#1d4ed8',
    pageBgColor: '#ffffff',
    pageTextColor: '#0f172a',
    cardBgColor: '#ffffff',
    cardBorderColor: '#e2e8f0',
    cardTextColor: '#0f172a',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: '#1d4ed8',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: 'rgba(255, 255, 255, 0.1)',
    btnSecondaryText: '#ffffff',
    btnSecondaryBorder: 'rgba(255, 255, 255, 0.4)',
    accentColor: '#2563eb',
    accentBgColor: 'rgba(37, 99, 235, 0.1)',
    accentTextColor: '#1d4ed8',
    animationType: 'none',
  },
  black_week: {
    id: 'black_week',
    name: 'Black Week (Anthrazit)',
    isDark: true,
    bannerBg: 'bg-zinc-950',
    bannerText: 'text-zinc-100',
    bannerBorder: 'border-zinc-800',
    bannerBgColor: '#09090b',
    bannerTextColor: '#f4f4f5',
    bannerBorderColor: '#27272a',
    badgeBg: 'bg-zinc-800 text-amber-300 border-zinc-700',
    badgeText: 'text-amber-300 font-bold',
    badgeBgColor: '#27272a',
    badgeTextColor: '#fcd34d',
    heroBg: 'bg-gradient-to-b from-zinc-950 via-zinc-900 to-zinc-950 text-white',
    heroBgStyle: 'linear-gradient(180deg, #09090b 0%, #18181b 50%, #09090b 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#fcd34d',
    heroBadgeBg: 'rgba(39, 39, 42, 0.9)',
    heroBadgeText: '#fcd34d',
    navBg: 'bg-zinc-950/95 backdrop-blur-md',
    navText: 'text-zinc-200',
    navBorder: 'border-zinc-800',
    navBgColor: '#09090b',
    navTextColor: '#d4d4d8',
    navBorderColor: '#27272a',
    logoColor: '#f4f4f5',
    pageBgColor: '#09090b',
    pageTextColor: '#f4f4f5',
    cardBgColor: '#18181b',
    cardBorderColor: '#27272a',
    cardTextColor: '#f4f4f5',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: '#f4f4f5',
    btnPrimaryText: '#09090b',
    btnSecondaryBg: '#18181b',
    btnSecondaryText: '#fcd34d',
    btnSecondaryBorder: '#3f3f46',
    accentColor: '#fcd34d',
    accentBgColor: 'rgba(252, 211, 77, 0.15)',
    accentTextColor: '#fcd34d',
    animationType: 'autumn_leaves',
  },
  black_friday: {
    id: 'black_friday',
    name: 'Black Friday (Gold auf Tiefschwarz)',
    isDark: true,
    bannerBg: 'bg-black',
    bannerText: 'text-amber-300',
    bannerBorder: 'border-amber-500/40',
    bannerBgColor: '#000000',
    bannerTextColor: '#fbbf24',
    bannerBorderColor: '#78350f',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    badgeText: 'text-amber-300 font-black tracking-wide',
    badgeBgColor: '#451a03',
    badgeTextColor: '#fbbf24',
    heroBg: 'bg-gradient-to-b from-black via-zinc-950 to-black text-white',
    heroBgStyle: 'linear-gradient(180deg, #000000 0%, #141414 50%, #000000 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#fbbf24',
    heroBadgeBg: 'rgba(245, 158, 11, 0.15)',
    heroBadgeText: '#fbbf24',
    navBg: 'bg-black/95 backdrop-blur-md',
    navText: 'text-amber-100',
    navBorder: 'border-amber-500/30',
    navBgColor: '#000000',
    navTextColor: '#fef3c7',
    navBorderColor: '#451a03',
    logoColor: '#fbbf24',
    pageBgColor: '#000000',
    pageTextColor: '#f4f4f5',
    cardBgColor: '#141414',
    cardBorderColor: '#262626',
    cardTextColor: '#f4f4f5',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
    btnPrimaryText: '#000000',
    btnSecondaryBg: 'rgba(20, 20, 20, 0.95)',
    btnSecondaryText: '#fbbf24',
    btnSecondaryBorder: 'rgba(251, 191, 36, 0.4)',
    accentColor: '#fbbf24',
    accentBgColor: 'rgba(251, 191, 36, 0.15)',
    accentTextColor: '#fbbf24',
    animationType: 'confetti',
  },
  cyber_monday: {
    id: 'cyber_monday',
    name: 'Cyber Monday (Mitternachtsblau & Cyan)',
    isDark: true,
    bannerBg: 'bg-[#060b14]',
    bannerText: 'text-cyan-300',
    bannerBorder: 'border-cyan-800/60',
    bannerBgColor: '#060b14',
    bannerTextColor: '#67e8f9',
    bannerBorderColor: '#155e75',
    badgeBg: 'bg-cyan-950/90 text-cyan-300 border-cyan-700',
    badgeText: 'text-cyan-300 font-bold',
    badgeBgColor: '#083344',
    badgeTextColor: '#67e8f9',
    heroBg: 'bg-gradient-to-b from-[#030712] via-[#08152b] to-[#040814] text-white',
    heroBgStyle: 'linear-gradient(180deg, #030712 0%, #08152b 55%, #040814 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#67e8f9',
    heroBadgeBg: 'rgba(8, 51, 68, 0.85)',
    heroBadgeText: '#67e8f9',
    navBg: 'bg-[#060b14]/95 backdrop-blur-md',
    navText: 'text-cyan-100',
    navBorder: 'border-cyan-900/60',
    navBgColor: '#060b14',
    navTextColor: '#cffafe',
    navBorderColor: '#164e63',
    logoColor: '#22d3ee',
    pageBgColor: '#030712',
    pageTextColor: '#f0fdfa',
    cardBgColor: '#08152b',
    cardBorderColor: '#164e63',
    cardTextColor: '#f0fdfa',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: 'linear-gradient(135deg, #22d3ee 0%, #06b6d4 100%)',
    btnPrimaryText: '#082f49',
    btnSecondaryBg: 'rgba(8, 51, 68, 0.7)',
    btnSecondaryText: '#67e8f9',
    btnSecondaryBorder: '#164e63',
    accentColor: '#22d3ee',
    accentBgColor: 'rgba(34, 211, 238, 0.15)',
    accentTextColor: '#22d3ee',
    animationType: 'confetti',
  },
  weihnachten: {
    id: 'weihnachten',
    name: 'Weihnachten (Winter & Schnee)',
    isDark: true,
    bannerBg: 'bg-red-950',
    bannerText: 'text-red-100',
    bannerBorder: 'border-red-900',
    bannerBgColor: '#3b070c',
    bannerTextColor: '#fef08a',
    bannerBorderColor: '#881337',
    badgeBg: 'bg-red-900/60 text-red-200 border-red-700',
    badgeText: 'text-red-100 font-bold',
    badgeBgColor: '#881337',
    badgeTextColor: '#ffe4e6',
    heroBg: 'bg-gradient-to-b from-red-950 via-red-900 to-[#1a0507] text-white',
    heroBgStyle: 'linear-gradient(180deg, #3b070c 0%, #580d16 50%, #1f0306 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#fef08a',
    heroBadgeBg: 'rgba(255, 255, 255, 0.15)',
    heroBadgeText: '#ffffff',
    navBg: 'bg-red-950/95 backdrop-blur-md',
    navText: 'text-red-100',
    navBorder: 'border-red-900',
    navBgColor: '#2d0508',
    navTextColor: '#ffffff',
    navBorderColor: '#881337',
    logoColor: '#fef08a',
    pageBgColor: '#1a0507',
    pageTextColor: '#ffe4e6',
    cardBgColor: '#2a070c',
    cardBorderColor: '#881337',
    cardTextColor: '#ffe4e6',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
    btnPrimaryText: '#ffffff',
    btnSecondaryBg: 'rgba(255, 255, 255, 0.12)',
    btnSecondaryText: '#ffffff',
    btnSecondaryBorder: 'rgba(255, 255, 255, 0.35)',
    accentColor: '#fef08a',
    accentBgColor: 'rgba(254, 240, 138, 0.15)',
    accentTextColor: '#fef08a',
    hasSnow: true,
    animationType: 'snow',
  },
  silvester: {
    id: 'silvester',
    name: 'Silvester / Neujahr (Gold & Feuerwerk)',
    isDark: true,
    bannerBg: 'bg-slate-950',
    bannerText: 'text-amber-200',
    bannerBorder: 'border-amber-900/60',
    bannerBgColor: '#020617',
    bannerTextColor: '#fef08a',
    bannerBorderColor: '#78350f',
    badgeBg: 'bg-amber-950/80 text-amber-300 border-amber-700',
    badgeText: 'text-amber-300 font-bold',
    badgeBgColor: '#451a03',
    badgeTextColor: '#fde047',
    heroBg: 'bg-gradient-to-b from-black via-slate-950 to-purple-950/40 text-white',
    heroBgStyle: 'linear-gradient(180deg, #000000 0%, #0f172a 50%, #1e1b4b 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#fde047',
    heroBadgeBg: 'rgba(69, 26, 3, 0.85)',
    heroBadgeText: '#fde047',
    navBg: 'bg-slate-950/95 backdrop-blur-md',
    navText: 'text-amber-100',
    navBorder: 'border-amber-900/40',
    navBgColor: '#020617',
    navTextColor: '#fef08a',
    navBorderColor: '#451a03',
    logoColor: '#fde047',
    pageBgColor: '#020617',
    pageTextColor: '#fef08a',
    cardBgColor: '#0f172a',
    cardBorderColor: '#451a03',
    cardTextColor: '#fef08a',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: 'linear-gradient(135deg, #fbbf24 0%, #eab308 100%)',
    btnPrimaryText: '#000000',
    btnSecondaryBg: '#0f172a',
    btnSecondaryText: '#fde047',
    btnSecondaryBorder: '#78350f',
    accentColor: '#fde047',
    accentBgColor: 'rgba(253, 224, 71, 0.15)',
    accentTextColor: '#fde047',
    hasFireworks: true,
    animationType: 'fireworks',
  },
  sommer: {
    id: 'sommer',
    name: 'Sommer (Sonnig & Warm)',
    isDark: false,
    bannerBg: 'bg-amber-600',
    bannerText: 'text-white',
    bannerBorder: 'border-amber-700',
    bannerBgColor: '#b45309',
    bannerTextColor: '#ffffff',
    bannerBorderColor: '#92400e',
    badgeBg: 'bg-amber-700 text-amber-100 border-amber-500',
    badgeText: 'text-amber-100 font-bold',
    badgeBgColor: '#92400e',
    badgeTextColor: '#fef08a',
    heroBg: 'bg-gradient-to-br from-amber-600 via-orange-600 to-amber-700 text-white',
    heroBgStyle: 'linear-gradient(135deg, #d97706 0%, #ea580c 50%, #b45309 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#fef08a',
    heroBadgeBg: 'rgba(180, 83, 9, 0.85)',
    heroBadgeText: '#fef08a',
    navBg: 'bg-amber-900/95 backdrop-blur-md',
    navText: 'text-amber-100',
    navBorder: 'border-amber-800',
    navBgColor: '#d97706',
    navTextColor: '#ffffff',
    navBorderColor: '#b45309',
    logoColor: '#ffffff',
    pageBgColor: '#fffbeb',
    pageTextColor: '#451a03',
    cardBgColor: '#ffffff',
    cardBorderColor: '#fde68a',
    cardTextColor: '#451a03',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: '#ffffff',
    btnPrimaryText: '#92400e',
    btnSecondaryBg: 'rgba(255, 255, 255, 0.2)',
    btnSecondaryText: '#ffffff',
    btnSecondaryBorder: 'rgba(255, 255, 255, 0.5)',
    accentColor: '#ea580c',
    accentBgColor: 'rgba(234, 88, 12, 0.15)',
    accentTextColor: '#c2410c',
    animationType: 'sun_sparkles',
  },
  ostern: {
    id: 'ostern',
    name: 'Ostern (Pastellgrün)',
    isDark: true,
    bannerBg: 'bg-emerald-800',
    bannerText: 'text-white',
    bannerBorder: 'border-emerald-700',
    bannerBgColor: '#064e3b',
    bannerTextColor: '#ecfdf5',
    bannerBorderColor: '#047857',
    badgeBg: 'bg-emerald-900/70 text-emerald-100 border-emerald-600',
    badgeText: 'text-emerald-100 font-bold',
    badgeBgColor: '#047857',
    badgeTextColor: '#a7f3d0',
    heroBg: 'bg-gradient-to-br from-emerald-950 via-teal-900 to-emerald-900 text-white',
    heroBgStyle: 'linear-gradient(135deg, #064e3b 0%, #115e59 50%, #022c22 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#a7f3d0',
    heroBadgeBg: 'rgba(6, 78, 59, 0.85)',
    heroBadgeText: '#a7f3d0',
    navBg: 'bg-emerald-950/95 backdrop-blur-md',
    navText: 'text-emerald-100',
    navBorder: 'border-emerald-800',
    navBgColor: '#064e3b',
    navTextColor: '#d1fae5',
    navBorderColor: '#047857',
    logoColor: '#6ee7b7',
    pageBgColor: '#022c22',
    pageTextColor: '#ecfdf5',
    cardBgColor: '#064e3b',
    cardBorderColor: '#047857',
    cardTextColor: '#ecfdf5',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: 'linear-gradient(135deg, #34d399 0%, #10b981 100%)',
    btnPrimaryText: '#064e3b',
    btnSecondaryBg: 'rgba(4, 120, 87, 0.6)',
    btnSecondaryText: '#d1fae5',
    btnSecondaryBorder: '#059669',
    accentColor: '#34d399',
    accentBgColor: 'rgba(52, 211, 153, 0.15)',
    accentTextColor: '#a7f3d0',
    animationType: 'confetti',
  },
  neutral: {
    id: 'neutral',
    name: 'Feiertag Neutral',
    isDark: true,
    bannerBg: 'bg-slate-800',
    bannerText: 'text-slate-100',
    bannerBorder: 'border-slate-700',
    bannerBgColor: '#1e293b',
    bannerTextColor: '#f8fafc',
    bannerBorderColor: '#334155',
    badgeBg: 'bg-slate-700 text-slate-100 border-slate-600',
    badgeText: 'text-white font-bold',
    badgeBgColor: '#334155',
    badgeTextColor: '#f8fafc',
    heroBg: 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white',
    heroBgStyle: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #020617 100%)',
    heroTextColor: '#ffffff',
    heroHighlightColor: '#e2e8f0',
    heroBadgeBg: 'rgba(51, 65, 85, 0.85)',
    heroBadgeText: '#f8fafc',
    navBg: 'bg-slate-900/95 backdrop-blur-md',
    navText: 'text-slate-100',
    navBorder: 'border-slate-800',
    navBgColor: '#0f172a',
    navTextColor: '#f8fafc',
    navBorderColor: '#334155',
    logoColor: '#f8fafc',
    pageBgColor: '#0f172a',
    pageTextColor: '#f8fafc',
    cardBgColor: '#1e293b',
    cardBorderColor: '#334155',
    cardTextColor: '#f8fafc',
    buttonClass: 'btn-primary',
    secondaryButtonClass: 'btn-secondary',
    btnPrimaryBg: '#f8fafc',
    btnPrimaryText: '#0f172a',
    btnSecondaryBg: '#334155',
    btnSecondaryText: '#f8fafc',
    btnSecondaryBorder: '#475569',
    accentColor: '#94a3b8',
    accentBgColor: 'rgba(148, 163, 184, 0.15)',
    accentTextColor: '#f8fafc',
    animationType: 'none',
  },
};

export function getTheme(themeId?: string | null): ThemeConfig {
  if (!themeId || !THEMES[themeId]) {
    return THEMES.standard;
  }
  return THEMES[themeId];
}
