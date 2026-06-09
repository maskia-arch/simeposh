/**
 * Server-side translations for Server Components (no React context available).
 * Reads the locale and returns a `t(key, vars)` function with English fallback.
 */
import { cookies } from 'next/headers';
import type { TranslationKeys } from './translations/en';
import { isValidLocale, type LocaleCode } from './config';

import en from './translations/en';
import de from './translations/de';
import fr from './translations/fr';
import es from './translations/es';
import it from './translations/it';
import nl from './translations/nl';
import pl from './translations/pl';
import pt from './translations/pt';
import tr from './translations/tr';
import sv from './translations/sv';
import da from './translations/da';
import fi from './translations/fi';
import cs from './translations/cs';
import ro from './translations/ro';
import hu from './translations/hu';

const DICTS: Record<LocaleCode, Record<string, string>> = {
  en, de, fr, es, it, nl, pl, pt, tr, sv, da, fi, cs, ro, hu,
} as unknown as Record<LocaleCode, Record<string, string>>;

export type ServerT = (key: TranslationKeys, vars?: Record<string, string | number>) => string;

export function getServerT(locale: LocaleCode): ServerT {
  const dict   = DICTS[locale] ?? DICTS.en;
  const fallbk = DICTS.en;
  return (key, vars) => {
    let str = (dict[key] as string | undefined) ?? (fallbk[key] as string | undefined) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
      }
    }
    return str;
  };
}

/** Read the active locale from the cookie (server-side). */
export async function getServerLocale(): Promise<LocaleCode> {
  const c = (await cookies()).get('locale')?.value;
  return c && isValidLocale(c) ? c : 'en';
}
