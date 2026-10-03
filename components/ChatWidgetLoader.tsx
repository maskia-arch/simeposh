'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { loadChatScript, openChatWidget } from '@/lib/chatLoader';

/**
 * Custom event name used to trigger opening or loading chat widget.
 */
export const OPEN_CHAT_EVENT = 'puresim:open-chat';

export function ChatWidgetLoader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const handleOpenChat = () => {
      // Do not load on /checkout/crypto/*
      if (typeof window !== 'undefined' && window.location.pathname.startsWith('/checkout/crypto/')) {
        return;
      }
      loadChatScript(() => {
        openChatWidget();
      });
    };

    window.addEventListener(OPEN_CHAT_EVENT, handleOpenChat);
    return () => {
      window.removeEventListener(OPEN_CHAT_EVENT, handleOpenChat);
    };
  }, []);

  const isCheckoutCrypto = pathname?.startsWith('/checkout/crypto/');

  if (!mounted || isCheckoutCrypto) {
    return null;
  }

  const handleClickFakeBubble = () => {
    loadChatScript(() => {
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
