'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import Link from 'next/link';

interface PendingOrderActionsProps {
  sessionId: string;
}

export function PendingOrderActions({ sessionId }: PendingOrderActionsProps) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    if (!window.confirm(t('dash_pending_cancel_confirm' as any) || 'Möchtest du diese Bestellung wirklich stornieren?')) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error('Fehler beim Stornieren der Bestellung.');
      }
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Fehler beim Stornieren.');
      setLoading(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
      <Link
        href={`/checkout/crypto/${sessionId}`}
        className="rounded-lg bg-brand-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-brand-700 transition-colors shadow-sm"
      >
        💳 {t('dash_pending_continue' as any) || 'Zahlung fortsetzen'}
      </Link>
      <button
        type="button"
        disabled={loading}
        onClick={handleCancel}
        className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
      >
        {loading ? (t('dash_pending_canceling' as any) || 'Stornierung...') : `🗑️ ${t('dash_pending_cancel' as any) || 'Bestellung stornieren'}`}
      </button>
      {error && <p className="text-xs text-red-500 font-semibold">{error}</p>}
    </div>
  );
}
