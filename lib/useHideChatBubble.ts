'use client';

import { useEffect } from 'react';

let hideCount = 0;

function updateDom() {
  if (typeof document === 'undefined') return;
  if (hideCount > 0) {
    document.body.classList.add('hide-chat-bubble');
    document.documentElement.setAttribute('data-checkout-open', 'true');
  } else {
    document.body.classList.remove('hide-chat-bubble');
    document.documentElement.removeAttribute('data-checkout-open');
  }
}

/**
 * React hook to hide floating chat bubble and teaser (#vs25-bbl, #vs25-inv)
 * across multiple simultaneous states:
 * - Cart Drawer open
 * - /cart page mounted
 * - Product added notice / toast visible
 * - Tariff detail modal open
 *
 * Uses a global reference counter to prevent race conditions when multiple
 * components mount or unmount in overlapping sequences.
 */
export function useHideChatBubble(active: boolean = true) {
  useEffect(() => {
    if (!active) return;

    hideCount++;
    updateDom();

    return () => {
      hideCount = Math.max(0, hideCount - 1);
      updateDom();
    };
  }, [active]);
}

/**
 * Programmatically triggers opening the AI support chat widget.
 */
export function openChatWidget(): boolean {
  if (typeof window === 'undefined') return false;

  const win = window as any;
  if (win.vs25 && typeof win.vs25.open === 'function') {
    try {
      win.vs25.open();
      return true;
    } catch {
      // Fallback to DOM element click below
    }
  }

  const bbl = document.getElementById('vs25-bbl');
  if (bbl) {
    bbl.click();
    return true;
  }

  return false;
}
