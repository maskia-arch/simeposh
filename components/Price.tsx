'use client';

import { useCurrency } from '@/components/CurrencyProvider';

/** Renders a EUR amount in the customer's selected display currency. */
export function Price({ eur, className, style }: { eur: number; className?: string; style?: React.CSSProperties }) {
  const { format } = useCurrency();
  return <span className={className} style={style}>{format(eur)}</span>;
}
