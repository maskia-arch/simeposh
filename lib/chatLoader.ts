'use client';

let isScriptLoading = false;
let isScriptLoaded = false;
const callbacks: (() => void)[] = [];

/**
 * Loads the third-party support chat widget script strictly upon user interaction (first click).
 * Never loads if current path is on /checkout/crypto/*.
 */
export function loadChatScript(onLoad?: () => void) {
  if (typeof window === 'undefined') return;

  // Never load on /checkout/crypto/*
  if (window.location.pathname.startsWith('/checkout/crypto/')) {
    return;
  }

  if (onLoad) {
    callbacks.push(onLoad);
  }

  if (isScriptLoaded) {
    if (onLoad) {
      setTimeout(onLoad, 50);
    }
    return;
  }

  if (isScriptLoading) {
    return;
  }

  isScriptLoading = true;

  const script = document.createElement('script');
  script.src = 'https://puresimaisupport.autoacts.link/widget.js';
  script.async = true;

  script.onload = () => {
    isScriptLoaded = true;
    isScriptLoading = false;
    // Execute pending callbacks
    while (callbacks.length > 0) {
      const cb = callbacks.shift();
      try {
        cb?.();
      } catch (err) {
        console.error('Error executing chat loaded callback:', err);
      }
    }
  };

  script.onerror = () => {
    isScriptLoading = false;
    console.error('Failed to load chat script.');
  };

  document.body.appendChild(script);
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
      // Fallback below
    }
  }

  const bbl = document.getElementById('vs25-bbl');
  if (bbl) {
    bbl.click();
    return true;
  }

  return false;
}
