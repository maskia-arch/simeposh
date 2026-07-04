import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageProvider';
import { CartProvider } from '@/components/CartProvider';
import { CartDrawer } from '@/components/CartDrawer';
import { CurrencyProvider } from '@/components/CurrencyProvider';
import { detectLocale, countryFromHeaders, isSupportedLocale } from '@/lib/i18n/detect';
import type { LocaleCode } from '@/lib/i18n';
import { InitialLoaderRemover } from '@/components/InitialLoaderRemover';

export const metadata: Metadata = {
  title: {
    default:  'PureSim – Günstige eSIMs weltweit',
    template: '%s | PureSim',
  },
  description:
    'Kaufe sofort einsatzbereite eSIMs für über 150 Länder. Günstiger Tarif, einfache Aktivierung, kein Aufpreis.',
  keywords: ['eSIM', 'Reise SIM', 'Datenpaket', 'Roaming', 'eSIM kaufen', 'PureSim'],
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
        {/* Static HTML Initial Page Loader */}
        <div
          id="initial-loader"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #1e3a8a, #0b0f19)',
            color: 'white',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            transition: 'opacity 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            opacity: 1,
          }}
        >
          <style dangerouslySetInnerHTML={{ __html: `
            @keyframes spin-loader {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes pulse-logo {
              0%, 100% { transform: scale(0.95); opacity: 0.85; filter: drop-shadow(0 0 5px rgba(59,130,246,0.3)); }
              50% { transform: scale(1.06); opacity: 1; filter: drop-shadow(0 0 20px rgba(59,130,246,0.7)); }
            }
            @keyframes pulse-text-loader {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          ` }} />
          <img src="/logo.png" alt="PureSim Logo" style={{ width: '5rem', height: '5rem', marginBottom: '1.5rem', animation: 'pulse-logo 2s infinite ease-in-out', userSelect: 'none', objectFit: 'contain' }} />
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div
              style={{
                width: '2.75rem',
                height: '2.75rem',
                border: '3.5px solid rgba(255,255,255,0.05)',
                borderTopColor: '#3b82f6',
                borderRightColor: '#6366f1',
                borderRadius: '50%',
                animation: 'spin-loader 0.85s infinite linear',
              }}
            />
            <div style={{ position: 'absolute', width: '1rem', height: '1rem', borderRadius: '50%', backgroundColor: '#3b82f6', animation: 'ping 1s infinite', opacity: 0.6 }} />
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.15em', color: '#94a3b8', textTransform: 'uppercase', animation: 'pulse-text-loader 1.5s infinite ease-in-out', userSelect: 'none' }}>
            Verbindung wird aufgebaut...
          </p>
        </div>

        <LanguageProvider initialLocale={locale}>
          <CurrencyProvider>
            <CartProvider>
              <Navbar />
              <main className="flex-1">{children}</main>
              <Footer />
              <CartDrawer />
            </CartProvider>
          </CurrencyProvider>
        </LanguageProvider>

        <InitialLoaderRemover />
      </body>
    </html>
  );
}
