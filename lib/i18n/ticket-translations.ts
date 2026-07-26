export type TicketLocale = 'de' | 'en' | 'fr' | 'es' | 'it' | 'nl' | 'pl' | 'pt' | 'tr' | 'sv' | 'da' | 'fi' | 'cs' | 'ro' | 'hu';

export interface TicketDictionary {
  modalTitle: string;
  modalSub: string;
  emailLabel: string;
  nameLabel: string;
  categoryLabel: string;
  subjectLabel: string;
  invoiceIdLabel: string;
  iccidLabel: string;
  descriptionLabel: string;
  attachmentsLabel: string;
  submitBtn: string;
  submitting: string;
  cancelBtn: string;
  successTitle: string;
  successMsg: string;
  successBadge: string;
  viewDashboardBtn: string;
  closeBtn: string;
  catGeneral: string;
  catActivation: string;
  catPayment: string;
  catEsimIssue: string;
  catRefund: string;
  catOther: string;
  tabTicketsTitle: string;
  tabTicketsSub: string;
  newTicketBtn: string;
  filterAll: string;
  filterOpen: string;
  filterClosed: string;
  noTickets: string;
  selectTicketHint: string;
  replyPlaceholder: string;
  sendBtn: string;
  closeTicketBtn: string;
  ticketClosedNotice: string;
  statusOpen: string;
  statusInProgress: string;
  statusAnswered: string;
  statusCustomerReply: string;
  statusClosed: string;
}

const DE: TicketDictionary = {
  modalTitle: 'Support-Ticket öffnen',
  modalSub: 'Wir helfen dir schnellstmöglich weiter',
  emailLabel: 'E-Mail-Adresse *',
  nameLabel: 'Name (optional)',
  categoryLabel: 'Kategorie *',
  subjectLabel: 'Betreff *',
  invoiceIdLabel: 'Rechnungs-ID (vorausgefüllt)',
  iccidLabel: 'ICCID (vorausgefüllt)',
  descriptionLabel: 'Beschreibung deines Anliegens *',
  attachmentsLabel: 'Screenshots / Anhänge (optional)',
  submitBtn: 'Ticket Absenden',
  submitting: 'Wird übermittelt...',
  cancelBtn: 'Abbrechen',
  successTitle: 'Ticket erfolgreich erstellt!',
  successMsg: 'Wir haben dir eine Bestätigung per E-Mail gesendet. Du kannst das Ticket in deinem Dashboard nachverfolgen.',
  successBadge: 'Deine Ticket-Nummer:',
  viewDashboardBtn: 'Zu meinen Tickets im Dashboard',
  closeBtn: 'Schließen',
  catGeneral: 'Allgemeine Frage',
  catActivation: 'eSIM Aktivierung & Installation',
  catPayment: 'Zahlung & Krypto-Checkout',
  catEsimIssue: 'Kein Empfang / Datenprobleme',
  catRefund: 'Stornierung & Erstattung',
  catOther: 'Sonstiges',
  tabTicketsTitle: 'Support-Tickets',
  tabTicketsSub: 'Verwalte deine Anfragen und kommuniziere direkt mit unserem Support-Team.',
  newTicketBtn: 'Neues Ticket erstellen',
  filterAll: 'Alle',
  filterOpen: 'Offen',
  filterClosed: 'Geschlossen',
  noTickets: 'Keine Tickets vorhanden',
  selectTicketHint: 'Wähle ein Ticket aus der Liste links aus, um den Verlauf einzusehen.',
  replyPlaceholder: 'Deine Antwort eingeben...',
  sendBtn: 'Senden',
  closeTicketBtn: 'Ticket schließen',
  ticketClosedNotice: 'Dieses Ticket ist geschlossen. Erstelle ein neues Ticket für weitere Fragen.',
  statusOpen: 'Offen',
  statusInProgress: 'In Bearbeitung',
  statusAnswered: 'Beantwortet',
  statusCustomerReply: 'Kundenantwort',
  statusClosed: 'Geschlossen',
};

const EN: TicketDictionary = {
  modalTitle: 'Open Support Ticket',
  modalSub: 'We will help you as quickly as possible',
  emailLabel: 'Email Address *',
  nameLabel: 'Name (optional)',
  categoryLabel: 'Category *',
  subjectLabel: 'Subject *',
  invoiceIdLabel: 'Invoice ID (pre-filled)',
  iccidLabel: 'ICCID (pre-filled)',
  descriptionLabel: 'Issue Description *',
  attachmentsLabel: 'Screenshots / Attachments (optional)',
  submitBtn: 'Submit Ticket',
  submitting: 'Submitting...',
  cancelBtn: 'Cancel',
  successTitle: 'Ticket Successfully Created!',
  successMsg: 'We have sent a confirmation email to you. You can track this ticket in your dashboard.',
  successBadge: 'Your Ticket Number:',
  viewDashboardBtn: 'View Tickets in Dashboard',
  closeBtn: 'Close',
  catGeneral: 'General Question',
  catActivation: 'eSIM Activation & Setup',
  catPayment: 'Payment & Crypto Checkout',
  catEsimIssue: 'No Service / Data Issues',
  catRefund: 'Cancellation & Refund',
  catOther: 'Other',
  tabTicketsTitle: 'Support Tickets',
  tabTicketsSub: 'Manage your inquiries and communicate directly with support.',
  newTicketBtn: 'Create New Ticket',
  filterAll: 'All',
  filterOpen: 'Open',
  filterClosed: 'Closed',
  noTickets: 'No tickets found',
  selectTicketHint: 'Select a ticket from the left to view conversation details.',
  replyPlaceholder: 'Type your reply...',
  sendBtn: 'Send',
  closeTicketBtn: 'Close Ticket',
  ticketClosedNotice: 'This ticket is closed. Create a new ticket if you need further help.',
  statusOpen: 'Open',
  statusInProgress: 'In Progress',
  statusAnswered: 'Answered',
  statusCustomerReply: 'Customer Reply',
  statusClosed: 'Closed',
};

