'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { openChatWidget } from '@/lib/useHideChatBubble';

interface OpenChatButtonProps {
  className?: string;
}

export function OpenChatButton({ className = '' }: OpenChatButtonProps) {
  const { locale } = useTranslation();
  const [widgetAvailable, setWidgetAvailable] = useState(false);

  useEffect(() => {
    // Check if chat widget elements or API are present in the DOM
    const checkWidget = () => {
      const win = window as any;
      const exists = Boolean(
        document.getElementById('vs25-bbl') ||
        document.getElementById('vs25-pnl') ||
        (win.vs25 && typeof win.vs25.open === 'function')
      );
      if (exists) {
        setWidgetAvailable(true);
        return true;
      }
      return false;
    };

    if (checkWidget()) return;

    // Retry checking periodically in case script loads asynchronously
    const interval = setInterval(() => {
      if (checkWidget()) clearInterval(interval);
    }, 800);

    const timer = setTimeout(() => clearInterval(interval), 8000);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);

  const handleClick = () => {
    const opened = openChatWidget();
    if (!opened) {
      // Fallback if widget is blocked (e.g. adblocker)
      window.location.href = 'mailto:support@puresim.net?subject=Support%20Anfrage%20pureSIM';
    }
  };

  // If widget is not available / detected, do not render to avoid dead UI
  if (!widgetAvailable) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="open-chat-button"
      className={`group inline-flex items-center justify-center gap-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:ring-offset-1 rounded-lg py-1 px-2.5 cursor-pointer ${className}`}
      aria-label={locale === 'de' ? 'Chat mit Support öffnen' : 'Open chat with support'}
    >
      <svg
        className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0"
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
      <span className="underline decoration-slate-300 group-hover:decoration-slate-500 underline-offset-2">
        {locale === 'de' ? 'Fragen? Chat öffnen' : 'Questions? Open chat'}
      </span>
    </button>
  );
}
