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
 * Returns the localized country count with grammatical pluralization
 * (e.g. "6 Länder", "6 countries", "6 pays", "6 zemí", "20 de țări").
 */
export function formatCountriesWithUnit(count: number, locale: string = 'de'): string {
  const pr = new Intl.PluralRules(locale);
  const rule = pr.select(count);

  switch (locale) {
    case 'de':
      return rule === 'one' ? `${count} Land` : `${count} Länder`;
    case 'en':
      return rule === 'one' ? `${count} country` : `${count} countries`;
    case 'fr':
      return `${count} pays`;
    case 'es':
      return rule === 'one' ? `${count} país` : `${count} países`;
    case 'it':
      return rule === 'one' ? `${count} paese` : `${count} paesi`;
    case 'nl':
      return rule === 'one' ? `${count} land` : `${count} landen`;
    case 'pl':
      if (rule === 'one') return `${count} kraj`;
      if (rule === 'few') return `${count} kraje`;
      return `${count} krajów`;
    case 'pt':
      return rule === 'one' ? `${count} país` : `${count} países`;
    case 'tr':
      return `${count} ülke`;
    case 'sv':
      return rule === 'one' ? `${count} land` : `${count} länder`;
    case 'da':
      return rule === 'one' ? `${count} land` : `${count} lande`;
    case 'fi':
      return rule === 'one' ? `${count} maa` : `${count} maata`;
    case 'cs':
      if (rule === 'one') return `${count} země`;
      if (rule === 'few') return `${count} země`;
      return `${count} zemí`;
    case 'ro':
      if (rule === 'one') return `${count} țară`;
      if (rule === 'few') return `${count} țări`;
      return `${count} de țări`;
    case 'hu':
      return `${count} ország`;
    default:
      return rule === 'one' ? `${count} country` : `${count} countries`;
  }
}

/**
 * Returns localized destinations found text with correct grammatical pluralization
 * (e.g. "0 Reiseziele gefunden", "1 Reiseziel gefunden", "208 Reiseziele gefunden",
 * "1 destination found", "208 destinations found",
 * "0 nalezených destinací", "1 nalezená destinace", "208 nalezených destinací", etc.)
 */
export function formatDestinationsFound(count: number, locale: string = 'de'): string {
  if (count === 0) {
    switch (locale) {
      case 'de': return '0 Reiseziele gefunden';
      case 'en': return '0 destinations found';
      case 'fr': return '0 destination trouvée';
      case 'es': return '0 destinos encontrados';
      case 'it': return '0 destinazioni trovate';
      case 'nl': return '0 bestemmingen gevonden';
      case 'pl': return '0 znalezionych celów podróży';
      case 'pt': return '0 destinos encontrados';
      case 'tr': return '0 hedef bulundu';
      case 'sv': return '0 resmål hittades';
      case 'da': return '0 destinationer fundet';
      case 'fi': return '0 matkakohdetta löydetty';
      case 'cs': return '0 nalezených destinací';
      case 'ro': return '0 destinații găsite';
      case 'hu': return '0 úti cél található';
      default: return '0 destinations found';
    }
  }

  const pr = new Intl.PluralRules(locale);
  const rule = pr.select(count);

  switch (locale) {
    case 'de':
      return rule === 'one' ? `${count} Reiseziel gefunden` : `${count} Reiseziele gefunden`;
    case 'en':
      return rule === 'one' ? `${count} destination found` : `${count} destinations found`;
    case 'fr':
      return rule === 'one' ? `${count} destination trouvée` : `${count} destinations trouvées`;
    case 'es':
      return rule === 'one' ? `${count} destino encontrado` : `${count} destinos encontrados`;
    case 'it':
      return rule === 'one' ? `${count} destinazione trovata` : `${count} destinazioni trovate`;
    case 'nl':
      return rule === 'one' ? `${count} bestemming gevonden` : `${count} bestemmingen gevonden`;
    case 'pl':
      if (rule === 'one') return `${count} znaleziony cel podróży`;
      if (rule === 'few') return `${count} znalezione cele podróży`;
      return `${count} znalezionych celów podróży`;
    case 'pt':
      return rule === 'one' ? `${count} destino encontrado` : `${count} destinos encontrados`;
    case 'tr':
      return `${count} hedef bulundu`;
    case 'sv':
      return `${count} resmål hittades`;
    case 'da':
      return rule === 'one' ? `${count} destination fundet` : `${count} destinationer fundet`;
    case 'fi':
      return rule === 'one' ? `${count} matkakohde löydetty` : `${count} matkakohdetta löydetty`;
    case 'cs':
      if (rule === 'one') return `${count} nalezená destinace`;
      if (rule === 'few') return `${count} nalezené destinace`;
      return `${count} nalezených destinací`;
    case 'ro':
      if (rule === 'one') return `${count} destinație găsită`;
      if (rule === 'few') return `${count} destinații găsite`;
      return `${count} de destinații găsite`;
    case 'hu':
      return `${count} úti cél található`;
    default:
      return rule === 'one' ? `${count} destination found` : `${count} destinations found`;
  }
}

/**
 * Returns localized "per day" aria-label preposition phrase (e.g. "pro Tag", "per day", "par jour").
 */
