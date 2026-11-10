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

const CHAT_I18N: Record<string, { title: string; open: string; tg: string; badge: string }> = {
  de: { title: 'PureSim KI-Assistent – antwortet sofort', open: 'KI-Assistent öffnen', tg: 'Persönlicher Support über Telegram', badge: 'KI-Assistent' },
  en: { title: 'PureSim AI Assistant – replies instantly', open: 'Open AI Assistant', tg: 'Personal support via Telegram', badge: 'AI Assistant' },
  es: { title: 'Asistente de IA PureSim – responde al instante', open: 'Abrir asistente de IA', tg: 'Soporte personalizado vía Telegram', badge: 'Asistente de IA' },
  fr: { title: 'Assistant IA PureSim – répond instantanément', open: "Ouvrir l'assistant IA", tg: 'Support personnalisé via Telegram', badge: 'Assistant IA' },
  it: { title: "Assistente IA PureSim – risponde all'istante", open: 'Apri assistente IA', tg: 'Supporto personalizzato via Telegram', badge: 'Assistente IA' },
  nl: { title: 'PureSim AI-assistent – antwoordt direct', open: 'Open AI-assistent', tg: 'Persoonlijke ondersteuning via Telegram', badge: 'AI-assistent' },
  pl: { title: 'Asystent AI PureSim – odpowiada natychmiast', open: 'Otwórz asystenta AI', tg: 'Wsparcie indywidualne przez Telegram', badge: 'Asystent AI' },
  pt: { title: 'Assistente de IA PureSim – responde instantaneamente', open: 'Abrir assistente de IA', tg: 'Suporte pessoal via Telegram', badge: 'Assistente de IA' },
  tr: { title: 'PureSim Yapay Zeka Asistanı – anında yanıtlar', open: 'Yapay zeka asistanını aç', tg: 'Telegram üzerinden kişisel destek', badge: 'Yapay Zeka' },
  sv: { title: 'PureSim AI-assistent – svarar direkt', open: 'Öppna AI-assistent', tg: 'Personlig support via Telegram', badge: 'AI-assistent' },
  da: { title: 'PureSim AI-assistent – svarer med det samme', open: 'Åbn AI-assistent', tg: 'Personlig support via Telegram', badge: 'AI-assistent' },
  fi: { title: 'PureSim-tekoälyavustaja – vastaa heti', open: 'Avaa tekoälyavustaja', tg: 'Henkilökohtainen tuki Telegramissa', badge: 'Tekoäly' },
  cs: { title: 'PureSim AI asistent – odpovídá okamžitě', open: 'Otevřít AI asistenta', tg: 'Osobní podpora přes Telegram', badge: 'AI asistent' },
  ro: { title: 'Asistent AI PureSim – răspunde instant', open: 'Deschide asistentul AI', tg: 'Suport personalizat prin Telegram', badge: 'Asistent AI' },
  hu: { title: 'PureSim AI asszisztens – azonnal válaszol', open: 'AI asszisztens megnyitása', tg: 'Személyes támogatás Telegramon', badge: 'MI-asszisztens' },
};

function getChatLocale(): string {
  if (typeof document === 'undefined') return 'de';
  const htmlLang = document.documentElement.lang?.slice(0, 2)?.toLowerCase();
  if (htmlLang && CHAT_I18N[htmlLang]) return htmlLang;
  const path = window.location.pathname;
  const match = path.match(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/);
  if (match && CHAT_I18N[match[1]]) return match[1];
  return 'de';
}

    // If widget UI element is already built, execute callbacks immediately
    const enhanceWidgetUI = () => {
      const loc = getChatLocale();
      const texts = CHAT_I18N[loc] || CHAT_I18N.de;

      const realBbl = document.querySelector('#vs25 #vs25-bbl') || document.querySelector('button#vs25-bbl');
      if (realBbl) {
        realBbl.setAttribute('aria-label', texts.open);
      }
      if (!document.getElementById('vs25-custom-style')) {
        const style = document.createElement('style');
        style.id = 'vs25-custom-style';
        style.textContent = `
          @media (max-width: 768px) {
            #vs25-bbl, #vs25 .vs25-bbl {
              right: 16px !important;
              left: auto !important;
              bottom: calc(${window.location.pathname.includes('/unlimited') || window.location.pathname.includes('/tariffs') ? '118px' : '20px'} + env(safe-area-inset-bottom, 0px)) !important;
            }
          }
          .vs25-tg-banner {
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            padding: 8px 14px;
            font-size: 12px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .vs25-tg-banner a {
            color: #2563eb;
            font-weight: 600;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .vs25-tg-banner a:hover {
            text-decoration: underline;
          }
        `;
        document.head.appendChild(style);
      }

      // Update header title & subtitle
      const nameEl = document.querySelector('.vs25-hdr-name');
      if (nameEl) {
        nameEl.textContent = texts.title;
      }
      const subTextEl = document.getElementById('vs25-hdr-sub-text');
      if (subTextEl && (subTextEl.textContent?.includes('Std') || subTextEl.textContent?.includes('hour') || !subTextEl.textContent?.includes('Online'))) {
        subTextEl.textContent = 'Online';
      }

      // Inject visible Telegram support link banner into panel if not present
      const pnl = document.getElementById('vs25-pnl');
      const hdr = pnl?.querySelector('.vs25-hdr');
      if (pnl && hdr && !pnl.querySelector('.vs25-tg-banner')) {
        const banner = document.createElement('div');
        banner.className = 'vs25-tg-banner';
        banner.innerHTML = `<span>${texts.tg}</span><a href="https://t.me/autoacts" target="_blank" rel="noopener noreferrer">Telegram ↗</a>`;
        hdr.insertAdjacentElement('afterend', banner);
      }
    };

    if (document.getElementById('vs25-bbl') || (window as any).vs25) {
      enhanceWidgetUI();
      triggerCallbacks();
    } else {
      let retries = 0;
      const checkInterval = setInterval(() => {
        retries++;
        if (document.getElementById('vs25-bbl') || (window as any).vs25 || retries > 25) {
          clearInterval(checkInterval);
          enhanceWidgetUI();
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
      if (window.location.pathname.startsWith('/checkout/crypto/')) {
        pnl.classList.add('vs25-checkout');
      }
      pnl.classList.add('on');
      const realBbl = document.querySelector('#vs25 #vs25-bbl') || document.querySelector('button#vs25-bbl');
      if (realBbl) {
        realBbl.classList.add('vs25-open');
        realBbl.setAttribute('aria-label', 'Chat schließen');
      }
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
