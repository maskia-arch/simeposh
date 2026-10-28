import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { FaqPageClient } from '@/components/FaqPageClient';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const title = t('faq_title' as any) || (locale === 'de' ? 'Häufig gestellte Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)');
  const description = t('meta_faq_desc' as any) || (locale === 'de'
    ? 'Alle Antworten zu PureSim eSIM: Kompatibilität, Aktivierung per QR-Code, Aufladung (Top-Up), Zahlung und Cashback.'
    : 'Answers to all your PureSim eSIM questions: device compatibility, QR code activation, top-ups, crypto payments, and cashback.');

  return {
    title,
    description,
    alternates: buildAlternates(locale, { dePath: 'faq', enPath: 'faq' }),
    openGraph: {
      title: `${title} · PureSim`,
      description,
      type: 'website',
      locale: getOgLocale(locale),
      alternateLocale: getOgLocaleAlternates(locale),
      url: `${BASE_URL}${locale === 'de' ? '' : `/${locale}`}/faq`,
    },
  };
}

export default async function FaqPage() {
  const locale = await getServerLocale();
  const t = getServerT(locale);

  const faqs = [
    { q: t('faq_q1' as any), a: t('faq_a1' as any) },
    { q: t('faq_q2' as any), a: t('faq_a2' as any) },
    { q: t('faq_q3' as any), a: t('faq_a3' as any) },
    { q: t('faq_q4' as any), a: t('faq_a4' as any) },
    { q: t('faq_q5' as any), a: t('faq_a5' as any) },
    { q: t('faq_q6' as any), a: t('faq_a6' as any) },
  ];

  const title = t('faq_title' as any) || (locale === 'de' ? 'Häufig gestellte Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)');
  const subtitle = t('meta_faq_subtitle' as any) || (locale === 'de'
    ? 'Finde schnell Antworten zu unseren eSIM-Tarifen, Installation, Datenpaketen und Bezahlung.'
    : 'Quick answers about our eSIM plans, setup, data packages, and payments.');

  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.a,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <FaqPageClient title={title} subtitle={subtitle} faqs={faqs} />
    </>
  );
}
