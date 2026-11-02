'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useTicket } from '@/components/TicketContext';
import type { LocaleCode } from '@/lib/i18n/config';

const FOOTER_STRINGS: Record<
  LocaleCode,
  {
    availableIn: string;
    discoverTitle: string;
    helpTitle: string;
    tariffs: string;
    unlimited: string;
    topup: string;
    blog: string;
    ai: string;
    faq: string;
    ticket: string;
    telegram: string;
    terms: string;
    privacy: string;
    refund: string;
  }
> = {
  de: {
    availableIn: 'In 200+ Reisezielen verfügbar',
    discoverTitle: 'Entdecken',
    helpTitle: 'Hilfe',
    tariffs: 'Tarife',
    unlimited: 'Unlimited',
    topup: 'eSIM aufladen',
    blog: 'Blog',
    ai: 'KI-Agenten & API',
    faq: 'FAQ',
    ticket: 'Support-Ticket',
    telegram: 'Kontakt über Telegram',
    terms: 'AGB',
    privacy: 'Datenschutz',
    refund: 'Erstattungsrichtlinie',
  },
  en: {
    availableIn: 'Available in 200+ destinations',
    discoverTitle: 'Discover',
    helpTitle: 'Help',
    tariffs: 'Tariffs',
    unlimited: 'Unlimited',
    topup: 'Top up eSIM',
    blog: 'Blog',
    ai: 'AI Agents & API',
    faq: 'FAQ',
    ticket: 'Support Ticket',
    telegram: 'Contact via Telegram',
    terms: 'Terms & Conditions',
    privacy: 'Privacy Policy',
    refund: 'Refund Policy',
  },
  fr: {
    availableIn: 'Disponible dans 200+ destinations',
    discoverTitle: 'Découvrir',
    helpTitle: 'Aide',
    tariffs: 'Forfaits',
    unlimited: 'Unlimited',
    topup: "Recharger l'eSIM",
    blog: 'Blog',
    ai: 'Agents IA & API',
    faq: 'FAQ',
    ticket: "Ticket d'assistance",
    telegram: 'Contacter via Telegram',
    terms: 'CGV',
    privacy: 'Politique de confidentialité',
    refund: 'Politique de remboursement',
  },
  es: {
    availableIn: 'Disponible en más de 200 destinos',
    discoverTitle: 'Descubrir',
    helpTitle: 'Ayuda',
    tariffs: 'Tarifas',
    unlimited: 'Unlimited',
    topup: 'Recargar eSIM',
    blog: 'Blog',
    ai: 'Agentes IA & API',
    faq: 'FAQ',
    ticket: 'Ticket de soporte',
    telegram: 'Contacto vía Telegram',
    terms: 'Términos y Condiciones',
    privacy: 'Política de Privacidad',
    refund: 'Política de Reembolso',
  },
  it: {
    availableIn: 'Disponibile in oltre 200 destinazioni',
    discoverTitle: 'Scopri',
    helpTitle: 'Aiuto',
    tariffs: 'Tariffe',
    unlimited: 'Unlimited',
    topup: 'Ricarica eSIM',
    blog: 'Blog',
    ai: 'Agenti IA & API',
    faq: 'FAQ',
    ticket: 'Ticket di supporto',
    telegram: 'Contatta via Telegram',
    terms: 'Termini e Condizioni',
    privacy: 'Informativa sulla Privacy',
    refund: 'Politica di Rimborso',
  },
  nl: {
    availableIn: 'Beschikbaar in 200+ bestemmingen',
    discoverTitle: 'Ontdekken',
    helpTitle: 'Hulp',
    tariffs: 'Tarieven',
    unlimited: 'Unlimited',
    topup: 'eSIM opwaarderen',
    blog: 'Blog',
    ai: 'AI-agenten & API',
    faq: 'FAQ',
    ticket: 'Supportticket',
    telegram: 'Contact via Telegram',
    terms: 'Algemene Voorwaarden',
    privacy: 'Privacybeleid',
    refund: 'Terugbetalingsbeleid',
  },
  pl: {
    availableIn: 'Dostępne w ponad 200 kierunkach',
    discoverTitle: 'Odkryj',
    helpTitle: 'Pomoc',
    tariffs: 'Plany',
    unlimited: 'Unlimited',
    topup: 'Doładuj eSIM',
    blog: 'Blog',
    ai: 'Agenci AI i API',
    faq: 'FAQ',
    ticket: 'Zgłoszenie pomocy',
    telegram: 'Kontakt przez Telegram',
    terms: 'Regulamin',
    privacy: 'Polityka prywatności',
    refund: 'Zasady zwrotów',
  },
  pt: {
    availableIn: 'Disponível em mais de 200 destinos',
    discoverTitle: 'Descobrir',
    helpTitle: 'Ajuda',
    tariffs: 'Tarifas',
    unlimited: 'Unlimited',
    topup: 'Recarregar eSIM',
    blog: 'Blog',
    ai: 'Agentes IA & API',
    faq: 'FAQ',
    ticket: 'Ticket de apoio',
    telegram: 'Contacto via Telegram',
    terms: 'Termos e Condições',
    privacy: 'Política de Privacidade',
    refund: 'Política de Reembolso',
  },
  tr: {
    availableIn: "200'den fazla destinasyonda mevcut",
    discoverTitle: 'Keşfet',
    helpTitle: 'Yardım',
    tariffs: 'Tarifeler',
    unlimited: 'Unlimited',
    topup: 'eSIM Yükle',
    blog: 'Blog',
    ai: 'Yapay Zeka ve API',
    faq: 'FAQ',
    ticket: 'Destek Talebi',
    telegram: 'Telegram ile İletişim',
    terms: 'Kullanım Koşulları',
    privacy: 'Gizlilik Politikası',
    refund: 'Geri Ödeme Politikası',
  },
  sv: {
    availableIn: 'Tillgänglig på över 200 resmål',
    discoverTitle: 'Upptäck',
    helpTitle: 'Hjälp',
    tariffs: 'Abonnemang',
    unlimited: 'Unlimited',
    topup: 'Ladda eSIM',
    blog: 'Blog',
    ai: 'AI-agenter & API',
    faq: 'FAQ',
    ticket: 'Supportärende',
    telegram: 'Kontakt via Telegram',
    terms: 'Villkor',
    privacy: 'Integritetspolicy',
    refund: 'Återbetalningspolicy',
  },
  da: {
    availableIn: 'Tilgængelig i 200+ destinationer',
    discoverTitle: 'Opdag',
    helpTitle: 'Hjælp',
    tariffs: 'Planer',
    unlimited: 'Unlimited',
    topup: 'Optank eSIM',
    blog: 'Blog',
    ai: 'AI-agenter & API',
    faq: 'FAQ',
    ticket: 'Support-sag',
    telegram: 'Kontakt via Telegram',
    terms: 'Vilkår',
    privacy: 'Privatlivspolitik',
    refund: 'Refusionspolitik',
  },
  fi: {
    availableIn: 'Saatavilla yli 200 kohteessa',
    discoverTitle: 'Löydä',
    helpTitle: 'Ohje',
    tariffs: 'Liittymät',
    unlimited: 'Unlimited',
    topup: 'Lataa eSIM',
    blog: 'Blog',
    ai: 'Tekoälyagentit & API',
    faq: 'FAQ',
    ticket: 'Tukipyyntö',
    telegram: 'Ota yhteyttä Telegramissa',
    terms: 'Ehdot',
    privacy: 'Tietosuojakäytäntö',
    refund: 'Hyvityskäytäntö',
  },
  cs: {
    availableIn: 'K dispozici ve více než 200 destinacích',
    discoverTitle: 'Objevovat',
    helpTitle: 'Nápověda',
    tariffs: 'Tarify',
    unlimited: 'Unlimited',
    topup: 'Dobít eSIM',
    blog: 'Blog',
    ai: 'AI agenti a API',
    faq: 'FAQ',
    ticket: 'Požadavek na podporu',
    telegram: 'Kontakt přes Telegram',
    terms: 'Podmínky',
    privacy: 'Zásady ochrany osobních údajů',
    refund: 'Zásady vracení peněz',
  },
  ro: {
    availableIn: 'Disponibil în peste 200 de destinații',
    discoverTitle: 'Descoperă',
    helpTitle: 'Ajutor',
    tariffs: 'Tarife',
    unlimited: 'Unlimited',
    topup: 'Reîncarcă eSIM',
    blog: 'Blog',
    ai: 'Agenți AI și API',
    faq: 'FAQ',
    ticket: 'Tichet de asistență',
    telegram: 'Contact prin Telegram',
    terms: 'Termeni și condiții',
    privacy: 'Politica de confidențialitate',
    refund: 'Politica de rambursare',
  },
  hu: {
    availableIn: 'Több mint 200 úti célon elérhető',
    discoverTitle: 'Felfedezés',
    helpTitle: 'Súgó',
    tariffs: 'Tarifák',
    unlimited: 'Unlimited',
    topup: 'eSIM feltöltése',
    blog: 'Blog',
    ai: 'MI-ágensek és API',
    faq: 'FAQ',
    ticket: 'Támogatási jegy',
    telegram: 'Kapcsolat Telegramon',
    terms: 'Általános szerződési feltételek',
    privacy: 'Adatvédelmi irányelvek',
    refund: 'Visszatérítési szabályzat',
  },
};

