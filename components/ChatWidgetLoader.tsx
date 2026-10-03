'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadChatScript, openChatWidget, sendVisitorBeacon, isChatScriptLoaded } from '@/lib/chatLoader';

/**
 * Custom event name used to trigger opening or loading chat widget.
 */
export const OPEN_CHAT_EVENT = 'puresim:open-chat';

export function ChatWidgetLoader() {
  const pathname = usePathname();
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

  // Do not render bubble on /checkout/crypto/* before click,
  // or once the real widget.js has loaded and injected its own UI
  if (!mounted || isCheckoutCrypto || scriptLoaded) {
    return null;
  }

  const handleClickFakeBubble = () => {
    loadChatScript(() => {
      setScriptLoaded(true);
      openChatWidget();
    });
  };

  return (
    <div
      id="vs25-bbl"
      role="button"
      tabIndex={0}
      aria-label="Open support chat"
      onClick={handleClickFakeBubble}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClickFakeBubble();
        }
      }}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 sm:h-16 sm:w-16 cursor-pointer items-center justify-center rounded-full bg-brand-600 text-white shadow-xl hover:bg-brand-700 hover:scale-105 active:scale-95 transition-all outline-none focus:ring-4 focus:ring-brand-400/40"
    >
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
    </div>
  );
}
