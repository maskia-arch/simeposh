'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';

interface TopUpProgressBarProps {
  used: number;
  max?: number;
  className?: string;
  compact?: boolean;
}

export function TopUpProgressBar({
  used,
  max = 9,
  className = '',
  compact = false,
}: TopUpProgressBarProps) {
  const { t } = useTranslation();
  const clampedUsed = Math.min(Math.max(0, used), max);
  const remaining = Math.max(0, max - clampedUsed);
  const isWarning = clampedUsed >= 7;

  const valueText = t('topup_limit_used', { used: clampedUsed });
  let remainingText = '';
  if (remaining === 0) {
    remainingText = t('topup_limit_remaining_none');
  } else if (remaining === 1) {
    remainingText = t('topup_limit_remaining_singular');
  } else {
    remainingText = t('topup_limit_remaining', { remaining });
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span
          className={`font-bold ${
            isWarning ? 'text-amber-800' : 'text-slate-800'
          }`}
        >
          {valueText}
        </span>
        <span
          className={`text-[11px] font-medium ${
            isWarning ? 'text-amber-700' : 'text-slate-500'
          }`}
        >
          {remainingText}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={clampedUsed}
        aria-valuetext={valueText}
        className="flex items-center gap-1 w-full"
      >
        {Array.from({ length: max }).map((_, idx) => {
          const isFilled = idx < clampedUsed;
          let segmentBg = 'bg-slate-200';
          if (isFilled) {
            segmentBg = isWarning ? 'bg-amber-500' : 'bg-brand-600';
          }
          return (
            <div
              key={idx}
              className={`h-2 flex-1 rounded-full transition-all duration-300 ${segmentBg}`}
            />
          );
        })}
      </div>
    </div>
  );
}
