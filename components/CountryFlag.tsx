'use client';

interface CountryFlagProps {
  countryCode?: string | null;
  countryName?: string | null;
  size?: number;
  className?: string;
}

/**
 * Virtual region codes that have their own CDN flag or emoji fallback.
 */
const REGION_META: Record<string, { cdnCode?: string; emoji: string }> = {
  'EU': { cdnCode: 'eu', emoji: '🇪🇺' },
  'AS': { emoji: '🌏' },
  'SEA': { emoji: '🌏' },
  'ME': { emoji: '🌍' },
  'NA': { emoji: '🌎' },
  'LA': { emoji: '🌎' },
  'OC': { emoji: '🌏' },
  'AF': { emoji: '🌍' },
  'GLOB': { emoji: '🌐' },
  'XX': { emoji: '🌐' },
};

/** Parse 2-letter ISO code from input string or flag emoji (e.g. "DE" or "🇩🇪" -> "de") */
function getCdnCode(codeOrEmoji: string | null | undefined): string | null {
  if (!codeOrEmoji) return null;
  const s = codeOrEmoji.trim();

  // If 2 ASCII letters like "DE" or "de"
  if (/^[a-zA-Z]{2}$/.test(s)) {
    return s.toLowerCase();
  }

  // If regional indicator emoji pair (like 🇩🇪 -> code points 127465 127466)
  const codePoints = Array.from(s).map((c) => c.codePointAt(0) || 0);
  if (codePoints.length === 2 && codePoints.every((cp) => cp >= 0x1f1e6 && cp <= 0x1f1ff)) {
    const char1 = String.fromCharCode(codePoints[0] - 0x1f1e6 + 97);
    const char2 = String.fromCharCode(codePoints[1] - 0x1f1e6 + 97);
    return `${char1}${char2}`;
  }

  return null;
}

export function CountryFlag({ countryCode, countryName, size = 36, className = '' }: CountryFlagProps) {
  const raw = (countryCode ?? '').trim();
  const up = raw.toUpperCase();
  const cdnCode = getCdnCode(raw);
  const cdnWidth = size <= 20 ? 20 : size <= 40 ? 40 : size <= 80 ? 80 : 160;

  // Region / virtual codes
  if (REGION_META[up]) {
    const meta = REGION_META[up];
    if (meta.cdnCode) {
      return (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={`https://flagcdn.com/w${cdnWidth}/${meta.cdnCode}.webp`}
          alt={countryName ?? up}
          width={size}
          height={Math.round(size * 0.75)}
          className={`rounded-lg object-cover shadow-sm ${className}`}
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

  // Standard country flag via CDN code (parsed from ISO or emoji)
  if (cdnCode) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img
        src={`https://flagcdn.com/w${cdnWidth}/${cdnCode}.webp`}
        alt={countryName ?? up}
        width={size}
        height={Math.round(size * 0.75)}
        className={`rounded-lg object-cover shadow-sm border border-slate-700/50 ${className}`}
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
