'use client';

let isScriptLoading = false;
let isScriptLoaded = false;
const callbacks: (() => void)[] = [];

// Persistente Besucher-ID & Chat-ID (Cookie + localStorage + sessionStorage)
const STORAGE_KEY = 'vs25_cid';
const VID_KEY = 'vs25_vid';

function _getCookie(name: string): string | null {
  try {
    const v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
    return v ? decodeURIComponent(v[2]) : null;
  } catch {
    return null;
  }
}

function _setCookie(name: string, val: string, days = 365) {
  try {
    const d = new Date();
    d.setTime(d.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(val) + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
  } catch {}
}

function _ssGet(): string | null {
  try {
    return _getCookie(STORAGE_KEY) || localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function _ssSet(v: string) {
  if (!v) return;
  try { _setCookie(STORAGE_KEY, v, 365); } catch {}
  try { localStorage.setItem(STORAGE_KEY, v); } catch {}
  try { sessionStorage.setItem(STORAGE_KEY, v); } catch {}
}

function _uuid4(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    const b = new Uint8Array(16);
    crypto.getRandomValues(b);
    b[6] = (b[6] & 0x0f) | 0x40;
    b[8] = (b[8] & 0x3f) | 0x80;
    const h = Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  } catch {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}

function _getOrCreateVid(): string {
  let vid = null;
  try { vid = _getCookie(VID_KEY); } catch {}
  if (!vid) { try { vid = localStorage.getItem(VID_KEY); } catch {} }
  if (!vid) { try { vid = sessionStorage.getItem(VID_KEY); } catch {} }

  if (!vid || vid.length < 10) {
    vid = _uuid4();
  }
  try { _setCookie(VID_KEY, vid, 365); } catch {}
  try { localStorage.setItem(VID_KEY, vid); } catch {}
  try { sessionStorage.setItem(VID_KEY, vid); } catch {}
  return vid;
}

function fp(): string {
  if (typeof window === 'undefined') return '';
  const w = window.screen?.width || 0;
  const h = window.screen?.height || 0;
  const normScreen = Math.min(w, h) + 'x' + Math.max(w, h);
  const parts = [
    navigator.userAgent || '',
    navigator.language || '',
    normScreen,
    (window.screen?.colorDepth || 0) + 'bit',
    (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; } })(),
    (navigator.hardwareConcurrency || 0) + 'cpu',
    ((navigator as any).deviceMemory || 0) + 'gb',
    navigator.platform || '',
    (navigator.maxTouchPoints || 0) + 'tp'
  ];
  return parts.join('|');
}

function smartTitle(): string {
  if (typeof window === 'undefined') return 'Seite';
  const path = window.location.pathname;
  const search = window.location.search;
  if (path === '/' || path === '') return 'Startseite';
  if (/\/(cart|warenkorb)/i.test(path)) return 'Warenkorb';
  if (/\/checkout/i.test(path)) {
    if (/order[-_]?received|thank/i.test(path)) return 'Bestellung abgeschlossen ✅';
    return 'Checkout';
  }
  const td = path.match(/\/tariffs\/([^/?#]+)/i);
  if (td) return 'Tarif: ' + td[1].replace(/-/g, ' ');
  if (/\/tariffs/i.test(path)) {
    const qp = new URLSearchParams(search).get('q') || new URLSearchParams(search).get('search') || '';
    if (qp) return 'Tarif-Suche: ' + decodeURIComponent(qp).substring(0, 40);
    return 'Tarifübersicht';
  }
  const t = (document.title || '')
    .split(/\s[–\-|]\s/)[0]
    .replace(/\s*[\|–\-]\s*PureSim.*$/i, '')
    .trim();
  return t.length > 60 ? t.substring(0, 60) + '…' : (t || 'Seite');
}

function _autoDetectIdentity(): Record<string, string> {
  const data: Record<string, string> = {};
  if (typeof window === 'undefined') return data;
  try {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get('email')) data.email = sp.get('email')!;
    if (sp.get('ref')) data.checkoutRef = sp.get('ref')!;
    if (sp.get('iccid')) data.iccid = sp.get('iccid')!;

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.indexOf('sb-') === 0 || key.indexOf('auth') >= 0 || key.indexOf('user') >= 0)) {
        try {
          const val = localStorage.getItem(key);
          if (val && val.indexOf('@') >= 0) {
            const parsed = JSON.parse(val);
            if (parsed?.user?.email) {
              data.email = parsed.user.email;
              data.userId = parsed.user.id;
              if (parsed.user.user_metadata?.full_name || parsed.user.user_metadata?.name) {
                data.customerName = parsed.user.user_metadata.full_name || parsed.user.user_metadata.name;
              }
            } else if (parsed?.email) {
              data.email = parsed.email;
              if (parsed.name || parsed.full_name) {
                data.customerName = parsed.name || parsed.full_name;
              }
            }
          }
        } catch {}
      }
    }
  } catch {}
  return data;
}

