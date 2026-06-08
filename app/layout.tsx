import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProvider } from '@/components/LanguageProvider';

export const metadata: Metadata = {
  title: {
    default:  'eSIM Shop – Günstige eSIMs weltweit',
    template: '%s | eSIM Shop',
  },
  description:
    'Kaufe sofort einsatzbereite eSIMs für über 150 Länder. Günstiger Tarif, einfache Aktivierung, kein Aufpreis.',
  keywords: ['eSIM', 'Reise SIM', 'Datenpaket', 'Roaming', 'eSIM kaufen'],
  openGraph: {
    type:   'website',
    locale: 'de_DE',
    title:  'eSIM Shop',
    description: 'eSIMs für über 150 Länder – sofort verfügbar.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
