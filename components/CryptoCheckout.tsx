'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';
import { useHideChatBubble } from '@/lib/useHideChatBubble';
import { useCart } from '@/components/CartProvider';
import { OpenChatButton } from '@/components/OpenChatButton';
import { formatCurrencyEuro } from '@/lib/currency';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { formatFullCheckoutTariffName, formatLocalizedTariffName, displayCountryName } from '@/lib/tariff-display';

interface SessionState {
  id: string; coin: string; coinName: string; status: string;
  walletAddress: string; cryptoAmount: string; paymentUri: string;
  amountEur: number; baseEur: number; surchargePct: number; surchargeFixedEur: number;
  confirmations: number; confirmationsRequired: number; txHash: string | null;
  remainingMs: number; ref: string | null;
  paymentMemo: string | null;
  receivedAmount?: number;
  customerEmail?: string;
}

interface CoinTheme {
  primary: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  badgeBg: string;
  logo: string;
}

const COIN_THEMES: Record<string, CoinTheme> = {
  BTC: {
    primary: '#F7931A',
    bgLight: 'bg-amber-50/35',
    borderLight: 'border-amber-200/60',
    textDark: 'text-amber-900',
    badgeBg: 'bg-amber-100 text-amber-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  },
  LTC: {
    primary: '#345D9D',
    bgLight: 'bg-slate-50/50',
    borderLight: 'border-slate-200/60',
    textDark: 'text-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800',
    logo: 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png',
  },
  ETH: {
    primary: '#627EEA',
    bgLight: 'bg-indigo-50/35',
    borderLight: 'border-indigo-200/60',
    textDark: 'text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  },
  SOL: {
    primary: '#14F195',
    bgLight: 'bg-teal-50/35',
    borderLight: 'border-teal-200/60',
    textDark: 'text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-800',
    logo: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  },
  USDT: {
    primary: '#26A17B',
    bgLight: 'bg-emerald-50/35',
    borderLight: 'border-emerald-200/60',
    textDark: 'text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    logo: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  },
  USDC: {
    primary: '#2775CA',
    bgLight: 'bg-sky-50/35',
    borderLight: 'border-sky-200/60',
    textDark: 'text-sky-900',
    badgeBg: 'bg-sky-100 text-sky-800',
    logo: 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  },
  TON: {
    primary: '#0088CC',
    bgLight: 'bg-cyan-50/35',
    borderLight: 'border-cyan-200/60',
    textDark: 'text-cyan-950',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    logo: 'https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png',
  },
  TRX: {
    primary: '#FF000F',
    bgLight: 'bg-rose-50/35',
    borderLight: 'border-rose-200/60',
    textDark: 'text-rose-900',
    badgeBg: 'bg-rose-100 text-rose-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png',
  },
};

const DEFAULT_THEME: CoinTheme = {
  primary: '#4F46E5',
  bgLight: 'bg-slate-50/50',
  borderLight: 'border-slate-200/50',
  textDark: 'text-slate-800',
  badgeBg: 'bg-slate-100 text-slate-800',
  logo: '',
};

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function fallbackCopyText(value: string): boolean {
  if (typeof document === 'undefined') return false;
  let ok = false;
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.contentEditable = 'true';
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  textArea.style.fontSize = '16px';

  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.setSelectionRange(0, value.length);
    textArea.select();
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    if (textArea.parentNode) {
      document.body.removeChild(textArea);
    }
  }
  return ok;
}

function Copyable({
  value,
  label,
  type,
  copyAriaLabel,
  s,
  theme,
  isHighlighted = false,
  isAmountMajor = false,
}: {
  value: string;
  label: string;
  type: 'address' | 'amount' | 'memo';
  copyAriaLabel: string;
  s: (k: string) => string;
  theme: CoinTheme;
  isHighlighted?: boolean;
  isAmountMajor?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const textRef = useRef<HTMLParagraphElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectEntireText = () => {
    if (textRef.current && typeof window !== 'undefined') {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        sel.addRange(range);
      }
    }
  };

  const handleCopy = async () => {
    setErrorMsg('');

    let clipboardPromise: Promise<void> | null = null;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        clipboardPromise = navigator.clipboard.writeText(value);
      } catch {
        clipboardPromise = null;
      }
    }

    let success = false;
    if (clipboardPromise) {
      try {
        await clipboardPromise;
        success = true;
      } catch {
        success = false;
      }
    }

    if (!success) {
      success = fallbackCopyText(value);
    }

    if (success) {
      setCopied(true);
      setErrorMsg('');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2500);
    } else {
      setCopied(false);
      selectEntireText();
      const msg = type === 'address'
        ? s('copy_failed_address')
        : type === 'amount'
          ? s('copy_failed_amount')
          : s('copy_failed_address');
      setErrorMsg(msg);
    }
  };

  const containerStyles = isHighlighted
    ? 'border-[#fcd34d] bg-[#fffbeb]'
    : `${theme.bgLight} ${theme.borderLight}`;

  return (
    <div className={`rounded-xl border p-3.5 transition-colors ${containerStyles}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">{label}</p>
          <p
            ref={textRef}
            onClick={selectEntireText}
            className={`font-mono break-all select-all cursor-pointer leading-relaxed tracking-tight py-0.5 ${
              isAmountMajor ? 'text-[19px] font-bold text-slate-900' : 'text-xs sm:text-sm text-slate-800'
            }`}
            title={s('tap_to_select')}
          >
            {value}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? s('copied') : copyAriaLabel}
          className="shrink-0 h-12 min-h-[48px] max-h-12 min-w-[48px] px-4 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:bg-slate-100 flex items-center justify-center transition-colors shadow-2xs self-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
        >
          <span aria-live="polite">{copied ? s('copied') : s('copy')}</span>
        </button>
      </div>
      {errorMsg && (
        <div role="status" className="mt-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

export function CryptoCheckout({
  sessionId,
  initialTariff = '',
  initialAmount = '',
  initialValidity = '',
}: {
  sessionId: string;
  initialTariff?: string;
  initialAmount?: string;
  initialValidity?: string;
}) {
  useHideChatBubble(true);
  const { locale, t } = useTranslation();
  const { items, total } = useCart();
  const s = (k: string) => t((`pay_${k}`) as any);

  const [cachedValidity, setCachedValidity] = useState(() => {
    if (initialValidity) return initialValidity;
    if (typeof window === 'undefined') return '';
    try {
      const v = localStorage.getItem('esim_checkout_validity');
      if (v) return v;
      const rawCart = localStorage.getItem('esim_cart_v1');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valDays = parsed.map((i: any) => i.validityDays ? formatDaysWithUnit(i.validityDays, locale) : '').filter(Boolean).join(', ');
          if (valDays) return valDays;
        }
      }
    } catch {}
    return '';
  });

  const [cachedTariff, setCachedTariff] = useState(() => {
    if (initialTariff) return initialTariff;
    if (typeof window === 'undefined') return '';
    try {
      const t = localStorage.getItem('esim_checkout_tariff');
      if (t) return t;
      const rawCart = localStorage.getItem('esim_cart_v1');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((i: any) => i.name).filter(Boolean).join(', ');
        }
      }
    } catch {}
    return '';
  });

  const [cachedAmount, setCachedAmount] = useState(() => {
    if (initialAmount) return initialAmount;
    if (typeof window === 'undefined') return '';
    try {
      const a = localStorage.getItem('esim_checkout_amount');
      if (a) return a;
      const rawCart = localStorage.getItem('esim_cart_v1');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tot = parsed.reduce((sum: number, i: any) => sum + (Number(i.priceEur) || 0) * (Number(i.quantity) || 1), 0);
          if (tot > 0) return `${tot.toFixed(2)} €`;
        }
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const t = localStorage.getItem('esim_checkout_tariff');
        const a = localStorage.getItem('esim_checkout_amount');
        const v = localStorage.getItem('esim_checkout_validity');
        if (t) setCachedTariff(t);
        if (a) setCachedAmount(a);
        if (v) setCachedValidity(v);
      } catch {}
    }
  }, []);

  const displayTariff = (() => {
    let name = '';
    if (items.length > 0) {
      name = Array.from(new Set(items.map((i) => {
        return formatFullCheckoutTariffName({
          countryName: i.countryName,
          countryCode: i.countryCode,
          locationCodes: i.locationCodes,
          region: i.region,
          tariffType: i.tariffType,
          dataGb: i.dataGb,
          validityDays: i.periodDays || i.validityDays,
          name: i.name,
        }, locale);
      }))).filter(Boolean).join(', ');
    } else if (cachedTariff) {
      name = cachedTariff;
    }
    return name;
  })();
  const displayValidity = (items.length > 0 && items.some((i) => i.periodDays || i.validityDays)
    ? items.map((i) => formatDaysWithUnit(i.periodDays || i.validityDays, locale)).filter(Boolean).join(', ')
    : '') || cachedValidity;
  const rawDisplayAmount = cachedAmount || (total > 0 ? `${total.toFixed(2)} €` : '');
  const displayAmount = (() => {
    if (!rawDisplayAmount) return '';
    const numericMatch = rawDisplayAmount.match(/[\d.,]+/);
    if (numericMatch) {
      const val = parseFloat(numericMatch[0].replace(',', '.'));
      if (!isNaN(val)) return formatCurrencyEuro(val, locale);
    }
    return rawDisplayAmount;
  })();

  const [sess, setSess]   = useState<SessionState | null>(null);
  const [qr, setQr]       = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);

  // Fallback without wallet state (0px CLS)
  const [walletFallbackTriggered, setWalletFallbackTriggered] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [isTelegramIos, setIsTelegramIos] = useState(false);
  const fallbackTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Return from wallet state
  const [isReturningFromWallet, setIsReturningFromWallet] = useState(false);

  // Cancel modal state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const cancelTriggerBtnRef = useRef<HTMLButtonElement | null>(null);
  const confirmCancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const dismissBtnRef = useRef<HTMLButtonElement | null>(null);

  const [verifying, setVerifying]   = useState(false);
  const [verifyMsg, setVerifyMsg]   = useState('');
  const [verifyMsgType, setVerifyMsgType] = useState<'success' | 'error' | ''>('');

  const [countdown, setCountdown] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  // Telegram User-Agent detection on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent || '';
      const telegram = /telegram/i.test(ua);
      const ios = /iphone|ipad|ipod/i.test(ua);
      setIsTelegram(telegram);
      setIsTelegramIos(ios);
    }
  }, []);

  const poll = useCallback(async () => {
    if (isPollingRef.current) return;
    isPollingRef.current = true;
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as SessionState;
      setSess(data);
      setRemaining(data.remainingMs);
      if (data.status !== 'pending') {
        setIsReturningFromWallet(false);
      }
      if (data.status === 'paid') {
        if (pollRef.current) clearInterval(pollRef.current);
        const target = locale === 'de'
          ? (data.ref ? `/order?ref=${data.ref}` : '/dashboard')
          : (data.ref ? `/${locale}/order?ref=${data.ref}` : `/${locale}/dashboard`);
        setTimeout(() => { window.location.href = target; }, 1500);
      }
      if (data.status === 'expired' || data.status === 'cancelled' || data.status === 'review') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch {
      // keep polling
    } finally {
      isPollingRef.current = false;
    }
  }, [sessionId, locale]);

  // Return from wallet listener: triggers single immediate status check
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setIsReturningFromWallet(true);
        poll();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [poll]);

  // Handle wallet button tap with 1.5s fallback detection
  const handleOpenWalletTap = () => {
    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);

    let wasHidden = false;
    const onVis = () => {
      if (document.visibilityState === 'hidden') wasHidden = true;
    };
    const onHide = () => {
      wasHidden = true;
    };

    document.addEventListener('visibilitychange', onVis, { once: true });
    window.addEventListener('pagehide', onHide, { once: true });

    fallbackTimerRef.current = setTimeout(() => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      if (!wasHidden && document.visibilityState === 'visible') {
        setWalletFallbackTriggered(true);
      }
    }, 1500);
  };

  const openCancelModal = () => {
    setCancelError('');
    setShowCancelModal(true);
  };

  const closeCancelModal = useCallback((fromPopstate = false) => {
    setShowCancelModal(false);
    setCancelError('');
    setTimeout(() => {
      cancelTriggerBtnRef.current?.focus();
    }, 50);
  }, []);

  // Browser back button (popstate) closes modal without cancelling session
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (showCancelModal) {
        closeCancelModal(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [showCancelModal, closeCancelModal]);

  // Global document keydown listener for Escape & Strict Focus Trap across Chrome, WebKit, Telegram
  useEffect(() => {
    if (!showCancelModal) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Move initial focus to the back button inside modal
    const focusTimer = setTimeout(() => {
      dismissBtnRef.current?.focus();
    }, 30);

    const handleDocumentKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeCancelModal(false);
        return;
      }

      if (e.key === 'Tab') {
        const modalContainer = document.getElementById('cancel-modal-container');
        if (!modalContainer) return;

        const focusables = Array.from(
          modalContainer.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null || el === document.activeElement);

        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !modalContainer.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !modalContainer.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleDocumentKeyDown, true);
    return () => {
      clearTimeout(focusTimer);
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handleDocumentKeyDown, true);
    };
  }, [showCancelModal, closeCancelModal]);

  const handleConfirmCancel = async () => {
    setCancelError('');
    setCancelling(true);
    try {
      if (pollRef.current) clearInterval(pollRef.current);
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('esim_checkout_cancelled', '1');
          } catch {}
        }
        const cartTarget = locale === 'de' ? '/cart?cancelled=1' : `/${locale}/cart?cancelled=1`;
        window.location.replace(cartTarget);
      } else {
        const data = await res.json().catch(() => ({}));
        setCancelError(data.error || s('cancel_failed'));
        setCancelling(false);
      }
    } catch {
      setCancelError(s('cancel_failed'));
      setCancelling(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg('');
    setVerifyMsgType('');
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'POST' });
      const data = await res.json() as SessionState;
      if (res.ok && data) {
        setSess(data);
        if (data.status === 'paid') {
          setVerifyMsgType('success');
          if (pollRef.current) clearInterval(pollRef.current);
          const target = locale === 'de'
            ? (data.ref ? `/order?ref=${data.ref}` : '/dashboard')
            : (data.ref ? `/${locale}/order?ref=${data.ref}` : `/${locale}/dashboard`);
          window.location.href = target;
        } else if (data.status === 'detected') {
          setVerifyMsgType('success');
        } else if (data.status === 'review' || data.status === 'cancelled' || data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          setVerifyMsgType('error');
          setVerifyMsg(s('no_payment_yet'));
        }
      } else {
        setVerifyMsgType('error');
        setVerifyMsg(s('no_payment_yet'));
      }
    } catch {
      setVerifyMsgType('error');
      setVerifyMsg(s('no_payment_yet'));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await poll();
    setCountdown(5);
    setRefreshing(false);
  };

  const status = sess ? (remaining <= 0 && sess.status === 'pending' ? 'expired' : sess.status) : 'pending';

  useEffect(() => {
    poll();
    if (status === 'detected') {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            poll();
            return 5;
          }
          return c - 1;
        });
      }, 1000);
      pollRef.current = timer;
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    } else {
      const timer = setInterval(poll, 5000);
      pollRef.current = timer;
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [poll, status]);

  // Local 1s countdown tick
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // QR from the payment URI
  useEffect(() => {
    if (!sess?.paymentUri) return;
    QRCode.toDataURL(sess.paymentUri, { width: 512, margin: 2 }).then(setQr).catch(() => setQr(null));
  }, [sess?.paymentUri]);

  if (!sess) {
    return (
      <div className="mx-auto max-w-md px-4 py-10" data-testid="checkout-skeleton">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="PureSim Logo" className="h-7 w-7 object-contain" />
              <span className="text-xl font-bold tracking-tight text-[#1d4ed8]">
                PureSim
              </span>
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>

          <div
            id="skeleton-cart-box"
            data-testid="skeleton-cart-box"
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {s('plan_label')}
              </span>
              <span
                className="text-xs font-bold text-slate-800 text-right max-w-[280px] break-words leading-tight"
                data-testid="skeleton-tariff-name"
                id="skeleton-tariff-text"
              >
                {displayTariff}
              </span>
            </div>
            <div
              id="skeleton-validity-row"
              className={`flex items-center justify-between border-t border-slate-200/40 pt-2 ${displayValidity ? '' : 'hidden'}`}
            >
              <span className="text-xs font-semibold text-slate-500">
                {t('card_validity')}
              </span>
              <span
                className="text-xs font-bold text-slate-800 text-right"
                data-testid="skeleton-validity-value"
                id="skeleton-validity-text"
              >
                {displayValidity}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span className="text-xs font-semibold text-slate-500">
                {s('amount_label')}
              </span>
              <span
                className="text-sm font-extrabold text-slate-900 tabular-nums"
                data-testid="skeleton-amount"
                id="skeleton-amount-text"
              >
                {displayAmount}
              </span>
            </div>
          </div>

          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('esim_checkout_tariff');var a=localStorage.getItem('esim_checkout_amount');var v=localStorage.getItem('esim_checkout_validity');if(!t||!a||!v){var c=localStorage.getItem('esim_cart_v1');if(c){var items=JSON.parse(c);if(Array.isArray(items)&&items.length){if(!t)t=items.map(function(i){return i.name;}).filter(Boolean).join(', ');if(!a){var tot=items.reduce(function(s,i){return s+(Number(i.priceEur)||0)*(Number(i.quantity)||1);},0);if(tot>0)a=tot.toFixed(2)+' €';}}}}var tEl=document.getElementById('skeleton-tariff-text');var aEl=document.getElementById('skeleton-amount-text');var vEl=document.getElementById('skeleton-validity-text');var vRow=document.getElementById('skeleton-validity-row');if(t&&tEl&&(!tEl.textContent||tEl.textContent.trim()===''))tEl.textContent=t;if(a&&aEl&&(!aEl.textContent||aEl.textContent.trim()===''))aEl.textContent=a;if(v&&vEl){if(!vEl.textContent||vEl.textContent.trim()==='')vEl.textContent=v;if(vRow)vRow.classList.remove('hidden');}}catch(_){}})();`,
            }}
          />

          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <svg className="h-8 w-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="h-4 w-32 rounded-md bg-slate-100" />
            </div>

            <div className="space-y-2.5">
              <div className="h-11 w-full rounded-xl bg-slate-100" />
              <div className="h-11 w-full rounded-xl bg-slate-100" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-12 w-full rounded-xl bg-slate-100" />
              <div className="h-10 w-full rounded-xl bg-slate-100" />
            </div>

            <div className="pt-2 flex justify-center">
              <OpenChatButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cartLink = locale === 'de' ? '/cart' : `/${locale}/cart`;

  // Terminal states
  if (status === 'paid') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">✅</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('paid')}</h1>
        <p className="text-slate-500">{s('paid_sub')}</p>
      </div>
    );
  }
  if (status === 'cancelled') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">🚫</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('cancelled_title')}</h1>
        <p className="mb-6 text-slate-500">{s('cancelled_sub')}</p>
        <a
          href={cartLink}
          className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
        >
          {s('back_to_cart')}
        </a>
      </div>
    );
  }
  if (status === 'expired' || status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">⌛</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('expired_title')}</h1>
        <p className="mb-6 text-slate-500">{s('expired_sub')}</p>
        <a
          href={cartLink}
          className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
        >
          {s('back_to_cart')}
        </a>
      </div>
    );
  }
  if (status === 'review') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">🔍</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('review_title')}</h1>
        <p className="mb-4 text-slate-600">{s('review_desc')}</p>
        {sess?.receivedAmount ? (
          <p className="mb-6 text-xs font-mono text-slate-500">
            {sess.receivedAmount} {sess.coin}
          </p>
        ) : null}
        <div className="mb-6">
          <a
            href="https://t.me/autoacts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span>💬</span> {s('contact_support')}
          </a>
        </div>
        <div>
          <a
            href={cartLink}
            className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
          >
            {s('back_to_cart')}
          </a>
        </div>
      </div>
    );
  }

  const theme = COIN_THEMES[sess.coin] || DEFAULT_THEME;

  const expectedNum = Number(sess.cryptoAmount);
  const receivedNum = sess.receivedAmount || 0;
  const decimalLimit = sess.coin === 'TON' ? 9 : (['SOL', 'USDT', 'USDC', 'TRX'].includes(sess.coin) ? 6 : 8);
  const remainingNum = Math.max(0, Number((expectedNum - receivedNum).toFixed(decimalLimit)));
  const receivedStr = receivedNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  const remainingStr = remainingNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');

  const feeNote = sess.surchargePct > 0
    ? s('fee_hint').replace('{pct}', String(sess.surchargePct))
    : sess.surchargeFixedEur > 0
      ? s('fee_fixed').replace('{eur}', formatCurrencyEuro(sess.surchargeFixedEur, locale))
      : null;

  const isErc20Coin = sess.coin === 'USDT' || sess.coin === 'USDC';
  const networkLabel = isErc20Coin
    ? s('network_erc20_only')
    : s('network_label').replace('{network}', sess.coinName || sess.coin);

  const formattedFiatPrice = formatCurrencyEuro(sess.amountEur, locale);

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl border bg-white p-6 shadow-sm border-slate-200">
        {/* Header + countdown */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {theme.logo && (
              <img src={theme.logo} alt={sess.coin} className="h-6 w-6 object-contain" />
            )}
            <h1 className="text-base font-bold text-slate-900">
              {s('title').includes('{coin}') ? s('title').replace('{coin}', sess.coinName) : `${s('title')} ${sess.coinName}`}
            </h1>
          </div>
          {status === 'detected' ? (
            <span role="status" aria-live="polite" className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold animate-pulse">
              ⏳ {s('confirming_status')}
            </span>
          ) : status === 'partially_paid' ? (
            <span role="status" aria-live="polite" className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold animate-pulse">
              ⚠️ {s('underpayment_title')}
            </span>
          ) : (
            <span role="timer" aria-live="polite" aria-atomic="true" className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${remaining < 120_000 ? 'bg-red-100 text-red-700 animate-pulse' : theme.badgeBg}`}>
              ⏱ {fmtTime(remaining)}
            </span>
          )}
        </div>

        {/* Plan and Validity summary */}
        {(displayTariff || displayValidity) && (
          <div className="mb-4 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3.5 space-y-1.5 shadow-2xs">
            {displayTariff && (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-500">{s('plan_label')}</span>
                <span className="font-bold text-slate-800 text-right max-w-[280px] break-words leading-tight" data-testid="checkout-tariff-name">{displayTariff}</span>
              </div>
            )}
            {displayValidity && (
              <div className={`flex items-center justify-between text-xs ${displayTariff ? 'border-t border-slate-200/50 pt-1.5' : ''}`}>
                <span className="font-semibold text-slate-500">{t('card_validity')}</span>
                <span className="font-bold text-slate-800 text-right" data-testid="checkout-validity-value">{displayValidity}</span>
              </div>
            )}
          </div>
        )}

        {/* Network warning notice for USDT and USDC */}
        {isErc20Coin && status !== 'detected' && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <span className="text-sm shrink-0">🌐</span>
            <div>
              <p className="font-extrabold text-[11px] text-blue-950">{s('network_header')}</p>
              <p className="text-[10px] text-blue-800">
                {s('network_warning_usdt_usdc').replace('{coin}', sess.coin)}
              </p>
            </div>
          </div>
        )}

        {feeNote && status !== 'detected' && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
            ⚠ {feeNote}
          </p>
        )}

        {/* Returning from wallet verification banner */}
        {isReturningFromWallet && status === 'pending' && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50/90 p-3 text-xs font-semibold text-blue-900 flex items-center justify-center gap-2 text-center animate-pulse">
            <Spinner color="#1d4ed8" />
            <span>{s('checking_do_not_resend')}</span>
          </div>
        )}

        {/* QR Code Block: 240px on tablet/desktop (primary path), 200px on mobile */}
        {status !== 'detected' && (
          <div className="mb-5 flex flex-col items-center">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qr}
                alt="Payment QR"
                width={240}
                height={240}
                className="w-[200px] h-[200px] md:w-[240px] md:h-[240px] rounded-2xl border border-slate-200 shadow-2xs"
              />
            ) : (
              <div className="flex w-[200px] h-[200px] md:w-[240px] md:h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-200 text-slate-300">QR</div>
            )}
          </div>
        )}

        {status !== 'detected' && (
          <div className="space-y-3">
            {/* Amount block directly ABOVE the button with its own 48px copy button */}
            <Copyable
              label={`${s('amount')} (${sess.coin})`}
              value={sess.cryptoAmount}
              type="amount"
              copyAriaLabel={s('copy_amount_aria')}
              s={s}
              theme={theme}
              isHighlighted={walletFallbackTriggered}
              isAmountMajor={true}
            />

            {/* Wallet button: Secondary outline button on both mobile and desktop. Omitted for TRX. */}
            {sess.coin !== 'TRX' && (
              <div>
                <a
                  href={sess.paymentUri}
                  onClick={handleOpenWalletTap}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-[14px] sm:text-[15px] transition-colors shadow-2xs cursor-pointer bg-white text-slate-800 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
                >
                  <span className="shrink-0 text-base">👛</span>
                  <span className="whitespace-normal line-clamp-2 text-center leading-snug">{s('open_wallet_app')}</span>
                  <span className="shrink-0 text-base">→</span>
                </a>

                {/* Coin, Network and explicit ERC-20 note directly under the button */}
                <p className="mt-1.5 text-center text-xs font-medium text-slate-500">
                  {sess.coinName} · {networkLabel}
                </p>
              </div>
            )}

            {/* Fixed pre-reserved fallback notice row (min-h-[60px], 0px CLS) */}
            <div
              id="wallet-fallback-notice-row"
              className="min-h-[60px] flex flex-col justify-center items-center text-center px-1 py-1"
              aria-live="polite"
            >
              {isTelegram && (
                <p className="text-xs text-slate-600 font-medium leading-tight">
                  {isTelegramIos ? s('telegram_safari_notice') : s('telegram_chrome_notice')}
                </p>
              )}
              {walletFallbackTriggered && (
                <p className="text-[13px] sm:text-[14px] font-medium text-amber-900 leading-tight mt-0.5">
                  {s('wallet_fallback_notice')}
                </p>
              )}
            </div>

            {/* Address and optional TON Memo copy fields */}
            <div className="space-y-2.5">
              <Copyable
                label={s('address')}
                value={sess.walletAddress}
                type="address"
                copyAriaLabel={s('copy_address_aria')}
                s={s}
                theme={theme}
                isHighlighted={walletFallbackTriggered}
              />

              {sess.coin === 'TON' && sess.paymentMemo && (
                <Copyable
                  label={s('memo')}
                  value={sess.paymentMemo}
                  type="memo"
                  copyAriaLabel={s('copy')}
                  s={s}
                  theme={theme}
                  isHighlighted={walletFallbackTriggered}
                />
              )}
            </div>

            {sess.coin === 'TON' && sess.paymentMemo && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-red-50/50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-700 leading-relaxed animate-pulse">
                  ⚠ {s('memo_warn')}
                </div>
                <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-3.5 py-2.5 text-xs font-semibold text-amber-800 leading-relaxed">
                  ⚠ {s('fee_warning')}
                </div>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-slate-400">
              ≈ {formattedFiatPrice} · {sess.paymentMemo && sess.coin === 'TON' ? s('exact_memo_warn') : s('exact_warn')}
            </p>
          </div>
        )}

        {status === 'detected' && (() => {
          const pctCovered = expectedNum > 0 ? Math.min(100, Math.round((receivedNum / expectedNum) * 100)) : 0;
          return (
            <div className="mb-6 rounded-2xl bg-blue-50/60 border border-blue-100 p-5 text-xs text-blue-800 leading-relaxed shadow-sm">
              <p className="font-bold mb-2 text-sm">{s('detected_title')}</p>
              <p className="mb-4">{s('detected_desc').replace('{coin}', sess.coinName)}</p>

              <div className="mb-4 rounded-xl bg-white border border-blue-100 p-3 shadow-inner">
                <div className="flex justify-between items-center mb-1.5 font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                  <span>{s('coverage_label')}</span>
                  <span className="text-blue-600 text-xs font-bold">{pctCovered}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pctCovered}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500 font-mono">
                  <span>{receivedNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '') || '0'} {sess.coin}</span>
                  <span>/ {sess.cryptoAmount} {sess.coin}</span>
                </div>
              </div>

              <p className="text-slate-500">{s('detected_hint')}</p>
            </div>
          );
        })()}

        {/* Live status banner */}
        <div role="status" aria-live="polite" className={`mt-5 rounded-xl border px-4 py-3 text-center ${theme.bgLight} ${theme.borderLight}`}>
          {status === 'detected' ? (
            <p className={`flex items-center justify-center gap-2 text-sm font-bold ${theme.textDark}`}>
              <Spinner color={theme.primary} /> {s('detected')} ({sess.confirmations}/{sess.confirmationsRequired})
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <Spinner color={theme.primary} /> {s('waiting')}
            </p>
          )}
        </div>

        {status === 'detected' && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-xs text-slate-400 font-medium">
              {s('auto_update_in').replace('{seconds}', String(countdown))}
            </p>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60 transition-colors shadow-sm cursor-pointer"
            >
              {refreshing ? (
                <>
                  <Spinner color="#64748B" />
                  {s('refreshing')}
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {s('refresh_btn')}
                </>
              )}
            </button>
          </div>
        )}

        {/* Partial payment box */}
        {receivedNum > 0 && remainingNum > 0 && status !== 'paid' && status !== 'detected' && (
          <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-xs font-medium text-amber-900 leading-relaxed shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <span>⚠️</span>
              <span>{s('underpayment_title')}</span>
            </div>
            <p>
              {s('underpayment')
                .replace('{received}', receivedStr)
                .replace('{expected}', sess.cryptoAmount)
                .replace('{remaining}', remainingStr)
                .replaceAll('{coin}', sess.coin)}
            </p>
            <div className="rounded-xl bg-white border border-amber-200 p-3 shadow-inner space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>{s('received_amount_label')}</span>
                <span className="font-mono text-blue-700">{receivedStr} {sess.coin}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>{s('remaining_amount_label')}</span>
                <span className="font-mono text-red-600 font-bold">{remainingStr} {sess.coin}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-700">
              💡 {s('underpayment_action')
                .replace('{remaining}', remainingStr)
                .replace('{coin}', sess.coin)}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2.5">
          {status !== 'detected' && (
            <button
              onClick={handleVerify}
              disabled={verifying || cancelling}
              className="flex w-full min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 px-4 text-sm font-bold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-60 transition-colors shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
            >
              {verifying ? (
                <>
                  <Spinner color="#ffffff" />
                  <span className="whitespace-normal line-clamp-2 text-center leading-snug">{s('checking_payment')}</span>
                </>
              ) : (
                <span className="whitespace-normal line-clamp-2 text-center leading-snug">{s('i_paid_btn')}</span>
              )}
            </button>
          )}

          {/* Cancel Button - Opens Custom Modal */}
          <button
            ref={cancelTriggerBtnRef}
            type="button"
            onClick={openCancelModal}
            disabled={cancelling}
            className="w-full min-h-[48px] rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
          >
            <span className="whitespace-normal line-clamp-2 text-center leading-snug">
              {cancelling ? '...' : s('cancel_btn')}
            </span>
          </button>

          {cancelError && !showCancelModal && (
            <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 text-center">
              {cancelError}
            </div>
          )}

          {/* Support Ticket button */}
          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('open-ticket-modal', {
                  detail: {
                    invoiceId: sess?.id || sessionId,
                    subject: s('support_ticket_subject').replace('{id}', sess?.id || sessionId),
                    category: 'payment',
                    initialEmail: sess?.customerEmail || '',
                  }
                }));
              } catch (err) {
                console.error('Open ticket error:', err);
              }
            }}
            className="w-full min-h-[44px] rounded-xl border border-blue-100 bg-blue-50/50 py-2.5 px-3 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <span>🎫</span> {s('payment_issue_ticket')}
          </button>

          <div className="pt-2 flex justify-center">
            <OpenChatButton />
          </div>
        </div>

        {/* Verification Messages */}
        {verifyMsg && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-xs font-medium ${verifyMsgType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {verifyMsg}
          </div>
        )}
      </div>

      {/* Accessible Custom Cancellation Modal Dialog mounted directly into document.body */}
      {showCancelModal && typeof document !== 'undefined' && createPortal(
        <div
          id="cancel-modal-backdrop"
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeCancelModal(false);
            }
          }}
        >
          <div
            id="cancel-modal-container"
            role="dialog"
            aria-modal="true"
            aria-labelledby="cancel-modal-title"
            aria-describedby="cancel-modal-desc"
            className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg">
                ⚠️
              </div>
              <div className="min-w-0 flex-1">
                <h2 id="cancel-modal-title" className="text-base font-bold text-slate-900 leading-snug">
                  {s('modal_cancel_title')}
                </h2>
                <p id="cancel-modal-desc" className="mt-1 text-xs text-slate-600 leading-relaxed">
                  {s('modal_cancel_desc')}
                </p>
              </div>
            </div>

            {cancelError && (
              <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-xs font-semibold text-red-700 text-center">
                {cancelError}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                ref={confirmCancelBtnRef}
                type="button"
                onClick={handleConfirmCancel}
                disabled={cancelling}
                className="w-full min-h-[48px] rounded-xl bg-red-600 py-2.5 px-4 text-white font-semibold text-sm hover:bg-red-700 active:bg-red-800 disabled:opacity-50 transition-colors shadow-xs flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                <span className="whitespace-normal line-clamp-2 text-center leading-snug">
                  {cancelling ? '...' : s('modal_cancel_confirm')}
                </span>
              </button>
              <button
                ref={dismissBtnRef}
                type="button"
                onClick={() => closeCancelModal(false)}
                disabled={cancelling}
                className="w-full min-h-[48px] rounded-xl border border-slate-200 bg-white py-2.5 px-4 text-slate-700 font-semibold text-sm hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2"
              >
                <span className="whitespace-normal line-clamp-2 text-center leading-snug">
                  {s('modal_cancel_back')}
                </span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Spinner({ color, className = 'h-4 w-4 shrink-0' }: { color?: string; className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} style={{ color: color || '#4F46E5' }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
