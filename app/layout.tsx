import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProviderDe } from '@/components/i18n/LanguageProviderDe';
import { LanguageProviderEn } from '@/components/i18n/LanguageProviderEn';
import { LanguageProviderFr } from '@/components/i18n/LanguageProviderFr';
import { LanguageProviderEs } from '@/components/i18n/LanguageProviderEs';
import { LanguageProviderIt } from '@/components/i18n/LanguageProviderIt';
import { LanguageProviderNl } from '@/components/i18n/LanguageProviderNl';
import { LanguageProviderPl } from '@/components/i18n/LanguageProviderPl';
import { LanguageProviderPt } from '@/components/i18n/LanguageProviderPt';
import { LanguageProviderTr } from '@/components/i18n/LanguageProviderTr';
import { LanguageProviderSv } from '@/components/i18n/LanguageProviderSv';
import { LanguageProviderDa } from '@/components/i18n/LanguageProviderDa';
import { LanguageProviderFi } from '@/components/i18n/LanguageProviderFi';
import { LanguageProviderCs } from '@/components/i18n/LanguageProviderCs';
import { LanguageProviderRo } from '@/components/i18n/LanguageProviderRo';
import { LanguageProviderHu } from '@/components/i18n/LanguageProviderHu';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { TicketProvider } from '@/components/TicketContext';
import { ChatWidgetLoader } from '@/components/ChatWidgetLoader';
import { detectLocale, countryFromHeaders, isSupportedLocale } from '@/lib/i18n/detect';
import type { LocaleCode } from '@/lib/i18n';

function RenderLanguageProvider({ locale, children }: { locale: LocaleCode; children: React.ReactNode }) {
  switch (locale) {
    case 'en': return <LanguageProviderEn>{children}</LanguageProviderEn>;
    case 'fr': return <LanguageProviderFr>{children}</LanguageProviderFr>;
    case 'es': return <LanguageProviderEs>{children}</LanguageProviderEs>;
    case 'it': return <LanguageProviderIt>{children}</LanguageProviderIt>;
    case 'nl': return <LanguageProviderNl>{children}</LanguageProviderNl>;
    case 'pl': return <LanguageProviderPl>{children}</LanguageProviderPl>;
    case 'pt': return <LanguageProviderPt>{children}</LanguageProviderPt>;
    case 'tr': return <LanguageProviderTr>{children}</LanguageProviderTr>;
    case 'sv': return <LanguageProviderSv>{children}</LanguageProviderSv>;
    case 'da': return <LanguageProviderDa>{children}</LanguageProviderDa>;
    case 'fi': return <LanguageProviderFi>{children}</LanguageProviderFi>;
    case 'cs': return <LanguageProviderCs>{children}</LanguageProviderCs>;
    case 'ro': return <LanguageProviderRo>{children}</LanguageProviderRo>;
    case 'hu': return <LanguageProviderHu>{children}</LanguageProviderHu>;
    case 'de':
    default:
      return <LanguageProviderDe>{children}</LanguageProviderDe>;
  }
}

import { SkipLink } from '@/components/SkipLink';
import { BASE_URL } from '@/lib/seo';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default:  'PureSim – Günstige eSIMs weltweit',
    template: '%s | PureSim',
  },
  description:
    'Kaufe sofort einsatzbereite eSIMs für über 150 Länder. Günstiger Tarif, einfache Aktivierung, kein Aufpreis.',
  keywords: ['eSIM', 'Reise SIM', 'Datenpaket', 'Roaming', 'eSIM kaufen', 'PureSim'],
  icons: {
    icon: '/icon.png',
    shortcut: '/favicon.ico',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type:   'website',
    locale: 'de_DE',
    title:  'PureSim',
    description: 'eSIMs für über 150 Länder – sofort verfügbar.',
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      de: BASE_URL,
      en: `${BASE_URL}/en`,
      'x-default': `${BASE_URL}/en`,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headerStore = await headers();
  const cookieStore = await cookies();

  // 1. Explicit locale from middleware URL rewrite/detection
  const headerLocale = headerStore.get('x-locale');
  const pathname = headerStore.get('x-pathname') || '';
  const urlMatch = pathname.match(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?=\/|$)/);
  const urlLocale = urlMatch ? urlMatch[1] : null;

  // 2. Strict URL-driven resolution (URL is authoritative over cookie)
  const resolvedLocale: LocaleCode = (headerLocale && isSupportedLocale(headerLocale))
    ? (headerLocale as LocaleCode)
    : (urlLocale && isSupportedLocale(urlLocale))
    ? (urlLocale as LocaleCode)
    : 'de';

  const locale = resolvedLocale;

  const host = (headerStore.get('host') || '').toLowerCase();
  const isEsimDomain = host.startsWith('esim.');

  // Standalone Layout for esim.puresim.net (Independent eSIM Installation Center)
  if (isEsimDomain) {
    return (
      <html lang={locale}>
        <head>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased">
          <RenderLanguageProvider locale={locale}>
            <TicketProvider>
              <main className="min-h-screen flex flex-col">{children}</main>
            </TicketProvider>
          </RenderLanguageProvider>
        </body>
      </html>
    );
  }

  // Standard Main Webshop Layout for puresim.net
  return (
    <html lang={locale}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <RenderLanguageProvider locale={locale}>
          <SkipLink />
          <CurrencyProvider>
            <CartProvider>
              <TicketProvider>
                <Navbar />
                <main id="main-content" className="flex-1 min-h-[calc(100svh-5.25rem)] outline-none" tabIndex={-1}>{children}</main>
                <Footer />
                <CartDrawer />
                <ChatWidgetLoader />
              </TicketProvider>
            </CartProvider>
          </CurrencyProvider>
        </RenderLanguageProvider>
      </body>
    </html>
  );
}
