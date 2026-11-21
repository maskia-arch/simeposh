import type { Metadata } from 'next';
import { getServerLocale, getServerT } from '@/lib/i18n/server';
import { buildAlternates, BASE_URL, getOgLocale, getOgLocaleAlternates } from '@/lib/seo';
import { FaqPageClient } from '@/components/FaqPageClient';

export const revalidate = 600;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = getServerT(locale);
  const rawTitle = t('faq_title');
  const title = (rawTitle && rawTitle !== 'faq_title')
    ? rawTitle
    : (locale === 'de' ? 'Häufig gestellte Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)');

  const rawDescription = t('meta_faq_desc');
  const description = (rawDescription && rawDescription !== 'meta_faq_desc')
    ? rawDescription
    : (locale === 'de'
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
    { q: t('faq_q1'), a: t('faq_a1') },
    { q: t('faq_q2'), a: t('faq_a2') },
    { q: t('faq_q3'), a: t('faq_a3') },
    { q: t('faq_q4'), a: t('faq_a4') },
    { q: t('faq_q5'), a: t('faq_a5') },
    { q: t('faq_q6'), a: t('faq_a6') },
  ];

  const rawTitle = t('faq_title');
  const title = (rawTitle && rawTitle !== 'faq_title')
    ? rawTitle
    : (locale === 'de' ? 'Häufig gestellte Fragen (FAQ)' : 'Frequently Asked Questions (FAQ)');

  const rawSubtitle = t('meta_faq_subtitle');
  const subtitle = (rawSubtitle && rawSubtitle !== 'meta_faq_subtitle')
    ? rawSubtitle
    : (locale === 'de'
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
