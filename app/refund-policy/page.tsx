import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'Erstattungsrichtlinie | Refund Policy',
  description: 'Erstattungsrichtlinien und Bestimmungen zur Stornierung von eSIM-Datenpaketen von PureSim.',
};

export default async function RefundPolicyPage() {
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
            {isDe ? 'Erstattungsrichtlinie' : 'Refund Policy'}
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
                <h2 className="text-lg font-bold text-slate-900">1. Digitale Produkte & Ausschluss des Widerrufsrechts</h2>
                <p>
                  Aufgrund der Natur digitaler Güter (eSIM-Profile und Datenpakete) erlischt das
                  Widerrufsrecht, sobald die Bereitstellung des QR-Codes bzw. Aktivierungscodes
                  erfolgt ist (Versand per E-Mail oder Anzeige im Dashboard). Eine Rückgabe oder
                  Erstattung ist ab diesem Zeitpunkt grundsätzlich ausgeschlossen.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Inkompatibilität des Endgeräts</h2>
                <p>
                  Es liegt in der alleinigen Verantwortung des Käufers, vor dem Abschluss des Kaufs zu
                  prüfen, ob das genutzte Endgerät eSIM-kompatibel und SIM-lock-frei ist. Eine
                  Erstattung aufgrund von Inkompatibilität des Smartphones ist nach Zusendung des Profils
                  nicht möglich.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Technische Störungen</h2>
                <p>
                  Sollte ein nachweisbarer technischer Defekt des eSIM-Profils vorliegen und eine Nutzung
                  auch nach Rücksprache mit unserem Support-Team nicht möglich sein, prüfen wir eine
                  Kulanz-Erstattung oder den Austausch des Profils.
                </p>
              </section>
            </>
          ) : (
            <>
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">1. Digital Products & Exclusion of Right of Withdrawal</h2>
                <p>
                  Due to the nature of digital goods (eSIM profiles and data packages), the right of
                  withdrawal expires as soon as the QR code or activation code has been provided (via email or
                  displayed in the dashboard). Returns or refunds are generally excluded after this point.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">2. Incompatibility of the Device</h2>
                <p>
                  It is the sole responsibility of the buyer to verify before purchasing whether their device is
                  eSIM-compatible and carrier-unlocked. A refund due to device incompatibility is not possible
                  after the profile has been sent.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900">3. Technical Malfunctions</h2>
                <p>
                  If a verifiable technical defect in the eSIM profile exists and usage is not possible even
                  after consulting our support team, we will review the case for a goodwill refund or a replacement
                  profile.
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
