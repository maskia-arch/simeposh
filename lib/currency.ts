/**
 * Display-currency definitions & formatting (client-safe, pure).
 *
 * EUR is the system base — all prices are stored and CHARGED in EUR.
 * The other currencies are display-only conversions for the storefront.
 */

export type CurrencyCode = 'EUR' | 'USD' | 'BTC' | 'ETH' | 'LTC' | 'SOL';

export interface CurrencyDef {
  code:     CurrencyCode;
  label:    string;
  symbol:   string;
  type:     'fiat' | 'crypto';
  decimals: number;
}

export const CURRENCIES: CurrencyDef[] = [
  { code: 'EUR', label: 'Euro',     symbol: '€', type: 'fiat',   decimals: 2 },
  { code: 'USD', label: 'US Dollar',symbol: '$', type: 'fiat',   decimals: 2 },
  { code: 'BTC', label: 'Bitcoin',  symbol: '₿', type: 'crypto', decimals: 8 },
  { code: 'ETH', label: 'Ethereum', symbol: 'Ξ', type: 'crypto', decimals: 6 },
  { code: 'LTC', label: 'Litecoin', symbol: 'Ł', type: 'crypto', decimals: 4 },
  { code: 'SOL', label: 'Solana',   symbol: '◎', type: 'crypto', decimals: 4 },
];

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

/** Rates expressed as "units of the currency per 1 EUR". EUR is always 1. */
export type Rates = Partial<Record<CurrencyCode, number>>;

export function isCurrencyCode(x: string | null | undefined): x is CurrencyCode {
  return !!x && CURRENCIES.some((c) => c.code === x);
}

export function currencyDef(code: CurrencyCode): CurrencyDef {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

/** Trim trailing zeros from a fixed-decimal string (keeps at least 2 for fiat). */
function trimZeros(s: string, minDecimals = 0): string {
  if (!s.includes('.')) return s;
  let out = s.replace(/0+$/, '').replace(/\.$/, '');
  const [, dec = ''] = out.split('.');
  if (dec.length < minDecimals) {
    out = Number(out).toFixed(minDecimals);
  }
  return out;
}

/**
 * Format a EUR amount into the selected display currency.
 * Falls back to EUR formatting if the rate is missing/not yet loaded,
 * so prices never render as 0 or NaN.
 */
export function formatPrice(eurAmount: number, code: CurrencyCode, rates: Rates): string {
  const def = currencyDef(code);
  const rate = code === 'EUR' ? 1 : rates[code];

  if (!rate || rate <= 0) {
    // graceful fallback to EUR
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(eurAmount);
  }

  const amount = eurAmount * rate;

  if (def.type === 'fiat') {
    try {
      return new Intl.NumberFormat(code === 'EUR' ? 'de-DE' : 'en-US', {
        style: 'currency', currency: code,
      }).format(amount);
    } catch {
      return `${def.symbol}${amount.toFixed(2)}`;
    }
  }

  // Crypto: symbol + trimmed amount + code
  const num = trimZeros(amount.toFixed(def.decimals));
  return `${def.symbol}${num} ${code}`;
}
