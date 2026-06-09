import type { TranslationKeys } from './translations/en';

export type { TranslationKeys };

export const SUPPORTED_LOCALES = [
  { code: 'en', label: 'English',    flag: '🇬🇧' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'it', label: 'Italiano',   flag: '🇮🇹' },
  { code: 'nl', label: 'Nederlands', flag: '🇳🇱' },
  { code: 'pl', label: 'Polski',     flag: '🇵🇱' },
  { code: 'pt', label: 'Português',  flag: '🇵🇹' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
  { code: 'sv', label: 'Svenska',    flag: '🇸🇪' },
  { code: 'da', label: 'Dansk',      flag: '🇩🇰' },
  { code: 'fi', label: 'Suomi',      flag: '🇫🇮' },
  { code: 'cs', label: 'Čeština',    flag: '🇨🇿' },
  { code: 'ro', label: 'Română',     flag: '🇷🇴' },
  { code: 'hu', label: 'Magyar',     flag: '🇭🇺' },
] as const;

export type LocaleCode = (typeof SUPPORTED_LOCALES)[number]['code'];

export function isValidLocale(code: string | null | undefined): code is LocaleCode {
  return !!code && SUPPORTED_LOCALES.some((l) => l.code === code);
}
