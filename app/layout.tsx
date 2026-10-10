import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProvider } from '@/components/i18n/LanguageProvider';
import { getServerDict } from '@/lib/i18n/server';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { TicketProvider } from '@/components/TicketContext';
import { ChatWidgetLoader } from '@/components/ChatWidgetLoader';
import { isSupportedLocale } from '@/lib/i18n/detect';
import type { LocaleCode } from '@/lib/i18n/config';


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
  const dict = getServerDict(locale);

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
          <LanguageProvider locale={locale} dict={dict}>
            <TicketProvider>
              <main className="min-h-screen flex flex-col">{children}</main>
            </TicketProvider>
          </LanguageProvider>
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
        <LanguageProvider locale={locale} dict={dict}>
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
        </LanguageProvider>
      </body>
    </html>
  );

}
