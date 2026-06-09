'use client';

import Image from 'next/image';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "DE", or virtual region code "EU", "AS", etc. */
  countryCode:  string | null | undefined;
  countryName?: string | null;
  size?:        number;
  className?:   string;
}

/**
 * Virtual region codes that have their own CDN flag or emoji fallback.
 * Codes 2-4 chars that are NOT standard ISO-3166-1 alpha-2 countries.
 */
const REGION_META: Record<string, { cdnCode?: string; emoji: string }> = {
  'EU':   { cdnCode: 'eu', emoji: '🇪🇺' }, // flagcdn supports 'eu'
  'AS':   { emoji: '🌏' },
  'SEA':  { emoji: '🌏' },
  'ME':   { emoji: '🌍' },
  'NA':   { emoji: '🌎' },
  'LA':   { emoji: '🌎' },
  'OC':   { emoji: '🌏' },
  'AF':   { emoji: '🌍' },
  'GLOB': { emoji: '🌐' },
  'XX':   { emoji: '🌐' },
};

export function CountryFlag({ countryCode, countryName, size = 32, className = '' }: CountryFlagProps) {
  const raw  = (countryCode ?? '').trim();
  const up   = raw.toUpperCase();
  const low  = raw.toLowerCase();
  const cdnWidth = size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160;

  // Region / virtual codes
  if (REGION_META[up]) {
    const meta = REGION_META[up];
    if (meta.cdnCode) {
      return (
        <Image
          src={`https://flagcdn.com/w${cdnWidth}/${meta.cdnCode}.webp`}
          alt={countryName ?? up}
          width={size}
          height={Math.round(size * 0.75)}
          className={`rounded-sm object-cover shadow-sm ${className}`}
        />
      );
    }
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
        style={{ fontSize: Math.round(size * 0.75), lineHeight: 1 }}
        role="img"
        aria-label={countryName ?? up}
      >
        {meta.emoji}
      </span>
    );
  }

  // Standard ISO-3166-1 alpha-2
  if (/^[a-z]{2}$/.test(low)) {
    return (
      <Image
        src={`https://flagcdn.com/w${cdnWidth}/${low}.webp`}
        alt={countryName ?? up}
        width={size}
        height={Math.round(size * 0.75)}
        className={`rounded-sm object-cover shadow-sm ${className}`}
      />
    );
  }

  // Fallback
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center select-none ${className}`}
      style={{ fontSize: Math.round(size * 0.75), lineHeight: 1 }}
      role="img"
      aria-label={countryName ?? 'Unknown'}
    >
      🌐
    </span>
  );
}

export function CountryFlagLarge({ countryCode, countryName }: { countryCode: string; countryName?: string }) {
  return <CountryFlag countryCode={countryCode} countryName={countryName} size={48} />;
}
