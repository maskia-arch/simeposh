import type { Metadata } from 'next';
import { getServerLocale } from '@/lib/i18n/server';

export const metadata: Metadata = {
  title: 'AGB | Terms and Conditions',
  description: 'Allgemeine Geschäftsbedingungen und Nutzungsbedingungen von eSIM Shop.',
};

export default async function TermsPage() {
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
            {isDe ? 'Allgemeine Geschäftsbedingungen' : 'Terms and Conditions'}
          </h1>
          <p className="mt-3 text-slate-500 text-sm">
            {isDe
              ? 'Zuletzt aktualisiert: Juni 2026'
              : 'Last updated: June 2026'}
          </p>
        </div>

        {/* Content Card */}
        <div className="rounded-3xl border border-slate-200/60 bg-white/70 backdrop-blur-md p-8 md:p-10 shadow-sm space-y-8 text-slate-700 leading-relaxed text-sm md:text-base">
          {isDe ? (
            <>
              {/* GERMAN VERSION */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">1.</span> Vertragsschluss
                </h2>
                <p>
                  Ein verbindlicher Kaufvertrag über die Bereitstellung von eSIM-Profilen oder
                  Datenpaketen (Top-ups) zwischen dem Käufer und dem Shop kommt zustande, sobald
                  der Kunde den Bestellprozess abschließt und eine Zahlungsaufforderung generiert wird.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">2.</span> Bereitstellung und Aktivierung (Lieferung)
                </h2>
                <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                  <p>
                    <strong>Digitale Bereitstellung:</strong> Die Bereitstellung der bestellten
                    eSIM-Profile erfolgt in der Regel sofort nach Zahlungseingang per E-Mail
                    (als QR-Code) sowie direkt im Kunden-Dashboard.
                  </p>
                  <p>
                    <strong>Verantwortung des Kunden:</strong> Der Kunde ist selbst dafür verantwortlich,
                    vor dem Kauf zu prüfen, ob sein Endgerät eSIM-kompatibel ist und keinen
                    SIM-Lock (Netzsperre) besitzt. Eine Erstattung aufgrund von Inkompatibilität des
                    Endgeräts ist nach Bereitstellung des QR-Codes ausgeschlossen.
                  </p>
                  <p>
                    <strong>Aktivierung:</strong> Das Datenpaket wird, sofern in der Produktbeschreibung
                    nicht anders angegeben, mit der ersten Verbindung zu einem unterstützten Partnernetzwerk
                    im Reiseland aktiviert.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">3.</span> Nutzungsrechte und Eigentumsvorbehalt
                </h2>
                <p>
                  Da es sich um digitale Dienstleistungen und Profile handelt, verbleiben alle Rechte
                  an der technischen Infrastruktur beim Shop bzw. dem jeweiligen Netzbetreiber. Dem Kunden
                  wird mit vollständiger Zahlung ein einfaches, nicht übertragbares Recht eingeräumt,
                  das eSIM-Profil auf einem kompatiblen Endgerät im Rahmen des erworbenen Datenvolumens
                  und Gültigkeitszeitraums zu nutzen.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">4.</span> Fair Use und Nutzerverhalten
                </h2>
                <p>
                  <strong>Missbrauchsschutz:</strong> Der Shop behält sich das Recht vor, eSIM-Profile
                  oder Nutzerkonten temporär zu sperren oder dauerhaft von zukünftigen Käufen
                  auszuschließen, wenn der Verdacht auf Missbrauch, betrügerische Aktivitäten (z. B.
                  Chargebacks ohne vorherige Kontaktaufnahme) oder eine Nutzung, die gegen die
                  Fair-Use-Policies der lokalen Netzbetreiber verstößt, vorliegt.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">5.</span> Support und Erreichbarkeit
                </h2>
                <p>
                  Der Kundensupport steht für technische Fragen zur Einrichtung und Aktivierung der
                  eSIM permanent per Live-Chat zur Verfügung. Außerhalb der regulären Geschäftszeiten
                  werden Support-Anfragen über unser Ticket-System entgegengenommen und chronologisch
                  abgearbeitet.
                </p>
                <p className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-medium text-xs md:text-sm text-slate-600">
                  📅 <strong>Geschäftszeiten (Live-Support):</strong> Montag bis Samstag, 09:00–23:00 Uhr (CET).
                </p>
              </section>
            </>
          ) : (
            <>
              {/* ENGLISH VERSION */}
              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">1.</span> Conclusion of Contract
                </h2>
                <p>
                  A binding purchase agreement for the provision of eSIM profiles or data packages
                  (top-ups) between the buyer and the shop is concluded as soon as the customer
                  completes the ordering process and a payment request is generated.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">2.</span> Provision and Activation (Delivery)
                </h2>
                <div className="space-y-2 pl-4 border-l-2 border-slate-100">
                  <p>
                    <strong>Digital Provision:</strong> The ordered eSIM profiles are usually provided
                    immediately after receipt of payment via email (as a QR code) and directly
                    in the customer dashboard.
                  </p>
                  <p>
                    <strong>Customer Responsibility:</strong> The customer is solely responsible for
                    checking prior to purchase whether their end device is eSIM-compatible and does not
                    have a SIM lock (network lock). A refund due to incompatibility of the end device is
                    excluded once the QR code has been provided.
                  </p>
                  <p>
                    <strong>Activation:</strong> Unless stated otherwise in the product description, the
                    data package is activated upon the first connection to a supported partner network in
                    the destination country.
                  </p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">3.</span> Rights of Use and Retention of Title
                </h2>
                <p>
                  Since these are digital services and profiles, all rights to the technical infrastructure
                  remain with the shop or the respective network operator. Upon full payment, the customer
                  is granted a simple, non-transferable right to use the eSIM profile on a compatible device
                  within the scope of the purchased data volume and validity period.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">4.</span> Fair Use and User Conduct
                </h2>
                <p>
                  <strong>Abuse Protection:</strong> The shop reserves the right to temporarily suspend
                  eSIM profiles or user accounts or permanently exclude them from future purchases if
                  there is suspicion of abuse, fraudulent activities (e.g. chargebacks without prior
                  contact), or usage that violates the fair use policies of local network operators.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <span className="text-brand-600">5.</span> Support and Availability
                </h2>
                <p>
                  Customer support is continuously available via live chat for technical questions regarding
                  the setup and activation of the eSIM. Outside of regular business hours, support requests
                  are accepted via our ticket system and processed chronologically.
                </p>
                <p className="bg-slate-50 rounded-xl p-4 border border-slate-100 font-medium text-xs md:text-sm text-slate-600">
                  📅 <strong>Business hours (Live Support):</strong> Monday to Saturday, 09:00 AM – 11:00 PM (CET).
                </p>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