const FR: TicketDictionary = {
  ...EN,
  modalTitle: 'Ouvrir un ticket de support',
  modalSub: 'Nous vous aiderons dans les plus brefs délais',
  emailLabel: 'Adresse E-mail *',
  categoryLabel: 'Catégorie *',
  subjectLabel: 'Sujet *',
  descriptionLabel: 'Description du problème *',
  submitBtn: 'Envoyer le ticket',
  catGeneral: 'Question générale',
  catActivation: 'Activation & Installation eSIM',
  catPayment: 'Paiement & Crypto',
  catEsimIssue: 'Pas de réseau / Problème de données',
  catRefund: 'Remboursement',
  tabTicketsTitle: 'Tickets de Support',
  newTicketBtn: 'Nouveau ticket',
  statusOpen: 'Ouvert',
  statusAnswered: 'Répondu',
  statusClosed: 'Fermé',
};

const ES: TicketDictionary = {
  ...EN,
  modalTitle: 'Abrir Ticket de Soporte',
  modalSub: 'Te ayudaremos lo antes posible',
  emailLabel: 'Correo Electrónico *',
  categoryLabel: 'Categoría *',
  subjectLabel: 'Asunto *',
  descriptionLabel: 'Descripción del problema *',
  submitBtn: 'Enviar Ticket',
  catGeneral: 'Consulta General',
  catActivation: 'Activación de eSIM',
  catPayment: 'Pago y Cripto',
  catEsimIssue: 'Sin servicio / Datos',
  catRefund: 'Reembolso',
  tabTicketsTitle: 'Tickets de Soporte',
  newTicketBtn: 'Crear nuevo ticket',
  statusOpen: 'Abierto',
  statusAnswered: 'Respondido',
  statusClosed: 'Cerrado',
};

const IT: TicketDictionary = {
  ...EN,
  modalTitle: 'Apri un Ticket di Supporto',
  modalSub: 'Ti aiuteremo il prima possibile',
  emailLabel: 'Indirizzo Email *',
  categoryLabel: 'Categoria *',
  subjectLabel: 'Oggetto *',
  descriptionLabel: 'Descrizione del problema *',
  submitBtn: 'Invia Ticket',
  catGeneral: 'Domanda Generale',
  catActivation: 'Attivazione eSIM',
  catPayment: 'Pagamento & Crypto',
  catEsimIssue: 'Nessun Segnale / Dati',
  catRefund: 'Rimborso',
  tabTicketsTitle: 'Ticket di Supporto',
  newTicketBtn: 'Nuovo ticket',
  statusOpen: 'Aperto',
  statusAnswered: 'Risposto',
  statusClosed: 'Chiuso',
};

const NL: TicketDictionary = {
  ...EN,
  modalTitle: 'Supportticket openen',
  modalSub: 'We helpen je zo snel mogelijk',
  emailLabel: 'E-mailadres *',
  categoryLabel: 'Categorie *',
  subjectLabel: 'Onderwerp *',
  descriptionLabel: 'Beschrijving *',
  submitBtn: 'Ticket Versturen',
  catGeneral: 'Algemene vraag',
  catActivation: 'eSIM Activatie',
  catPayment: 'Betaling & Crypto',
  catEsimIssue: 'Geen bereik / Data probleem',
  catRefund: 'Terugbetaling',
  tabTicketsTitle: 'Supporttickets',
  newTicketBtn: 'Nieuw ticket',
  statusOpen: 'Open',
  statusAnswered: 'Beantwoord',
  statusClosed: 'Gesloten',
};

export const TICKET_DICTS: Record<TicketLocale, TicketDictionary> = {
  de: DE,
  en: EN,
  fr: FR,
  es: ES,
  it: IT,
  nl: NL,
  pl: { ...EN, modalTitle: 'Otwórz zgłoszenie', submitBtn: 'Wyślij zgłoszenie', tabTicketsTitle: 'Zgłoszenia' },
  pt: { ...EN, modalTitle: 'Abrir Ticket de Suporte', submitBtn: 'Enviar Ticket', tabTicketsTitle: 'Tickets de Suporte' },
  tr: { ...EN, modalTitle: 'Destek Talebi Oluştur', submitBtn: 'Talebi Gönder', tabTicketsTitle: 'Destek Talepleri' },
  sv: { ...EN, modalTitle: 'Öppna supportärende', submitBtn: 'Skicka ärende', tabTicketsTitle: 'Supportärenden' },
  da: { ...EN, modalTitle: 'Opret supportbillet', submitBtn: 'Send billet', tabTicketsTitle: 'Supportbilletter' },
  fi: { ...EN, modalTitle: 'Avaa tukipyyntö', submitBtn: 'Lähetä tukipyyntö', tabTicketsTitle: 'Tukipyynnöt' },
  cs: { ...EN, modalTitle: 'Otevřít tiket podpory', submitBtn: 'Odeslat tiket', tabTicketsTitle: 'Tikety podpory' },
  ro: { ...EN, modalTitle: 'Deschide bilet de suport', submitBtn: 'Trimite bilet', tabTicketsTitle: 'Bilete de Suport' },
  hu: { ...EN, modalTitle: 'Támogatási jegy nyitása', submitBtn: 'Jegy beküldése', tabTicketsTitle: 'Támogatási jegyek' },
};

export function getTicketTranslations(locale?: string | null): TicketDictionary {
  if (!locale) return DE;
  const clean = locale.toLowerCase().slice(0, 2) as TicketLocale;
  return TICKET_DICTS[clean] || DE;
}
