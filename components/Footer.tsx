'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { useTicket } from '@/components/TicketContext';
import type { LocaleCode } from '@/lib/i18n/config';

interface FooterTexts {
  availableIn: string;
  discoverTitle: string;
  helpTitle: string;
  legalTitle: string;
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

const FOOTER_STRINGS: Record<LocaleCode, FooterTexts> = {
  de: {
    availableIn: 'In 200+ Reisezielen verfügbar',
    discoverTitle: 'Entdecken',
    helpTitle: 'Hilfe',
    legalTitle: 'Rechtliches',
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
    legalTitle: 'Legal',
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
    legalTitle: 'Mentions légales',
    tariffs: 'Forfaits',
    unlimited: 'Unlimited',
    topup: "Recharger l'eSIM",
    blog: 'Blog',
    ai: 'Agents IA & API',
    faq: 'FAQ',
    ticket: "Ticket d'assistance",
    telegram: 'Contacter via Telegram',
    terms: 'CGV',
    privacy: 'Confidentialité',
    refund: 'Remboursement',
  },
  es: {
    availableIn: 'Disponible en más de 200 destinos',
    discoverTitle: 'Descubrir',
    helpTitle: 'Ayuda',
    legalTitle: 'Legal',
    tariffs: 'Tarifas',
    unlimited: 'Unlimited',
    topup: 'Recargar eSIM',
    blog: 'Blog',
    ai: 'Agentes IA & API',
    faq: 'FAQ',
    ticket: 'Ticket de soporte',
    telegram: 'Contacto vía Telegram',
    terms: 'Términos',
    privacy: 'Privacidad',
    refund: 'Reembolso',
  },
  it: {
    availableIn: 'Disponibile in oltre 200 destinazioni',
    discoverTitle: 'Scopri',
    helpTitle: 'Aiuto',
    legalTitle: 'Informazioni legali',
    tariffs: 'Tariffe',
    unlimited: 'Unlimited',
    topup: 'Ricarica eSIM',
    blog: 'Blog',
    ai: 'Agenti IA & API',
    faq: 'FAQ',
    ticket: 'Ticket di supporto',
    telegram: 'Contatto via Telegram',
    terms: 'Termini',
    privacy: 'Privacy',
    refund: 'Rimborsi',
  },
  nl: {
    availableIn: 'Beschikbaar in 200+ bestemmingen',
    discoverTitle: 'Ontdekken',
    helpTitle: 'Hulp',
    legalTitle: 'Juridisch',
    tariffs: 'Tarieven',
    unlimited: 'Unlimited',
    topup: 'eSIM opwaarderen',
    blog: 'Blog',
    ai: 'AI-agents & API',
    faq: 'FAQ',
    ticket: 'Supportticket',
    telegram: 'Contact via Telegram',
    terms: 'Voorwaarden',
    privacy: 'Privacy',
    refund: 'Restitutiebeleid',
  },
  pl: {
    availableIn: 'Dostępne w ponad 200 kierunkach',
    discoverTitle: 'Odkrywaj',
    helpTitle: 'Pomoc',
    legalTitle: 'Informacje prawne',
    tariffs: 'Taryfy',
    unlimited: 'Unlimited',
    topup: 'Doładuj eSIM',
    blog: 'Blog',
    ai: 'Agenci AI i API',
    faq: 'FAQ',
    ticket: 'Zgłoszenie do pomocy',
    telegram: 'Kontakt przez Telegram',
    terms: 'Regulamin',
    privacy: 'Prywatność',
    refund: 'Zwroty',
  },
  pt: {
    availableIn: 'Disponível em mais de 200 destinos',
    discoverTitle: 'Descobrir',
    helpTitle: 'Ajuda',
    legalTitle: 'Avisos legais',
    tariffs: 'Tarifários',
    unlimited: 'Unlimited',
    topup: 'Recarregar eSIM',
    blog: 'Blog',
    ai: 'Agentes de IA e API',
    faq: 'FAQ',
    ticket: 'Ticket de apoio',
    telegram: 'Contacto via Telegram',
    terms: 'Termos',
    privacy: 'Privacidade',
    refund: 'Reembolso',
  },
  tr: {
    availableIn: "200'den fazla varış noktasında",
    discoverTitle: 'Keşfet',
    helpTitle: 'Yardım',
    legalTitle: 'Yasal',
    tariffs: 'Tarifeler',
    unlimited: 'Unlimited',
    topup: 'eSIM Yükle',
    blog: 'Blog',
    ai: 'Yapay Zeka & API',
    faq: 'SSS',
    ticket: 'Destek Bileti',
    telegram: "Telegram'dan İletişim",
    terms: 'Şartlar',
    privacy: 'Gizlilik',
    refund: 'İade Politikası',
  },
  sv: {
    availableIn: 'Tillgängligt i 200+ destinationer',
    discoverTitle: 'Upptäck',
    helpTitle: 'Hjälp',
    legalTitle: 'Juridiskt',
    tariffs: 'Tariffer',
    unlimited: 'Unlimited',
    topup: 'Ladda eSIM',
    blog: 'Blogg',
    ai: 'AI-agenter & API',
    faq: 'FAQ',
    ticket: 'Supportärende',
    telegram: 'Kontakt via Telegram',
    terms: 'Villkor',
    privacy: 'Integritetspolicy',
    refund: 'Återbetalning',
  },
  da: {
    availableIn: 'Tilgængelig i 200+ destinationer',
    discoverTitle: 'Udforsk',
    helpTitle: 'Hjælp',
    legalTitle: 'Juridisk',
    tariffs: 'Takster',
    unlimited: 'Unlimited',
    topup: 'Optank eSIM',
    blog: 'Blog',
    ai: 'AI-agenter & API',
    faq: 'FAQ',
    ticket: 'Supportbillet',
    telegram: 'Kontakt via Telegram',
    terms: 'Vilkår',
    privacy: 'Privatliv',
    refund: 'Refusion',
  },
  fi: {
    availableIn: 'Saatavilla yli 200 kohteessa',
    discoverTitle: 'Löydä',
    helpTitle: 'Ohje',
    legalTitle: 'Lakitiedot',
    tariffs: 'Hinnat',
    unlimited: 'Unlimited',
    topup: 'Lataa eSIM',
    blog: 'Blogi',
    ai: 'Tekoälyagentit ja API',
    faq: 'UKK',
    ticket: 'Tukipyyntö',
    telegram: 'Ota yhteyttä Telegramissa',
    terms: 'Ehdot',
    privacy: 'Tietosuoja',
    refund: 'Hyvityskäytäntö',
  },
  cs: {
    availableIn: 'Dostupné ve více než 200 destinacích',
    discoverTitle: 'Objevovat',
    helpTitle: 'Nápověda',
    legalTitle: 'Právní informace',
    tariffs: 'Tarify',
    unlimited: 'Unlimited',
    topup: 'Dobít eSIM',
    blog: 'Blog',
    ai: 'AI agenti & API',
    faq: 'Často kladené otázky',
    ticket: 'Požadavek na podporu',
    telegram: 'Kontakt přes Telegram',
    terms: 'Podmínky',
    privacy: 'Soukromí',
    refund: 'Vrácení peněz',
  },
  ro: {
    availableIn: 'Disponibil în 200+ destinații',
    discoverTitle: 'Descoperă',
    helpTitle: 'Ajutor',
    legalTitle: 'Legal',
    tariffs: 'Tarife',
    unlimited: 'Unlimited',
    topup: 'Reîncarcă eSIM',
    blog: 'Blog',
    ai: 'Agenți AI și API',
    faq: 'FAQ',
    ticket: 'Tichet de asistență',
    telegram: 'Contact prin Telegram',
    terms: 'Termeni și condiții',
    privacy: 'Confidențialitate',
    refund: 'Politica de rambursare',
  },
  hu: {
    availableIn: 'Több mint 200 úti célon elérhető',
    discoverTitle: 'Felfedezés',
    helpTitle: 'Súgó',
    legalTitle: 'Jogi információk',
    tariffs: 'Tarifák',
    unlimited: 'Unlimited',
    topup: 'eSIM feltöltése',
    blog: 'Blog',
    ai: 'MI-ágensek és API',
    faq: 'GYIK',
    ticket: 'Támogatási jegy',
    telegram: 'Kapcsolat Telegramon',
    terms: 'Feltételek',
    privacy: 'Adatvédelem',
    refund: 'Visszatérítés',
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
    <footer className="border-t border-slate-200 bg-slate-50 text-slate-600 pb-16 md:pb-6">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-6 md:gap-x-12">
          {/* 1. Markenspalte */}
          <div>
            <Link
              href={prefix || '/'}
              className="inline-flex items-center gap-2 font-extrabold text-xl text-[#1d4ed8] min-h-[44px] md:min-h-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
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
            <p className="mt-1 text-xs text-slate-500">
              {labels.availableIn}
            </p>
          </div>

          {/* 2. Gruppe „Entdecken“ (5 Links) */}
          <nav aria-label={labels.discoverTitle} className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {labels.discoverTitle}
            </h3>
            <ul className="space-y-0.5 text-xs text-slate-600">
              <li>
                <Link
                  href={`${prefix}/tariffs`}
                  prefetch={false}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.tariffs}
                </Link>
              </li>
              <li>
                <Link
                  href={`${prefix}/unlimited`}
                  prefetch={false}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.unlimited}
                </Link>
              </li>
              <li>
                <Link
                  href={`${prefix}/topup`}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.topup}
                </Link>
              </li>
              <li>
                <Link
                  href={`${prefix}/blog`}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.blog}
                </Link>
              </li>
              <li>
                <Link
                  href={`${prefix}/ai`}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.ai}
                </Link>
              </li>
            </ul>
          </nav>

          {/* 3. Gruppe „Hilfe“ (3 Einträge) */}
          <nav aria-label={labels.helpTitle} className="min-w-0">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              {labels.helpTitle}
            </h3>
            <ul className="space-y-0.5 text-xs text-slate-600">
              <li>
                <Link
                  href={`${prefix}/faq`}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.faq}
                </Link>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openTicketModal()}
                  className="flex items-center text-left min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.ticket}
                </button>
              </li>
              <li>
                <Link
                  href={telegramHref}
                  className="flex items-center min-h-[44px] md:min-h-[24px] md:py-0.5 hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
                >
                  {labels.telegram}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        {/* 4. Untere Leiste: © links, AGB / Datenschutz / Erstattungsrichtlinie rechts mit pr-20 */}
        <div className="mt-6 pt-4 border-t border-slate-200/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-500 md:pr-20">
          <p className="shrink-0">© {year} PureSim.net</p>
          <nav aria-label={labels.legalTitle} className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
            <Link
              href={`${prefix}/agb`}
              className="min-h-[44px] md:min-h-[24px] flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.terms}
            </Link>
            <span aria-hidden="true" className="text-slate-300 select-none hidden sm:inline">·</span>
            <Link
              href={`${prefix}/datenschutz`}
              className="min-h-[44px] md:min-h-[24px] flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.privacy}
            </Link>
            <span aria-hidden="true" className="text-slate-300 select-none hidden sm:inline">·</span>
            <Link
              href={`${prefix}/refund-policy`}
              className="min-h-[44px] md:min-h-[24px] flex items-center hover:text-[#2563eb] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              {labels.refund}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
