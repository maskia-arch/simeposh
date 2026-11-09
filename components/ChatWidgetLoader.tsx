'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadChatScript, openChatWidget, sendVisitorBeacon, isChatScriptLoaded } from '@/lib/chatLoader';
import { useTranslation } from '@/lib/i18n';

/**
 * Custom event name used to trigger opening or loading chat widget.
 */
export const OPEN_CHAT_EVENT = 'puresim:open-chat';

export function ChatWidgetLoader() {
  const pathname = usePathname();
  const { t, locale } = useTranslation();
  const [mounted, setMounted] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    setMounted(true);
    setScriptLoaded(isChatScriptLoaded());

    // Send single visitor tracking beacon upon page load
    sendVisitorBeacon();

    const handleOpenChat = () => {
      loadChatScript(() => {
        setScriptLoaded(true);
        openChatWidget();
      });
    };

    const handleChatLoaded = () => {
      setScriptLoaded(true);
    };

    window.addEventListener(OPEN_CHAT_EVENT, handleOpenChat);
    window.addEventListener('puresim:chat-loaded', handleChatLoaded);

    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, handleOpenChat);
      window.removeEventListener('puresim:chat-loaded', handleChatLoaded);
    };
  }, []);

  // Send visitor tracking beacon upon route change
  useEffect(() => {
    if (mounted) {
      sendVisitorBeacon();
    }
  }, [pathname, mounted]);

  const isCheckoutCrypto = pathname?.startsWith('/checkout/crypto/');
  const isCart = pathname?.includes('/cart');
  const isUnlimited = pathname?.includes('/unlimited');

  // Do not render bubble on /checkout/crypto/* or /cart before click,
  // or once the real widget.js has loaded and injected its own UI
  if (!mounted || isCheckoutCrypto || isCart || scriptLoaded) {
    return null;
  }

  const handleClickFakeBubble = () => {
    loadChatScript(() => {
      setScriptLoaded(true);
      openChatWidget();
    });
  };

  const bottomPosition = isUnlimited
    ? 'bottom-[calc(118px+env(safe-area-inset-bottom,0px))]'
    : 'bottom-[calc(20px+env(safe-area-inset-bottom,0px))]';

  return (
    <button
      type="button"
      id="vs25-bbl"
      aria-label={t('chat_open_ai_assistant') || 'KI-Assistent öffnen'}
      onClick={handleClickFakeBubble}
      className={`fixed ${bottomPosition} right-4 md:right-5 md:bottom-5 z-40 flex h-12 w-12 sm:h-14 sm:w-14 min-h-[44px] min-w-[44px] cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-brand-400/40`}
    >
      <span className="sr-only">{t('chat_open_ai_assistant') || 'KI-Assistent öffnen'}</span>
      <svg
        className="h-7 w-7 text-white"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </button>
  );
}
