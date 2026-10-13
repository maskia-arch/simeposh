/**
 * Standard-compliant crypto payment URI builder.
 *
 * Requirements:
 * - BTC:  bitcoin:<addr>?amount=<Dezimal mit Punkt>&label=PureSim&message=<Bestellnummer>
 * - LTC:  litecoin:<addr>?amount=<Dezimal mit Punkt>&label=PureSim&message=<Bestellnummer>
 * - SOL:  solana:<addr>?amount=<Dezimal>&reference=<pro Session eindeutig>
 * - ETH:  ethereum:<addr>@1?value=<wei als ganze Zahl> (EIP-681, no amount)
 * - USDT: ethereum:0xdAC17F958D2ee523a2206206994597C13D831ec7@1/transfer?address=<Empfänger>&uint256=<Betrag × 10^6>
 * - USDC: ethereum:0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48@1/transfer?address=<Empfänger>&uint256=<Betrag × 10^6>
 * - TON:  ton://transfer/<addr>?amount=<nanoton als ganze Zahl>&text=<Kommentar>
 * - TRX:  kein Wallet-Link, kein Button. paymentUri und QR-Code enthalten nur die reine Adresse.
 */
import crypto from 'node:crypto';

export const USDT_ERC20_CONTRACT = '0xdAC17F958D2ee523a2206206994597C13D831ec7';
export const USDC_ERC20_CONTRACT = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

/** Base58 alphabet for Solana Pay references */
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

export function encodeBase58(buffer: Uint8Array): string {
  const digits: number[] = [0];
  for (let i = 0; i < buffer.length; i++) {
    for (let j = 0; j < digits.length; j++) {
      digits[j] <<= 8;
    }
    digits[0] += buffer[i];
    let carry = 0;
    for (let j = 0; j < digits.length; j++) {
      digits[j] += carry;
      carry = (digits[j] / 58) | 0;
      digits[j] %= 58;
    }
    while (carry > 0) {
      digits.push(carry % 58);
      carry = (carry / 58) | 0;
    }
  }
  let str = '';
  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    str += BASE58_ALPHABET[0];
  }
  for (let i = digits.length - 1; i >= 0; i--) {
    str += BASE58_ALPHABET[digits[i]];
  }
  return str;
}

/**
 * Generate a cryptographically unique 32-byte Solana Pay reference encoded in Base58.
 */
export function generateSolanaPayReference(): string {
  const bytes = crypto.randomBytes(32);
  return encodeBase58(bytes);
}

/**
 * Parse a decimal string or number into BigInt smallest units without floating point inaccuracy.
 */
export function parseUnits(value: string | number, decimals: number): bigint {
  const raw = typeof value === 'number'
    ? (Number.isInteger(value) ? `${value}` : value.toFixed(Math.min(decimals, 18)))
    : String(value).trim();

  if (!raw || raw === '0') return BigInt(0);

  // Split negative/positive
  const isNegative = raw.startsWith('-');
  const clean = isNegative ? raw.slice(1) : raw;
  const [intPart = '0', rawFrac = ''] = clean.split('.');

  // Pad or truncate fraction to exact decimals
  let fracPart = rawFrac;
  if (fracPart.length > decimals) {
    // Truncate without float rounding
    fracPart = fracPart.slice(0, decimals);
  } else {
    fracPart = fracPart.padEnd(decimals, '0');
  }

  const combined = (intPart || '0') + fracPart;
  const result = BigInt(combined);
  return isNegative ? -result : result;
}

/**
 * Format BigInt units back into decimal string with a dot, trimming redundant trailing zeroes.
 */
