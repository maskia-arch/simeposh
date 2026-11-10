import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDestinationBySlug, getCountryTariffs } from '@/lib/destinations';
import { displayCountryName } from '@/lib/tariff-display';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { formatCurrencyEuro } from '@/lib/currency';
import { getDayPassPrice, getUnlimitedPriceTable, type UnlimitedPriceTable } from '@/lib/pricing';
import { UnlimitedPageClient } from './[country]/UnlimitedPageClient';

export const revalidate = 600;

const UNLIMITED_TITLES: Record<string, string> = {
  de: 'Unlimited eSIM konfigurieren – Highspeed Daten weltweit',
  en: 'Configure Unlimited eSIM – Worldwide High-Speed Data',
  es: 'Configurar Unlimited eSIM – Datos de alta velocidad en todo el mundo',
  fr: 'Configurer Unlimited eSIM – Données haut débit dans le monde entier',
  it: 'Configura Unlimited eSIM – Dati ad alta velocità in tutto il mondo',
  nl: 'Configureer Unlimited eSIM – Wereldwijde highspeed-data',
  pl: 'Skonfiguruj Unlimited eSIM – Szybki internet na całym świecie',
  pt: 'Configurar Unlimited eSIM – Dados de alta velocidade no mundo todo',
  tr: 'Unlimited eSIM Yapılandırın – Dünya Genelinde Yüksek Hızlı Veri',
  sv: 'Konfigurera Unlimited eSIM – Höghastighetsdata i hela världen',
  da: 'Konfigurer Unlimited eSIM – Højhastighedsdata i hele verden',
  fi: 'Määritä Unlimited eSIM – Nopea datayhteys maailmanlaajuisesti',
  cs: 'Konfigurace Unlimited eSIM – Vysokorychlostní data po celém světě',
  ro: 'Configurează Unlimited eSIM – Date de mare viteză în întreaga lume',
  hu: 'Unlimited eSIM konfigurálása – Nagysebességű adat világszerte',
};

const UNLIMITED_DESCS: Record<string, string> = {
  de: 'Flexible Unlimited eSIM für 200+ Länder mit 1–365 Tagen Laufzeit. Highspeed-Volumen nach Wahl, einfache Aktivierung per QR-Code und keine Roaming-Gebühren.',
  en: 'Flexible Unlimited eSIM for 200+ countries with 1–365 days validity. High-speed data allowance of your choice, easy QR-code activation and no roaming fees.',
  es: 'Unlimited eSIM flexible para más de 200 países con 1–365 días de validez. Volumen de alta velocidad a elegir, activación sencilla por código QR y sin cargos de roaming.',
  fr: 'Unlimited eSIM flexible pour plus de 200 pays avec une durée de 1 à 365 jours. Volume haut débit au choix, activation simple par code QR et sans frais d\'itinérance.',
  it: 'Unlimited eSIM flessibile per oltre 200 paesi con validità da 1 a 365 giorni. Volume ad alta velocità a scelta, facile attivazione tramite codice QR e senza costi di roaming.',
  nl: 'Flexibele Unlimited eSIM voor 200+ landen met een looptijd van 1–365 dagen. Highspeed-volume naar keuze, eenvoudige activatie via QR-code en geen roamingkosten.',
  pl: 'Elastyczny Unlimited eSIM dla ponad 200 krajów z ważnością 1–365 dni. Wybór pakietu danych, łatwa aktywacja kodem QR i brak opłat roamingowych.',
  pt: 'Unlimited eSIM flexível para mais de 200 países com validade de 1 a 365 dias. Volume de alta velocidade à sua escolha, ativação simples por código QR e sem taxas de roaming.',
  tr: '1–365 gün geçerlilik süresiyle 200+ ülke için esnek Unlimited eSIM. İsteğe bağlı yüksek hızlı veri kotası, QR kod ile kolay aktivasyon ve roaming ücreti yok.',
  sv: 'Flexibel Unlimited eSIM för 200+ länder med 1–365 dagars giltighetstid. Valbar höghastighetsdatamängd, enkel aktivering via QR-kod och inga roamingavgifter.',
  da: 'Fleksibel Unlimited eSIM til 200+ lande med 1–365 dages gyldighed. Valgfri højhastighedsdatamængde, nem aktivering via QR-kode og ingen roaminggebyrer.',
  fi: 'Joustava Unlimited eSIM yli 200 maahan 1–365 päivän voimassaoloajalla. Valitse haluamasi nopea datapaketti, helppo aktivointi QR-koodilla ja ilman verkkovierailumaksuja.',
  cs: 'Flexibilní Unlimited eSIM pro více než 200 zemí s platností 1–365 dní. Volitelný objem vysokorychlostních dat, snadná aktivace pomocí QR kódu a bez poplatků za roaming.',
  ro: 'Unlimited eSIM flexibil pentru peste 200 de țări cu o valabilitate de 1–365 de zile. Volum de mare viteză la alegere, activare simplă prin cod QR și fără taxe de roaming.',
  hu: 'Rugalmas Unlimited eSIM több mint 200 országhoz 1–365 napos érvényességgel. Választható nagysebességű adatkeret, egyszerű QR-kódos aktiválás és roamingdíj nélkül.',
};

