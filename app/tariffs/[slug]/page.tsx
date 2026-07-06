import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import TariffDetailPageClient from './TariffDetailPageClient';
import type { Database } from '@/lib/supabase/types';
import { displayCountryName } from '@/lib/tariff-display';

type Tariff = Database['public']['Tables']['tariffs']['Row'];

async function getTariff(slug: string): Promise<Tariff | null> {
  const supabase = await createClient();
  
  // 1. Try slug match
  let { data } = await supabase
    .from('tariffs')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();

  if (data) return data as Tariff;

  // 2. Try package_code match (case-insensitive fallback)
  const codeTry = slug.replace(/-/g, '_').toUpperCase();
  const { data: dataCode } = await supabase
    .from('tariffs')
    .select('*')
    .eq('package_code', codeTry)
    .eq('is_active', true)
    .maybeSingle();

  if (dataCode) return dataCode as Tariff;

  // 3. Try original slug as package_code directly
  const { data: dataCodeDirect } = await supabase
    .from('tariffs')
    .select('*')
    .eq('package_code', slug.toUpperCase())
    .eq('is_active', true)
    .maybeSingle();

  return (dataCodeDirect || null) as Tariff | null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tariff = await getTariff(slug);
  if (!tariff) {
    return {
      title: 'Tarif nicht gefunden | PureSim',
    };
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'de';
  const isDe = locale === 'de';

  const country = displayCountryName(tariff, locale);
  const dataLabel =
    tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0
      ? 'Unlimited'
      : `${tariff.data_gb} GB`;

  const title = isDe
    ? `eSIM ${country} ${dataLabel} (${tariff.validity_days} Tage) kaufen | PureSim`
    : `Buy eSIM ${country} ${dataLabel} (${tariff.validity_days} Days) | PureSim`;

  const description = isDe
    ? `Günstige Prepaid eSIM für ${country}. Nutzen Sie ${dataLabel} Daten für ${tariff.validity_days} Tage im besten lokalen Mobilfunknetz. Sofort-Aktivierung per QR-Code.`
    : `Affordable prepaid eSIM for ${country}. Enjoy ${dataLabel} high-speed data for ${tariff.validity_days} days. Instant activation via QR code.`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

  return {
    title,
    description,
    keywords: [
      'eSIM',
      country,
      `${country} eSIM`,
      'PureSim',
      dataLabel,
      `${tariff.validity_days} days`,
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      url: `${baseUrl}/tariffs/${tariff.slug}`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: 'PureSim Logo',
        },
      ],
    },
    alternates: {
      canonical: `${baseUrl}/tariffs/${tariff.slug}`,
    },
  };
}

export default async function TariffDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tariff = await getTariff(slug);

  if (!tariff) {
    notFound();
  }

  const cookieStore = await cookies();
  const locale = cookieStore.get('locale')?.value || 'de';
  const isDe = locale === 'de';

  const countryLabel = displayCountryName(tariff, locale);
  const dataLabel =
    tariff.tariff_type?.startsWith('unlimited') || tariff.data_gb === 0
      ? 'Unlimited'
      : `${tariff.data_gb} GB`;

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://puresim.net';

  // Inject Structured Data for Google Rich Snippets
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: `${countryLabel} eSIM - ${dataLabel} (${tariff.validity_days} ${isDe ? 'Tage' : 'Days'})`,
    description: isDe
      ? `Prepaid eSIM Datenpaket für ${countryLabel} mit ${dataLabel} Daten für ${tariff.validity_days} Tage.`
      : `Prepaid eSIM data plan for ${countryLabel} featuring ${dataLabel} data for ${tariff.validity_days} days.`,
    image: `${baseUrl}/logo.png`,
    brand: {
      '@type': 'Brand',
      name: 'PureSim',
    },
    offers: {
      '@type': 'Offer',
      price: tariff.sale_price_eur.toFixed(2),
      priceCurrency: 'EUR',
      availability: 'https://schema.org/InStock',
      url: `${baseUrl}/tariffs/${tariff.slug}`,
      priceValidUntil: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)
        .toISOString()
        .split('T')[0], // 90 days from now
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <TariffDetailPageClient tariff={tariff} />
    </>
  );
}