export function formatUnits(units: bigint, decimals: number): string {
  const zero = BigInt(0);
  const negative = units < zero;
  const abs = negative ? -units : units;
  const base = BigInt('1' + '0'.repeat(decimals));
  const intPart = abs / base;
  const fracPart = abs % base;

  if (fracPart === zero) {
    return `${negative ? '-' : ''}${intPart.toString()}`;
  }

  const fracStr = fracPart.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${negative ? '-' : ''}${intPart.toString()}.${fracStr}`;
}

/**
 * Format a decimal amount string to exact decimal with point (no exponent, dot decimal).
 */
export function formatDecimalAmount(amount: string | number, maxDecimals: number): string {
  if (typeof amount === 'number') {
    const units = parseUnits(amount, maxDecimals);
    return formatUnits(units, maxDecimals);
  }
  const clean = String(amount).trim();
  if (!clean.includes('.')) return clean;
  const [intPart, fracPart] = clean.split('.');
  const trimmedFrac = fracPart.slice(0, maxDecimals).replace(/0+$/, '');
  return trimmedFrac ? `${intPart}.${trimmedFrac}` : intPart;
}

export interface PaymentUriOptions {
  coin: string;
  address: string;
  amount: string | number;
  orderNumber?: string | null;
  memo?: string | null;
  reference?: string | null;
}

/**
 * Server-side payment URI builder per coin.
 */
export function buildPaymentUri(opts: PaymentUriOptions): string {
  const coin = opts.coin.toUpperCase();
  const address = opts.address.trim();

  switch (coin) {
    case 'BTC': {
      const amountStr = formatDecimalAmount(opts.amount, 8);
      const msg = opts.orderNumber ? encodeURIComponent(opts.orderNumber) : 'PureSim';
      return `bitcoin:${address}?amount=${amountStr}&label=PureSim&message=${msg}`;
    }

    case 'LTC': {
      const amountStr = formatDecimalAmount(opts.amount, 8);
      const msg = opts.orderNumber ? encodeURIComponent(opts.orderNumber) : 'PureSim';
      return `litecoin:${address}?amount=${amountStr}&label=PureSim&message=${msg}`;
    }

    case 'SOL': {
      const amountStr = formatDecimalAmount(opts.amount, 9);
      const ref = opts.reference || opts.memo || '';
      return ref
        ? `solana:${address}?amount=${amountStr}&reference=${ref}`
        : `solana:${address}?amount=${amountStr}`;
    }

    case 'ETH': {
      // EIP-681: ethereum:<addr>@1?value=<wei as integer> (no amount parameter!)
      const wei = parseUnits(opts.amount, 18).toString();
      return `ethereum:${address}@1?value=${wei}`;
    }

    case 'USDT': {
      // EIP-681 transfer: ethereum:<Contract>@1/transfer?address=<Recipient>&uint256=<Amount * 10^6>
      const uint256 = parseUnits(opts.amount, 6).toString();
      return `ethereum:${USDT_ERC20_CONTRACT}@1/transfer?address=${address}&uint256=${uint256}`;
    }

    case 'USDC': {
      // EIP-681 transfer: ethereum:<Contract>@1/transfer?address=<Recipient>&uint256=<Amount * 10^6>
      const uint256 = parseUnits(opts.amount, 6).toString();
      return `ethereum:${USDC_ERC20_CONTRACT}@1/transfer?address=${address}&uint256=${uint256}`;
    }

    case 'TON': {
      // ton://transfer/<addr>?amount=<nanoton as integer>&text=<Comment>
      const nanoton = parseUnits(opts.amount, 9).toString();
      const text = opts.memo ? encodeURIComponent(opts.memo) : '';
      return text
        ? `ton://transfer/${address}?amount=${nanoton}&text=${text}`
        : `ton://transfer/${address}?amount=${nanoton}`;
    }

    case 'TRX': {
      // Kein Wallet-Link, kein Button. paymentUri und QR-Code enthalten nur die reine Adresse.
      return address;
    }

    default: {
      const amountStr = formatDecimalAmount(opts.amount, 8);
      return `${coin.toLowerCase()}:${address}?amount=${amountStr}`;
    }
  }
}