let lastBeaconUrl: string | null = null;

/**
 * Sends a single lightweight visitor tracking beacon on page load.
 * Does NOT load widget.js or initiate any chat requests.
 */
export function sendVisitorBeacon() {
  if (typeof window === 'undefined') return;
  const currentUrl = window.location.href;
  if (lastBeaconUrl === currentUrl) return;
  lastBeaconUrl = currentUrl;

  try {
    const vid = _getOrCreateVid();
    const savedCid = _ssGet();
    const identity = _autoDetectIdentity();

    const payload = {
      fingerprint: fp(),
      visitorId: vid,
      pageUrl: currentUrl,
      pageTitle: smartTitle(),
      chatId: savedCid || null,
      ...identity,
    };

    fetch('https://puresimaisupport.autoacts.link/api/widget/beacon', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(savedCid ? { 'X-Chat-ID': savedCid } : {}),
      },
      body: JSON.stringify(payload),
      keepalive: true,
    })
      .then((res) => {
        if (res.ok) return res.json().catch(() => ({}));
        return {};
      })
      .then((d: any) => {
        if (d && d.chatId && !_ssGet()) {
          _ssSet(d.chatId);
        }
      })
      .catch(() => {});
  } catch {}
}

export function isChatScriptLoaded(): boolean {
  return isScriptLoaded;
}

/**
 * Loads the third-party support chat widget script strictly upon user interaction (first click).
 */
export function loadChatScript(onLoad?: () => void) {
  if (typeof window === 'undefined') return;

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

    // Notify listeners / update state
    window.dispatchEvent(new CustomEvent('puresim:chat-loaded'));

    const triggerCallbacks = () => {
      while (callbacks.length > 0) {
        const cb = callbacks.shift();
        try {
          cb?.();
        } catch (err) {
          console.error('Error executing chat loaded callback:', err);
        }
      }
    };

    // If widget UI element is already built, execute callbacks immediately
    if (document.getElementById('vs25-bbl') || (window as any).vs25) {
      triggerCallbacks();
    } else {
      let retries = 0;
      const checkInterval = setInterval(() => {
        retries++;
        if (document.getElementById('vs25-bbl') || (window as any).vs25 || retries > 25) {
          clearInterval(checkInterval);
          triggerCallbacks();
        }
      }, 50);
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

  const tryOpen = () => {
    const win = window as any;
    if (win.vs25 && typeof win.vs25.open === 'function') {
      try {
        win.vs25.open();
        return true;
      } catch {}
    }

    const pnl = document.getElementById('vs25-pnl');
    if (pnl) {
      pnl.classList.add('on');
    }

    const bbl = document.getElementById('vs25-bbl');
    if (bbl) {
      bbl.click();
      return true;
    }

    return false;
  };

  if (tryOpen()) return true;

  // Poll for up to 1.5 seconds if widget elements are still mounting
  let attempts = 0;
  const poll = setInterval(() => {
    attempts++;
    if (tryOpen() || attempts >= 30) {
      clearInterval(poll);
    }
  }, 50);

  return true;
}
