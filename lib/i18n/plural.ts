/**
 * Pluralization and localized unit formatting helpers across all 15 supported languages.
 */

export type PluralRule = 'one' | 'few' | 'many' | 'other';

/**
 * Returns the localized days string with correct grammatical pluralization
 * (e.g. "1 Tag" vs "2 Tage", "1 day" vs "2 days", "1 dzień" vs "2 dni" vs "5 dni", "1 zi" vs "2 zile").
 */
export function formatDaysWithUnit(days: number, locale: string = 'de'): string {
  const pr = new Intl.PluralRules(locale);
  const rule = pr.select(days);

  switch (locale) {
    case 'de':
      return rule === 'one' ? `${days} Tag` : `${days} Tage`;
    case 'en':
      return rule === 'one' ? `${days} day` : `${days} days`;
    case 'fr':
      return rule === 'one' ? `${days} jour` : `${days} jours`;
    case 'es':
      return rule === 'one' ? `${days} día` : `${days} días`;
    case 'it':
      return rule === 'one' ? `${days} giorno` : `${days} giorni`;
    case 'nl':
      return rule === 'one' ? `${days} dag` : `${days} dagen`;
    case 'pl':
      if (rule === 'one') return `${days} dzień`;
      if (rule === 'few') return `${days} dni`;
      return `${days} dni`;
    case 'pt':
      return rule === 'one' ? `${days} dia` : `${days} dias`;
    case 'tr':
      return `${days} gün`;
    case 'sv':
      return rule === 'one' ? `${days} dag` : `${days} dagar`;
    case 'da':
      return rule === 'one' ? `${days} dag` : `${days} dage`;
    case 'fi':
      return rule === 'one' ? `${days} päivä` : `${days} päivää`;
    case 'cs':
      if (rule === 'one') return `${days} den`;
      if (rule === 'few') return `${days} dny`;
      return `${days} dní`;
    case 'ro':
      if (rule === 'one') return `${days} zi`;
      if (rule === 'few') return `${days} zile`;
      return `${days} de zile`;
    case 'hu':
      return `${days} nap`;
    default:
      return `${days} days`;
  }
}

/**
 * Returns the localized day range with unit (e.g. "4 Tage", "5–9 Tage", "30+ Tage").
 */
export function formatDayRangeWithUnit(minDays: number, maxDays: number, locale: string = 'de'): string {
  if (minDays === maxDays) {
    return formatDaysWithUnit(minDays, locale);
  }
  const rangeStr = maxDays >= 365 ? `${minDays}+` : `${minDays}–${maxDays}`;
  const sample = formatDaysWithUnit(maxDays >= 365 ? minDays : maxDays, locale);
  const unit = sample.replace(/^\d+\s*/, '');
  return `${rangeStr} ${unit}`;
}

/**
 * Returns a short localized day mark label for compact slider marks (e.g. "1 Tag" / "7 Tage" or short abbreviations).
 */
export function formatDayMark(days: number, locale: string = 'de'): string {
  switch (locale) {
    case 'de':
      return days === 1 ? '1 Tag' : `${days} Tage`;
    case 'en':
      return days === 1 ? '1 day' : `${days} days`;
    case 'fr':
      return days === 1 ? '1 jour' : `${days} jours`;
    case 'es':
      return days === 1 ? '1 día' : `${days} días`;
    case 'it':
      return days === 1 ? '1 giorno' : `${days} giorni`;
    case 'nl':
      return days === 1 ? '1 dag' : `${days} dagen`;
    case 'pl':
      return days === 1 ? '1 dzień' : `${days} dni`;
    case 'pt':
      return days === 1 ? '1 dia' : `${days} dias`;
    case 'tr':
      return `${days} gün`;
    case 'sv':
      return days === 1 ? '1 dag' : `${days} dagar`;
    case 'da':
      return days === 1 ? '1 dag' : `${days} dage`;
    case 'fi':
      return days === 1 ? '1 pv' : `${days} pv`;
    case 'cs':
      return days === 1 ? '1 den' : (days >= 2 && days <= 4 ? `${days} dny` : `${days} dní`);
    case 'ro':
      return days === 1 ? '1 zi' : `${days} zile`;
    case 'hu':
      return `${days} nap`;
    default:
      return `${days}d`;
  }
}

/**
 * Formats a percentage according to the locale's typographic rules.
 * Uses strictly the Unicode minus sign U+2212 ("−") for negative values (never ASCII hyphen "-").
 * Spacing and positioning follows Intl.NumberFormat:
 * e.g. de, fr, fi: "−4 %", en: "−4%", tr: "−%4".
 */
export function formatPercent(pct: number, locale: string = 'de', options?: { negative?: boolean }): string {
  const num = Math.abs(pct);
  if (locale === 'tr') {
    return options?.negative ? `\u2212%${num}` : `%${num}`;
  }
  const intlLocale = locale === 'en' ? 'en-US' : locale;
  const val = options?.negative ? -num / 100 : num / 100;
  let formatted = new Intl.NumberFormat(intlLocale, {
    style: 'percent',
    maximumFractionDigits: 0,
  }).format(val);

  if (options?.negative) {
    // Replace any ASCII hyphen-minus \u002D with Unicode minus \u2212
    formatted = formatted.replace(/-/g, '\u2212');
  }
  return formatted;
}
