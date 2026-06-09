'use client';

import { useCurrency } from '@/components/CurrencyProvider';

/** Renders a EUR amount in the customer's selected display currency. */
export function Price({ eur, className }: { eur: number; className?: string }) {
  const { format } = useCurrency();
  return <span className={className}>{format(eur)}</span>;
}
