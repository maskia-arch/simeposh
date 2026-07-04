import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Datenschutz | Privacy Policy',
  description: 'Datenschutzerklärung und Bestimmungen zum Schutz personenbezogener Daten von PureSim.',
};

export default async function PrivacyPage() {
  const locale = await getServerLocale();
  const isDe = locale === 'de';

  return (
    <div className="relative min-h-screen bg-slate-50/50 py-16 px-4 sm:px-6 lg:px-8">
      {/* Background gradients */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-brand-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl">
        {/* Breadcrumb */}
        <div className="mb-6">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            {isDe ? 'Rechtliches' : 'Legal'}
          </span>
        </div>

        {/* Page Header */}
        <div className="mb-12 border-b border-slate-200/60 pb-8">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            {isDe ? 'Datenschutzerklärung' : 'Privacy Policy'}
          </h1>
          <p className="mt-3 text-slate-500 text-sm">
            {isDe ? 'Zuletzt aktualisiert: Juni 2026' : 'Last updated: June 2026'}
          </p>
        </div>

        {/* Content Card */}
        <div className="rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-8 md:p-10 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
          {isDe ? (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">1. Allgemeine Hinweise</h2>
                <p>
                  Der Schutz Ihrer persönlichen Daten ist uns ein wichtiges Anliegen. Wir behandeln
                  Ihre personenbezogenen Daten vertraulich und entsprechend den gesetzlichen
                  Datenschutzvorschriften sowie dieser Datenschutzerklärung.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Erhebung und Verarbeitung von Daten</h2>
                <p>
                  Wir erheben und verarbeiten personenbezogene Daten (wie Name, E-Mail-Adresse und
                  Zahlungsdaten) nur, soweit dies für die Begründung, inhaltliche Ausgestaltung oder
                  Änderung des Rechtsverhältnisses erforderlich ist (Bestandsdaten) oder um die Nutzung
                  unserer Dienste zu ermöglichen (Nutzungsdaten).
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Datensicherheit</h2>
                <p>
                  Diese Seite nutzt aus Sicherheitsgründen und zum Schutz der Übertragung vertraulicher Inhalte,
                  wie zum Beispiel Bestellungen oder Anfragen, eine SSL- bzw. TLS-Verschlüsselung.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">1. General Information</h2>
                <p>
                  The protection of your personal data is very important to us. We treat your personal
                  data confidentially and in accordance with statutory data protection regulations and
                  this privacy policy.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Collection and Processing of Data</h2>
                <p>
                  We collect and process personal data (such as name, email address, and payment details)
                  only to the extent necessary to establish, format, or change the legal relationship (master data)
                  or to enable the use of our services (usage data).
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Data Security</h2>
                <p>
                  For security reasons and to protect the transmission of confidential content, such as
                  orders or inquiries, this site uses SSL or TLS encryption.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
