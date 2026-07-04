'use client';

import { useState } from 'react';
import { TariffCard }        from './TariffCard';
import { CheckoutModal }     from './CheckoutModal';
import { TariffDetailModal } from './TariffDetailModal';
import { useTranslation }    from '@/lib/i18n';
import type { Database }     from '@/lib/supabase/types';

import { NetworkIcon } from '@/components/Icons';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

export function TariffsGrid({ tariffs }: { tariffs: Tariff[] }) {
  const { t } = useTranslation();
  const [checkout, setCheckout] = useState<Tariff | null>(null);
  const [detail,   setDetail]   = useState<Tariff | null>(null);

  if (tariffs.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
        <div className="flex justify-center mb-3">
          <NetworkIcon size={40} className="text-slate-300" />
        </div>
        <p className="font-medium">{t('tariffs_empty')}</p>
        <p className="text-sm mt-1">{t('tariffs_empty_sub')}</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {tariffs.map((t) => (
          <TariffCard
            key={t.id}
            tariff={t}
            onBuy={(tariff) => setCheckout(tariff)}
            onDetail={(tariff) => setDetail(tariff)}
          />
        ))}
      </div>

      {checkout && (
        <CheckoutModal
          tariff={checkout}
          orderType="new_esim"
          onClose={() => setCheckout(null)}
        />
      )}

      {detail && (
        <TariffDetailModal
          tariff={detail}
          onClose={() => setDetail(null)}
        />
      )}
    </>
  );
}
