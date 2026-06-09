'use client';

import { useState, useEffect, useCallback } from 'react';
import { CheckoutModal } from '@/components/CheckoutModal';
import { formatGb } from '@/lib/utils';
import { Price } from '@/components/Price';
import { useTranslation } from '@/lib/i18n';
import type { Database } from '@/lib/supabase/types';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

interface TopUpPackage {
  id:           string;
  package_code: string;
  name:         string;
  data_gb:      number | null;
  validity_days: number;
  sale_price_eur: number;
  flag_emoji:   string | null;
  country_name: string;
}

export default function TopUpPage() {
  const { t } = useTranslation();
  const [iccid,      setIccid]      = useState('');
  const [packages,   setPackages]   = useState<TopUpPackage[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [searched,   setSearched]   = useState(false);
  const [selected,   setSelected]   = useState<Tariff | null>(null);

  const doSearch = useCallback(async (code: string) => {
    const value = code.trim();
    if (!value) return;

    setLoading(true);
    setError('');
    setPackages([]);
    setSearched(false);

    try {
      const res  = await fetch(`/api/topup/packages?iccid=${encodeURIComponent(value)}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Fehler beim Abrufen der Pakete');

      setPackages(data.packages ?? []);
      setSearched(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler');
    } finally {
      setLoading(false);
    }
  }, []);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    await doSearch(iccid);
  }

  // Prefill the ICCID from the dashboard "Aufladen" link (?iccid=…) and auto-search.
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get('iccid');
    if (param) {
      setIccid(param);
      doSearch(param);
    }
  }, [doSearch]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <p className="text-5xl mb-3">📶</p>
        <h1 className="text-3xl font-bold text-slate-900">{t('topup_page_title')}</h1>
        <p className="mt-2 text-slate-500">{t('topup_page_sub')}</p>
      </div>

      {/* ICCID form */}
      <form onSubmit={handleSearch} className="mb-8">
        <label htmlFor="iccid" className="block mb-2 text-sm font-medium text-slate-700">
          {t('topup_iccid_label')}
        </label>
        <div className="flex gap-3">
          <input
            id="iccid"
            type="text"
            placeholder={t('topup_iccid_ph')}
            value={iccid}
            onChange={(e) => setIccid(e.target.value)}
            className="flex-1 rounded-xl border border-slate-300 px-4 py-3 font-mono text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
          />
          <button
            type="submit"
            disabled={loading || !iccid.trim()}
            className="rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {loading ? '…' : t('topup_search')}
          </button>
        </div>
        <p className="mt-2 text-xs text-slate-400">{t('topup_iccid_hint')}</p>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Results */}
      {searched && packages.length === 0 && !loading && (
        <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center text-slate-400">
          <p className="text-3xl mb-2">🔍</p>
          <p className="font-medium">{t('topup_no_results')}</p>
          <p className="text-sm mt-1">{t('topup_no_results_sub')}</p>
        </div>
      )}

      {packages.length > 0 && (
        <div>
          <h2 className="mb-4 font-semibold text-slate-800">
            {t('topup_results_for')} {iccid}
          </h2>
          <div className="space-y-3">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 hover:border-brand-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{pkg.flag_emoji ?? '🌐'}</span>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{pkg.name}</p>
                    <p className="text-xs text-slate-500">
                      {formatGb(pkg.data_gb)} · {pkg.validity_days} {t('cfg_days')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Price eur={pkg.sale_price_eur} className="text-lg font-bold text-slate-900" />
                  <button
                    onClick={() => setSelected(pkg as unknown as Tariff)}
                    className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
                  >
                    {t('topup_btn')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Checkout modal */}
      {selected && (
        <CheckoutModal
          tariff={selected}
          orderType="top_up"
          topUpIccid={iccid}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
