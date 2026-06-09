'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  type CurrencyCode, type Rates, DEFAULT_CURRENCY, isCurrencyCode, formatPrice,
} from '@/lib/currency';

interface CurrencyContextValue {
  currency:    CurrencyCode;
  setCurrency: (code: CurrencyCode) => void;
  rates:       Rates;
  format:      (eurAmount: number) => string;
  updatedAt:   string | null;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const REFRESH_MS = 5 * 60 * 1000; // 5 minutes

function readCookie(): CurrencyCode {
  if (typeof document === 'undefined') return DEFAULT_CURRENCY;
  const m = document.cookie.match(/(?:^|;\s*)currency=([^;]+)/);
  return isCurrencyCode(m?.[1]) ? (m![1] as CurrencyCode) : DEFAULT_CURRENCY;
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>(DEFAULT_CURRENCY);
  const [rates,    setRates]         = useState<Rates>({ EUR: 1 });
  const [updatedAt, setUpdatedAt]    = useState<string | null>(null);

  // Read persisted choice on mount
  useEffect(() => { setCurrencyState(readCookie()); }, []);

  // Fetch rates on mount + refresh every 5 minutes in the background
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const res = await fetch('/api/rates', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json() as { rates?: Rates; updatedAt?: string };
        if (!alive) return;
        if (data.rates) setRates({ EUR: 1, ...data.rates });
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      } catch { /* keep previous rates */ }
    }
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(id); };
  }, []);

  const setCurrency = useCallback((code: CurrencyCode) => {
    setCurrencyState(code);
    document.cookie = `currency=${code};path=/;max-age=31536000;SameSite=Lax`;
  }, []);

  const format = useCallback(
    (eurAmount: number) => formatPrice(eurAmount, currency, rates),
    [currency, rates],
  );

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, rates, format, updatedAt }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency(): CurrencyContextValue {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside <CurrencyProvider>');
  return ctx;
}
