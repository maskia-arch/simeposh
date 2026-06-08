import Image from 'next/image';

interface CountryFlagProps {
  /** ISO 3166-1 alpha-2 country code, e.g. "DE" */
  countryCode: string;
  /** Display name used as alt text */
  countryName?: string;
  /** Pixel size of the flag image (square). Default 32. */
  size?: number;
  className?: string;
}

/**
 * Renders a country flag using flagcdn.com (free, no attribution required).
 * Falls back to the Unicode emoji flag if the code is invalid / multi-country.
 *
 * flagcdn.com URL format:
 *   https://flagcdn.com/w{width}/{code}.webp
 * Available widths: 20, 40, 80, 160, 320, 640
 */
export function CountryFlag({ countryCode, countryName, size = 32, className = '' }: CountryFlagProps) {
  const code    = countryCode?.toLowerCase();
  const isValid = /^[a-z]{2}$/.test(code ?? '');

  if (!isValid) {
    // Fallback for multi-country / global / unknown codes
    const emoji = code === 'eu' || code === 'eu' ? '🇪🇺' : '🌐';
    return <span className={`text-2xl leading-none ${className}`}>{emoji}</span>;
  }

  // Pick the smallest sensible CDN width that still looks sharp
  const cdnWidth = size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160;

  return (
    <Image
      src={`https://flagcdn.com/w${cdnWidth}/${code}.webp`}
      alt={countryName ?? code.toUpperCase()}
      width={size}
      height={Math.round(size * 0.75)}   // 4:3 flag ratio
      className={`rounded-sm object-cover shadow-sm ${className}`}
      unoptimized={false}
    />
  );
}

/**
 * Larger card-style flag for hero / detail contexts.
 */
export function CountryFlagLarge({ countryCode, countryName }: { countryCode: string; countryName?: string }) {
  return <CountryFlag countryCode={countryCode} countryName={countryName} size={48} />;
}