const UNLIMITED_H1S: Record<string, string> = {
  de: 'Unlimited eSIM – Land wählen und konfigurieren',
  en: 'Unlimited eSIM – Choose Country and Configure',
  es: 'Unlimited eSIM – Elige país y configura',
  fr: 'Unlimited eSIM – Choisir un pays et configurer',
  it: 'Unlimited eSIM – Scegli il paese e configura',
  nl: 'Unlimited eSIM – Kies land en configureer',
  pl: 'Unlimited eSIM – Wybierz kraj i skonfiguruj',
  pt: 'Unlimited eSIM – Escolha o país e configure',
  tr: 'Unlimited eSIM – Ülke seçin ve yapılandırın',
  sv: 'Unlimited eSIM – Välj land och konfigurera',
  da: 'Unlimited eSIM – Vælg land og konfigurer',
  fi: 'Unlimited eSIM – Valitse maa ja määritä',
  cs: 'Unlimited eSIM – Vyberte zemi a konfigurujte',
  ro: 'Unlimited eSIM – Alege țara și configurează',
  hu: 'Unlimited eSIM – Válasszon országot és konfiguráljon',
};

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();

  // Next.js layout template is '%s | PureSim', so title must NOT end with '| PureSim'
  const title = UNLIMITED_TITLES[locale] || UNLIMITED_TITLES.en;
  const description = UNLIMITED_DESCS[locale] || UNLIMITED_DESCS.en;

  const baseUrl = BASE_URL;
  const prefix = locale === 'de' ? '' : `/${locale}`;

  return {
    title,
    description,
    keywords: [
      'Unlimited eSIM',
      'Unlimited Data eSIM',
      'eSIM Konfigurator',
      'PureSim',
    ],
    openGraph: {
      title,
      description,
      type: 'website',
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${baseUrl}${prefix}/unlimited`,
      images: [
        {
          url: `${baseUrl}/logo.png`,
          width: 512,
          height: 512,
          alt: 'PureSim Unlimited eSIM',
        },
      ],
    },
    alternates: buildAlternates(locale, {
      dePath: 'unlimited',
      enPath: 'unlimited',
    }),
  };
}

export default async function UnlimitedDefaultPage() {
  const destination = await getDestinationBySlug('germany');

  if (!destination) {
    notFound();
  }

  const locale = await getServerLocale();
  const t = getServerT(locale);
  const prefix = locale === 'de' ? '' : `/${locale}`;

  const rawUnlimitedTariffs = (await getCountryTariffs(destination.code)).filter(
    (tr) => tr.tariff_type?.startsWith('unlimited') || tr.data_gb === 0
  );

  if (rawUnlimitedTariffs.length === 0) {
    notFound();
  }

  const unlimitedTariffs = rawUnlimitedTariffs.map((tr) => {
    const isEco = tr.tariff_type === 'unlimited_eco' || (tr.data_gb !== null && tr.data_gb <= 1);
    const cleanName = isEco ? 'Unlimited Eco' : 'Unlimited Pro';
    return {
      ...tr,
      name: cleanName,
    };
  });

  const countryLabel = displayCountryName(
    { country_code: destination.code, country_name: destination.name, location_codes: null, region: null },
    locale
  );

  const priceTables: Record<string, UnlimitedPriceTable> = {};
  for (const tr of unlimitedTariffs) {
    priceTables[tr.package_code] = await getUnlimitedPriceTable(
      {
        sale_price_eur: tr.sale_price_eur,
        validity_days: tr.validity_days || 1,
      },
      1,
      365
    );
  }

  const oneDayPrices = unlimitedTariffs.map(
    (tr) => priceTables[tr.package_code]?.days[1]?.priceEur ?? tr.sale_price_eur
  );
  const minPrice = Math.min(...oneDayPrices);
  const perDayPrices = unlimitedTariffs.map(
    (tr) => priceTables[tr.package_code]?.frontPricePerDay ?? (tr.sale_price_eur / Math.max(1, tr.validity_days || 1))
  );
  const minPerDay = Math.min(...perDayPrices);

  return (
    <UnlimitedPageClient
      destination={destination}
      tariffs={unlimitedTariffs}
      countryLabel={countryLabel}
      minPrice={minPrice}
      minPerDay={minPerDay}
      priceTables={priceTables}
      isOverview={true}
      customH1={UNLIMITED_H1S[locale] || UNLIMITED_H1S.en}
    />
  );
}