export function Footer() {
  const { locale } = useTranslation();
  const isDe = locale === 'de';
  const prefix = isDe ? '' : `/${locale}`;
  const telegramHref = isDe ? '/telegram' : `/${locale}/telegram`;
  const { openTicketModal } = useTicket();
  const year = new Date().getFullYear();

  const labels = FOOTER_STRINGS[locale as LocaleCode] || FOOTER_STRINGS.de;

  return (
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600 pb-24 md:pb-8">
      <div className="mx-auto max-w-6xl px-4 py-8 md:py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* 1. Markenspalte */}
          <div className="md:col-span-2">
            <Link
              href={prefix || '/'}
              className="inline-flex items-center gap-2 font-extrabold text-xl text-[#1d4ed8] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              <Image
                src="/logo.webp"
                alt="PureSim Logo"
                width={28}
                height={28}
                loading="lazy"
                className="h-7 w-7 object-contain"
              />
              <span>PureSim</span>
            </Link>
            <p className="mt-2 text-sm text-slate-500">
              {labels.availableIn}
            </p>
          </div>

          {/* Links Columns: 2 cols side-by-side on mobile and desktop */}
          <div className="grid grid-cols-2 gap-6 md:col-span-2">
            {/* 2. Gruppe „Entdecken“ (5 Links) */}
            <nav aria-label={labels.discoverTitle}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                {labels.discoverTitle}
              </h3>
              <ul className="space-y-1 text-sm font-normal text-slate-600">
                <li>
                  <Link
                    href={`${prefix}/tariffs`}
                    prefetch={false}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {labels.tariffs}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${prefix}/unlimited`}
                    prefetch={false}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {labels.unlimited}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${prefix}/topup`}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {labels.topup}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${prefix}/blog`}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {labels.blog}
                  </Link>
                </li>
                <li>
                  <Link
                    href={`${prefix}/ai`}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded whitespace-nowrap"
                  >
                    {labels.ai}
                  </Link>
                </li>
              </ul>
            </nav>

            {/* 3. Gruppe „Hilfe“ (3 Einträge) */}
            <nav aria-label={labels.helpTitle}>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
                {labels.helpTitle}
              </h3>
              <ul className="space-y-1 text-sm font-normal text-slate-600">
                <li>
                  <Link
                    href={`${prefix}/faq`}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                  >
                    {labels.faq}
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => openTicketModal()}
                    className="flex items-center text-left min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded whitespace-nowrap"
                  >
                    {labels.ticket}
                  </button>
                </li>
                <li>
                  <Link
                    href={telegramHref}
                    className="flex items-center min-h-[44px] md:min-h-[32px] md:py-1 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded whitespace-nowrap"
                  >
                    {labels.telegram}
                  </Link>
                </li>
              </ul>
            </nav>
          </div>
        </div>

        {/* 4. Untere Leiste: © links, AGB · Datenschutz · Erstattungsrichtlinie inline rechts */}
        <div className="mt-8 pt-6 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© {year} PureSim.net</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <Link
              href={`${prefix}/agb`}
              className="min-h-[44px] md:min-h-0 flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.terms}
            </Link>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <Link
              href={`${prefix}/datenschutz`}
              className="min-h-[44px] md:min-h-0 flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.privacy}
            </Link>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <Link
              href={`${prefix}/refund-policy`}
              className="min-h-[44px] md:min-h-0 flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.refund}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