export function getPerDayAriaUnit(locale: string = 'de'): string {
  switch (locale) {
    case 'de': return 'pro Tag';
    case 'en': return 'per day';
    case 'fr': return 'par jour';
    case 'es': return 'por día';
    case 'it': return 'al giorno';
    case 'nl': return 'per dag';
    case 'pl': return 'za dzień';
    case 'pt': return 'por dia';
    case 'tr': return 'günlük';
    case 'sv': return 'per dag';
    case 'da': return 'pr. dag';
    case 'fi': return 'päivässä';
    case 'cs': return 'za den';
    case 'ro': return 'pe zi';
    case 'hu': return 'naponta';
    default: return 'per day';
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
 * de, fr, cs, fi, sv, da, hu, pl, ro, es, pt, it, nl: "4\u00A0%" (with non-breaking space)
 * en: "4%"
 * tr: "%4"
 */
export function formatPercent(pct: number, locale: string = 'de', options?: { negative?: boolean }): string {
  const num = Math.abs(pct);
  const sign = options?.negative ? '\u2212' : '';
  if (locale === 'tr') {
    return `${sign}%${num}`;
  }
  if (locale === 'en') {
    return `${sign}${num}%`;
  }
  // de, fr, cs, fi, sv, da, hu, pl, ro, es, pt, it, nl:
  return `${sign}${num}\u00A0%`;
}

/**
 * Resolves plural key suffix for templates based on count and locale:
 * e.g. for count === 1: "_one"
 * for locales with few-plural (e.g. cs, pl) with rule === 'few': "_few"
 * otherwise: "" (default / many)
 */
export function getPluralKeySuffix(count: number, locale: string = 'de'): string {
  if (count === 1) return '_one';
  const pr = new Intl.PluralRules(locale);
  const rule = pr.select(count);
  if (rule === 'few') return '_few';
  return '';
}

/**
 * Returns a localized duration string (seconds or minutes) with correct pluralization:
 * e.g. "30 Sekunden", "30 seconds", "30 saniye", "1 Minute", "5 Minuten", etc.
 */
export function formatDurationWithUnit(seconds: number, locale: string = 'de'): string {
  if (seconds >= 60 && seconds % 60 === 0) {
    const mins = Math.floor(seconds / 60);
    switch (locale) {
      case 'de': return mins === 1 ? '1 Minute' : `${mins} Minuten`;
      case 'en': return mins === 1 ? '1 minute' : `${mins} minutes`;
      case 'fr': return mins === 1 ? '1 minute' : `${mins} minutes`;
      case 'es': return mins === 1 ? '1 minuto' : `${mins} minutos`;
      case 'it': return mins === 1 ? '1 minuto' : `${mins} minuti`;
      case 'nl': return mins === 1 ? '1 minuut' : `${mins} minuten`;
      case 'pl': {
        const pr = new Intl.PluralRules(locale).select(mins);
        if (mins === 1) return '1 minuta';
        if (pr === 'few') return `${mins} minuty`;
        return `${mins} minut`;
      }
      case 'pt': return mins === 1 ? '1 minuto' : `${mins} minutos`;
      case 'tr': return `${mins} dakika`;
      case 'sv': return mins === 1 ? '1 minut' : `${mins} minuter`;
      case 'da': return mins === 1 ? '1 minut' : `${mins} minutter`;
      case 'fi': return mins === 1 ? '1 minuutti' : `${mins} minuuttia`;
      case 'cs': {
        const pr = new Intl.PluralRules(locale).select(mins);
        if (mins === 1) return '1 minuta';
        if (pr === 'few') return `${mins} minuty`;
        return `${mins} minut`;
      }
      case 'ro': return mins === 1 ? '1 minut' : (mins <= 19 ? `${mins} minute` : `${mins} de minute`);
      case 'hu': return `${mins} perc`;
      default: return mins === 1 ? '1 minute' : `${mins} minutes`;
    }
  }

  // Seconds
  switch (locale) {
    case 'de': return seconds === 1 ? '1 Sekunde' : `${seconds} Sekunden`;
    case 'en': return seconds === 1 ? '1 second' : `${seconds} seconds`;
    case 'fr': return seconds === 1 ? '1 seconde' : `${seconds} secondes`;
    case 'es': return seconds === 1 ? '1 segundo' : `${seconds} segundos`;
    case 'it': return seconds === 1 ? '1 secondo' : `${seconds} secondi`;
    case 'nl': return seconds === 1 ? '1 seconde' : `${seconds} seconden`;
    case 'pl': {
      const pr = new Intl.PluralRules(locale).select(seconds);
      if (seconds === 1) return '1 sekunda';
      if (pr === 'few') return `${seconds} sekundy`;
      return `${seconds} sekund`;
    }
    case 'pt': return seconds === 1 ? '1 segundo' : `${seconds} segundos`;
    case 'tr': return `${seconds} saniye`;
    case 'sv': return seconds === 1 ? '1 sekund' : `${seconds} sekunder`;
    case 'da': return seconds === 1 ? '1 sekund' : `${seconds} sekunder`;
    case 'fi': return seconds === 1 ? '1 sekunti' : `${seconds} sekuntia`;
    case 'cs': {
      const pr = new Intl.PluralRules(locale).select(seconds);
      if (seconds === 1) return '1 sekunda';
      if (pr === 'few') return `${seconds} sekundy`;
      return `${seconds} sekund`;
    }
    case 'ro': return seconds === 1 ? '1 secundă' : (seconds <= 19 ? `${seconds} secunde` : `${seconds} de secunde`);
    case 'hu': return `${seconds} másodperc`;
    default: return seconds === 1 ? '1 second' : `${seconds} seconds`;
  }
}
