'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import type { Database } from '@/lib/supabase/types';
import { useTranslation } from '@/lib/i18n';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

export interface CartItem {
  /** unique line key = tariffId + periodDays (custom configs differ per days) */
  key:          string;
  tariffId:     string;
  packageCode:  string;
  name:         string;
  countryName:  string;
  countryCode:  string;
  flagEmoji:    string | null;
  dataGb:       number | null;
  validityDays: number;
  priceEur:     number;
  tariffType:   string | null;
  /** snapshot of coverage for nicer display in the cart */
  locationCodes: string[] | null;
  region:       string | null;
  /** custom day-pass duration (null = fixed package) */
  periodDays:   number | null;
  quantity:     number;
}

interface CartContextValue {
  items:      CartItem[];
  count:      number;          // total units
  distinct:   number;          // distinct line items
  total:      number;          // total EUR
  isOpen:     boolean;
  open:       () => void;
  close:      () => void;
  toggle:     () => void;
  addItem:    (tariff: Tariff, quantity?: number, opts?: { periodDays?: number }) => void;
  removeItem: (key: string) => void;
  setQuantity:(key: string, quantity: number) => void;
  clear:      () => void;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = 'esim_cart_v1';

function loadCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { locale } = useTranslation();
  const [items,  setItems]  = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string } | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(loadCart());
    setHydrated(true);
  }, []);

  // Auto-hide toast notification
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Persist whenever items change (after hydration)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch { /* quota / private mode – ignore */ }
  }, [items, hydrated]);

  // Sync across tabs
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setItems(loadCart());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addItem = useCallback((tariff: Tariff, quantity = 1, opts?: { periodDays?: number }) => {
    const periodDays = opts?.periodDays ?? null;
    const key = `${tariff.id}__${periodDays ?? ''}`;
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.key === key);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], quantity: Math.min(99, next[idx].quantity + quantity) };
        return next;
      }
      const item: CartItem = {
        key,
        tariffId:      tariff.id,
        packageCode:   tariff.package_code,
        name:          tariff.name,
        countryName:   tariff.country_name,
        countryCode:   tariff.country_code,
        flagEmoji:     tariff.flag_emoji,
        dataGb:        tariff.data_gb,
        validityDays:  tariff.validity_days,
        priceEur:      tariff.sale_price_eur,
        tariffType:    tariff.tariff_type,
        locationCodes: tariff.location_codes,
        region:        tariff.region,
        periodDays,
        quantity:      Math.min(99, Math.max(1, quantity)),
      };
      return [...prev, item];
    });

    const msg = locale === 'de' 
      ? 'Möchtest du zum Warenkorb wechseln oder weiter shoppen?' 
      : 'Would you like to go to your cart or continue shopping?';
    setToast({ show: true, message: msg });
  }, [locale]);

  const removeItem = useCallback((key: string) => {
    setItems((prev) => prev.filter((i) => i.key !== key));
  }, []);

  const setQuantity = useCallback((key: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: Math.min(99, Math.max(0, quantity)) } : i))
        .filter((i) => i.quantity > 0),
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);
  const open  = useCallback(() => setIsOpen(true),  []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle= useCallback(() => setIsOpen((v) => !v), []);

  const count    = useMemo(() => items.reduce((s, i) => s + i.quantity, 0), [items]);
  const distinct = items.length;
  const total    = useMemo(() => items.reduce((s, i) => s + i.priceEur * i.quantity, 0), [items]);

  const value: CartContextValue = {
    items, count, distinct, total, isOpen,
    open, close, toggle, addItem, removeItem, setQuantity, clear,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
      {/* Add to Cart Toast Overlay (Desktop & Mobile) */}
      {toast && (
        <div className="fixed bottom-6 right-6 left-6 md:left-auto md:w-96 z-[9999] animate-in slide-in-from-bottom duration-300">
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-2xl border border-slate-800 flex flex-col gap-3.5">
            <div className="flex items-start gap-2.5">
              <span className="text-sm mt-0.5">🛒</span>
              <div>
                <p className="text-xs font-extrabold text-slate-100">
                  {locale === 'de' ? 'Produkt hinzugefügt' : 'Product added'}
                </p>
                <p className="text-[11px] text-slate-350 mt-1 leading-normal">
                  {toast.message}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-800/80 pt-3">
              <button
                onClick={() => setToast(null)}
                className="rounded-xl px-3 py-2 text-[10px] font-bold text-slate-350 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
              >
                {locale === 'de' ? 'Weiter shoppen' : 'Continue shopping'}
              </button>
              <button
                onClick={() => {
                  setIsOpen(true);
                  setToast(null);
                }}
                className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-3.5 py-2 rounded-xl transition-all shadow-md cursor-pointer"
              >
                {locale === 'de' ? 'Zum Warenkorb' : 'Go to cart'}
              </button>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
