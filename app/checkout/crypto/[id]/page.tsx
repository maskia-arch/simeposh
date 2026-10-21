import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { CryptoCheckout } from '@/components/CryptoCheckout';
import { createServiceClient } from '@/lib/supabase/server';
import { isSupportedLocale } from '@/lib/i18n/detect';
import type { LocaleCode } from '@/lib/i18n/config';

export const dynamic = 'force-dynamic';

const COIN_NAMES: Record<string, string> = {
  BTC: 'Bitcoin',
  LTC: 'Litecoin',
  ETH: 'Ethereum',
  SOL: 'Solana',
  USDT: 'Tether',
  USDC: 'USD Coin',
  TON: 'Toncoin',
  TRX: 'TRON',
};

function getLocalizedCheckoutTitle(locale: string, coinName: string): string {
  switch (locale) {
    case 'de': return `Mit ${coinName} bezahlen`;
    case 'en': return `Pay with ${coinName}`;
    case 'fr': return `Payer avec ${coinName}`;
    case 'es': return `Pagar con ${coinName}`;
    case 'it': return `Paga con ${coinName}`;
    case 'nl': return `Betalen met ${coinName}`;
    case 'pl': return `Zapłać za pomocą ${coinName}`;
    case 'pt': return `Pagar com ${coinName}`;
    case 'tr': return `${coinName} ile öde`;
    case 'sv': return `Betala med ${coinName}`;
    case 'da': return `Betal med ${coinName}`;
    case 'fi': return `Maksa valuutalla ${coinName}`;
    case 'cs': return `Platit pomocí ${coinName}`;
    case 'ro': return `Plătește cu ${coinName}`;
    case 'hu': return `${coinName} fizetés`;
    default:   return `Pay with ${coinName}`;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const headerStore = await headers();
  const headerLocale = headerStore.get('x-locale');
  const pathname = headerStore.get('x-pathname') || '';
  const urlMatch = pathname.match(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/);
  const urlLocale = urlMatch ? urlMatch[1] : null;
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('esim_locale')?.value;

  const locale: LocaleCode = (headerLocale && isSupportedLocale(headerLocale))
    ? (headerLocale as LocaleCode)
    : (urlLocale && isSupportedLocale(urlLocale))
    ? (urlLocale as LocaleCode)
    : (cookieLocale && isSupportedLocale(cookieLocale))
    ? (cookieLocale as LocaleCode)
    : 'de';

  let coinCode = 'LTC';
  let coinName = 'Litecoin';
  try {
    const db = createServiceClient();
    const { data: session } = await db
      .from('crypto_sessions')
      .select('coin, locale')
      .eq('id', id)
      .maybeSingle();

    if (!session) {
      const notFoundMap: Record<string, string> = {
        de: 'Seite nicht gefunden',
        en: 'Page Not Found',
        fr: 'Page non trouvée',
        es: 'Página no encontrada',
        it: 'Pagina non trovata',
        nl: 'Pagina niet gevonden',
        pl: 'Strona nie znaleziona',
        pt: 'Página não encontrada',
        tr: 'Sayfa Bulunamadı',
        sv: 'Sidan hittades inte',
        da: 'Siden blev ikke fundet',
        fi: 'Sivua ei löydy',
        cs: 'Stránka nenalezena',
        ro: 'Pagina nu a fost găsită',
        hu: 'Az oldal nem található',
      };
      const notFoundTitle = notFoundMap[locale] || 'Page Not Found';
      return {
        title: {
          absolute: `${notFoundTitle} | PureSim`,
        },
        robots: {
          index: false,
          follow: false,
        },
        alternates: {
          canonical: undefined,
          languages: undefined,
        },
      };
    }

    if (session?.coin) {
      coinCode = session.coin.toUpperCase();
      coinName = COIN_NAMES[coinCode] || coinCode;
    }
  } catch (err: any) {
    if (err?.digest?.includes('NEXT_NOT_FOUND')) throw err;
  }

  const localizedAction = getLocalizedCheckoutTitle(locale, coinName);
  const fullTitle = `${localizedAction} · PureSim`;

  return {
    title: {
      absolute: fullTitle,
    },
    robots: {
      index: false,
      follow: false,
    },
    alternates: {
      canonical: undefined,
      languages: undefined,
    },
  };
}

import { notFound } from 'next/navigation';
import { formatDaysWithUnit } from '@/lib/i18n/plural';
import { formatFullCheckoutTariffName } from '@/lib/tariff-display';

export default async function CryptoCheckoutPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cookieStore = await cookies();
  const rawTariff = cookieStore.get('esim_checkout_tariff')?.value;
  const rawAmount = cookieStore.get('esim_checkout_amount')?.value;
  const rawValidity = cookieStore.get('esim_checkout_validity')?.value;
  let initialTariff = rawTariff ? decodeURIComponent(rawTariff) : '';
  const initialAmount = rawAmount ? decodeURIComponent(rawAmount) : '';
  let initialValidity = rawValidity ? decodeURIComponent(rawValidity) : '';

  try {
    const db = createServiceClient();
    const { data: session } = await db
      .from('crypto_sessions')
      .select('coin, locale, order_ids')
      .eq('id', id)
      .maybeSingle();

    if (!session) {
      notFound();
    }

    if (session?.order_ids && session.order_ids.length > 0) {
      const sessLocale = (session.locale as any) || 'de';
      const { data: orders } = await db
        .from('orders')
        .select('period_num, tariffs(id, name, country_name, country_code, tariff_type, data_gb, validity_days, package_code, description, region, location_codes)')
        .in('id', session.order_ids);
      if (orders && orders.length > 0) {
        const names = orders.map((o: any) => {
          const t = o?.tariffs;
          if (!t) return '';
          return formatFullCheckoutTariffName({
            countryName: t.country_name,
            countryCode: t.country_code,
            locationCodes: t.location_codes,
            region: t.region,
            tariffType: t.tariff_type,
            dataGb: Number(t.data_gb),
            validityDays: o.period_num ?? t.validity_days,
            name: t.name,
          }, sessLocale);
        }).filter(Boolean);
        if (names.length > 0) {
          initialTariff = Array.from(new Set(names)).join(', ');
        }
        const valDays = orders.map((o: any) => o?.period_num ?? o?.tariffs?.validity_days).filter(Boolean);
        if (valDays.length > 0) {
          initialValidity = Array.from(new Set(valDays.map((d: number) => formatDaysWithUnit(d, sessLocale)))).join(', ');
        }
      }
    }
  } catch (err: any) {
    if (err?.digest?.includes('NEXT_NOT_FOUND')) throw err;
  }

  return (
    <CryptoCheckout
      sessionId={id}
      initialTariff={initialTariff}
      initialAmount={initialAmount}
      initialValidity={initialValidity}
    />
  );
}
