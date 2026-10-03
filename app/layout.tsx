import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { TicketProvider } from '@/components/TicketContext';
import { ChatWidgetLoader } from '@/components/ChatWidgetLoader';
import { detectLocale, countryFromHeaders, isSupportedLocale } from '@/lib/i18n/detect';
import type { LocaleCode } from '@/lib/i18n';

export const metadata: Metadata = {
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
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Resolve the visitor's locale: explicit cookie wins, else geo/Accept-Language.
  const cookieStore = await cookies();
  const headerStore = await headers();
  const cookieLocale = cookieStore.get('locale')?.value;
  const locale: LocaleCode = (cookieLocale && isSupportedLocale(cookieLocale))
    ? (cookieLocale as LocaleCode)
    : (detectLocale({
        country:        countryFromHeaders((n) => headerStore.get(n)),
        acceptLanguage: headerStore.get('accept-language'),
      }) as LocaleCode);

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
          <LanguageProvider initialLocale={locale}>
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
        <LanguageProvider initialLocale={locale}>
          <CurrencyProvider>
            <CartProvider>
              <TicketProvider>
                <Navbar />
                <main className="flex-1 min-h-[calc(100svh-5.25rem)]">{children}</main>
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
