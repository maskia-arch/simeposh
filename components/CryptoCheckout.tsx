'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCode from 'qrcode';
import { useTranslation } from '@/lib/i18n';
import { useHideChatBubble } from '@/lib/useHideChatBubble';
import { useCart } from '@/components/CartProvider';
import { OpenChatButton } from '@/components/OpenChatButton';

interface SessionState {
  id: string; coin: string; coinName: string; status: string;
  walletAddress: string; cryptoAmount: string; paymentUri: string;
  amountEur: number; baseEur: number; surchargePct: number; surchargeFixedEur: number;
  confirmations: number; confirmationsRequired: number; txHash: string | null;
  remainingMs: number; ref: string | null;
  paymentMemo: string | null;
  receivedAmount?: number;
  customerEmail?: string;
}

const STR: Record<string, Record<string, string>> = {
  title:        { en: 'Pay with', de: 'Bezahlen mit' },
  send_exact:   { en: 'Send EXACTLY this amount', de: 'Sende GENAU diesen Betrag' },
  to_address:   { en: 'to this address', de: 'an diese Adresse' },
  amount:       { en: 'Amount', de: 'Betrag' },
  address:      { en: 'Address', de: 'Adresse' },
  copy:         { en: 'Copy', de: 'Kopieren' },
  copied:       { en: 'Copied ✓', de: 'Kopiert ✓' },
  fee_hint:     { en: 'Incl. {pct}% network compensation fee', de: 'Inkl. {pct}% Netzwerk-Ausgleichsgebühr' },
  fee_fixed:    { en: 'Incl. {eur} € processing fee', de: 'Inkl. {eur} € Bearbeitungsgebühr' },
  expires_in:   { en: 'Expires in', de: 'Läuft ab in' },
  waiting:      { en: 'Waiting for payment…', de: 'Warte auf Zahlung…' },
  detected:     { en: 'Payment detected – confirming', de: 'Zahlung erkannt – Bestätigung' },
  paid:         { en: 'Payment successful!', de: 'Zahlung erfolgreich!' },
  paid_sub:     { en: 'Your eSIMs are being delivered…', de: 'Deine eSIMs werden ausgeliefert…' },
  expired:      { en: 'This payment window has expired.', de: 'Dieses Zahlungsfenster ist abgelaufen.' },
  expired_sub:  { en: 'Please start a new checkout.', de: 'Bitte starte einen neuen Checkout.' },
  exact_warn:   { en: 'Please send the exact amount to verify your payment.', de: 'Bitte sende den exakten Betrag, um deine Zahlung zu verifizieren.' },
  open_wallet:  { en: 'Open in wallet', de: 'In Wallet öffnen' },
  new_checkout: { en: 'New checkout', de: 'Neuer Checkout' },
  cancel_btn:   { en: 'Cancel Payment', de: 'Zahlung abbrechen' },
  confirm_cancel: { en: 'Are you sure you want to cancel this checkout? Your cart will be preserved.', de: 'Möchtest du diesen Checkout wirklich abbrechen? Dein Warenkorb bleibt erhalten.' },
  i_paid_btn:   { en: 'I have paid', de: 'Ich habe bezahlt' },
  checking_payment: { en: 'Checking payment…', de: 'Zahlung wird geprüft…' },
  no_payment_yet: { en: 'No transaction detected yet. Please ensure you sent the exact amount.', de: 'Noch keine Transaktion erkannt. Bitte stelle sicher, dass du den genauen Betrag gesendet hast.' },
  memo:         { en: 'Payment Comment / Memo', de: 'Zahlungskommentar / Verwendungszweck' },
  memo_warn:    {
    en: 'IMPORTANT: You MUST include the exact comment above in your transaction, or your payment cannot be detected!',
    de: 'WICHTIG: Sie MÜSSEN den obigen Kommentar exakt in Ihrer Transaktion angeben, da die Zahlung sonst nicht erkannt wird!'
  },
  exact_memo_warn: { en: 'A unique comment is required to match your payment.', de: 'Ein eindeutiger Kommentar ist erforderlich, um deine Zahlung zuzuordnen.' },
  fee_warning: {
    en: 'IMPORTANT: Make sure you send enough to cover any transaction or transfer fees. Network fees must be fully covered by the sender.',
    de: 'WICHTIG: Stelle sicher, dass du genug sendest, um eventuelle Netzwerk- oder Transfergebühren zu decken. Die Transaktionsgebühren müssen vollständig vom Sender getragen werden.'
  },
  underpayment: {
    en: 'Partial payment detected: We received {received} {coin}, but {expected} {coin} is required. Please send the remaining {remaining} {coin} to complete the order.',
    de: 'Teilzahlung erkannt: Wir haben {received} {coin} empfangen, es sind jedoch {expected} {coin} erforderlich. Bitte sende die verbleibenden {remaining} {coin}, um die Bestellung abzuschließen.'
  },
  confirming_status: { en: 'Confirming', de: 'Bestätigung läuft' },
  detected_title:    { en: '📥 Payment detected!', de: '📥 Zahlung erkannt!' },
  detected_desc:     {
    en: 'We successfully detected your transaction on the {coin} network. We are now waiting for the required confirmation on the blockchain.',
    de: 'Wir haben deine Transaktion im {coin}-Netzwerk erfolgreich erkannt. Wir warten nun auf die erforderliche Bestätigung auf der Blockchain.'
  },
  detected_hint:     {
    en: 'You can leave this page open or close it – your order will be processed automatically as soon as the confirmation is complete.',
    de: 'Du kannst diese Seite geöffnet lassen oder schließen – deine Bestellung wird automatisch verarbeitet, sobald die Bestätigung abgeschlossen ist.'
  },
  auto_update_in: { en: 'Automatic update in {seconds}s…', de: 'Automatische Aktualisierung in {seconds}s…' },
  refresh_btn:    { en: 'Refresh', de: 'Aktualisieren' },
  refreshing:     { en: 'Refreshing…', de: 'Wird aktualisiert…' },
  copy_address_aria: {
    en: 'Copy address', de: 'Adresse kopieren', fr: 'Copier l’adresse', es: 'Copiar dirección',
    it: 'Copia indirizzo', nl: 'Adres kopiëren', pl: 'Kopiuj adres', pt: 'Copiar endereço',
    tr: 'Adresi kopyala', sv: 'Kopiera adress', da: 'Kopier adresse', fi: 'Kopioi osoite',
    cs: 'Kopírovat adresu', ro: 'Copiază adresa', hu: 'Cím másolása'
  },
  copy_amount_aria: {
    en: 'Copy amount', de: 'Betrag kopieren', fr: 'Copier le montant', es: 'Copiar cantidad',
    it: 'Copia importo', nl: 'Bedrag kopiëren', pl: 'Kopiuj kwotę', pt: 'Copiar valor',
    tr: 'Tutarı kopyala', sv: 'Kopiera belopp', da: 'Kopier beløb', fi: 'Kopioi summa',
    cs: 'Kopírovat částku', ro: 'Copiază suma', hu: 'Összeg másolása'
  },
  copy_failed_address: {
    en: 'Unable to copy – address is selected, please press and hold to copy',
    de: 'Kopieren nicht möglich – Adresse ist markiert, bitte lange drücken und kopieren',
    fr: 'Copie impossible – l’adresse est sélectionnée, appuyez longuement pour copier',
    es: 'No se puede copiar: la dirección está seleccionada, mantenga presionado para copiar',
    it: 'Impossibile copiare: l’indirizzo è selezionato, tieni premuto per copiare',
    nl: 'Kopiëren mislukt – adres is geselecteerd, houd ingedrukt om te kopiëren',
    pl: 'Nie można skopiować – adres jest zaznaczony, przytrzymaj, aby skopiować',
    pt: 'Não foi possível copiar – endereço selecionado, pressione e segure para copiar',
    tr: 'Kopyalanamadı – adres seçildi, kopyalamak için lütfen basılı tutun',
    sv: 'Kunde inte kopiera – adressen är markerad, tryck länge för att kopiera',
    da: 'Kan ikke kopiere – adressen er markeret, hold nede for at kopiere',
    fi: 'Kopiointi epäonnistui – osoite on valittu, kopioi painamalla pitkään',
    cs: 'Kopírování selhalo – adresa je označena, dlouhým stiskem zkopírujte',
    ro: 'Copiere eșuată – adresa este selectată, țineți apăsat pentru a copia',
    hu: 'A másolás nem sikerült – a cím ki van jelölve, tartsa hosszan nyomva a másoláshoz'
  },
  copy_failed_amount: {
    en: 'Unable to copy – amount is selected, please press and hold to copy',
    de: 'Kopieren nicht möglich – Betrag ist markiert, bitte lange drücken und kopieren',
    fr: 'Copie impossible – le montant est sélectionné, appuyez longuement pour copier',
    es: 'No se puede copiar: el monto está seleccionado, mantenga presionado para copiar',
    it: 'Impossibile copiare: l’importo è selezionato, tieni premuto per copiare',
    nl: 'Kopiëren mislukt – bedrag is geselecteerd, houd ingedrukt om te kopiëren',
    pl: 'Nie można skopiować – kwota jest zaznaczona, przytrzymaj, aby skopiować',
    pt: 'Não foi possível copiar – valor selecionado, pressione e segure para copiar',
    tr: 'Kopyalanamadı – tutar seçildi, kopyalamak için lütfen basılı tutun',
    sv: 'Kunde inte kopiera – beloppet är markerat, tryck länge för att kopiera',
    da: 'Kan ikke kopiere – beløbet er markeret, hold nede for at kopiere',
    fi: 'Kopiointi epäonnistui – summa on valittu, kopioi painamalla pitkään',
    cs: 'Kopírování selhalo – částka je označena, dlouhým stiskem zkopírujte',
    ro: 'Copiere eșuată – suma este selectată, țineți apăsat pentru a copia',
    hu: 'A másolás nem sikerült – az összeg ki van jelölve, tartsa hosszan nyomva a másoláshoz'
  },
  cancel_failed: {
    en: 'Cancellation failed, please try again',
    de: 'Abbrechen hat nicht geklappt, bitte erneut versuchen',
    fr: 'L’annulation a échoué, veuillez réessayer',
    es: 'No se pudo cancelar, inténtelo de nuevo',
    it: 'Annullamento non riuscito, riprova',
    nl: 'Annuleren mislukt, probeer het opnieuw',
    pl: 'Anulowanie nie powiodło się, spróbuj ponownie',
    pt: 'O cancelamento falhou, tente novamente',
    tr: 'İptal işlemi başarısız oldu, lütfen tekrar deneyin',
    sv: 'Avbrytningen misslyckades, försök igen',
    da: 'Annullering mislykkedes, prøv igen',
    fi: 'Peruutus epäonnistui, yritä uudelleen',
    cs: 'Zrušení se nezdařilo, zkuste to znovu',
    ro: 'Anularea a eșuat, vă rugăm să încercați din nou',
    hu: 'A megszakítás nem sikerült, kérjük, próbálja újra'
  },
  cancelled_title: {
    en: 'Payment cancelled', de: 'Zahlung abgebrochen', fr: 'Paiement annulé', es: 'Pago cancelado',
    it: 'Pagamento annullato', nl: 'Betaling geannuleerd', pl: 'Płatność anulowana', pt: 'Pagamento cancelado',
    tr: 'Ödeme iptal edildi', sv: 'Betalning avbruten', da: 'Betaling annulleret', fi: 'Maksu peruutettu',
    cs: 'Platba byla zrušena', ro: 'Plată anulată', hu: 'Fizetés megszakítva'
  },
  cancelled_sub: {
    en: 'This checkout was cancelled.', de: 'Dieser Checkout wurde abgebrochen.',
    fr: 'Ce paiement a été annulé.', es: 'Este pago fue cancelado.', it: 'Questo pagamento è stato annullato.',
    nl: 'Deze betaling is geannuleerd.', pl: 'Ta płatność została anulowana.', pt: 'Este pagamento foi cancelado.',
    tr: 'Bu ödeme iptal edildi.', sv: 'Denna betalning har avbrutits.', da: 'Denne betaling blev annulleret.',
    fi: 'Tämä maksu on peruutettu.', cs: 'Tato platba byla zrušena.', ro: 'Această plată a fost anulată.',
    hu: 'Ez a fizetés meg lett szakítva.'
  },
  expired_title: {
    en: 'Payment expired', de: 'Zahlung abgelaufen', fr: 'Paiement expiré', es: 'Pago vencido',
    it: 'Pagamento scaduto', nl: 'Betaling verlopen', pl: 'Płatność wygasła', pt: 'Pagamento expirado',
    tr: 'Ödeme süresi doldu', sv: 'Betalningen har upphört', da: 'Betaling udløbet', fi: 'Maksuaika päättynyt',
    cs: 'Platba vypršela', ro: 'Plată expirată', hu: 'Fizetés lejárt'
  },
  back_to_cart: {
    en: 'Back to cart', de: 'Zurück zum Warenkorb', fr: 'Retour au panier', es: 'Volver al carrito',
    it: 'Torna al carrello', nl: 'Terug naar winkelmand', pl: 'Powrót do koszyka', pt: 'Voltar ao carrinho',
    tr: 'Sepete dön', sv: 'Tillbaka till varukorgen', da: 'Tilbage til kurv', fi: 'Takaisin ostoskoriin',
    cs: 'Zpět do košíku', ro: 'Înapoi la coș', hu: 'Vissza a kosárhoz'
  },
  review_title: {
    en: 'Payment received, being reviewed', de: 'Zahlung eingegangen, wird geprüft',
    fr: 'Paiement reçu, en cours de vérification', es: 'Pago recibido, en revisión',
    it: 'Pagamento ricevuto, in fase di verifica', nl: 'Betaling ontvangen, wordt gecontroleerd',
    pl: 'Płatność otrzymana, w trakcie weryfikacji', pt: 'Pagamento recebido, em análise',
    tr: 'Ödeme alındı, inceleniyor', sv: 'Betalning mottagen, granskas', da: 'Betaling modtaget, under kontrol',
    fi: 'Maksu vastaanotettu, tarkistetaan', cs: 'Platba přijata, ověřuje se', ro: 'Plată primită, în curs de verificare',
    hu: 'Fizetés beérkezett, ellenőrzés alatt'
  },
  review_desc: {
    en: 'We received your payment after expiry or cancellation. It is not fulfilled automatically and has been queued for manual review.',
    de: 'Deine Zahlung ist nach Ablauf oder Abbruch eingegangen. Sie wird nicht automatisch ausgeliefert und wurde zur manuellen Prüfung vorgemerkt.',
    fr: 'Votre paiement a été reçu après expiration ou annulation. Il n’est pas livré automatiquement et a été mis en attente pour vérification manuelle.',
    es: 'Recibimos su pago después del vencimiento o cancelación. No se procesa automáticamente y se ha puesto en espera para revisión manual.',
    it: 'Il pagamento è stato ricevuto dopo la scadenza o l’annullamento. Non verrà elaborato automaticamente ed è in attesa di revisione manuale.',
    nl: 'Uw betaling is ontvangen na afloop of annulering. Deze wordt niet automatisch geleverd en is in de wacht gezet voor handmatige controle.',
    pl: 'Płatność dotarła po upływie terminu lub anulowaniu. Nie zostanie zrealizowana automatycznie i trafiła do ręcznej weryfikacji.',
    pt: 'O seu pagamento foi recebido após a expiração ou cancelamento. Não será entregue automaticamente e foi encaminhado para análise manual.',
    tr: 'Ödemeniz süre dolduktan veya iptalden sonra ulaştı. Otomatik olarak teslim edilmez ve manuel inceleme için sıraya alındı.',
    sv: 'Din betalning mottogs efter utgång eller avbruten order. Den levereras inte automatiskt och har lagts för manuell granskning.',
    da: 'Din betaling blev modtaget efter udløb eller annullering. Den leveres ikke automatisk og afventer manuel gennemgang.',
    fi: 'Maksusi vastaanotettiin vanhenemisen tai peruutuksen jälkeen. Sitä ei toimiteta automaattisesti, vaan se on siirretty manuaaliseen tarkistukseen.',
    cs: 'Vaše platba dorazila po vypršení nebo zrušení. Nebude doručena automaticky a byla předána k manuální kontrole.',
    ro: 'Plata a fost primită după expirare sau anulare. Nu este livrată automat și a fost trimisă pentru verificare manuală.',
    hu: 'Fizetése a lejárati idő vagy a törlés után érkezett meg. Nem kerül automatikus kézbesítésre, kézi ellenőrzésre van jelölve.'
  },
  contact_support: {
    en: 'Contact Support: @autoacts', de: 'Support kontaktieren: @autoacts',
    fr: 'Contacter le support : @autoacts', es: 'Contactar soporte: @autoacts',
    it: 'Contatta il supporto: @autoacts', nl: 'Contact opnemen met support: @autoacts',
    pl: 'Skontaktuj się ze wsparciem: @autoacts', pt: 'Contactar apoio: @autoacts',
    tr: 'Desteğe ulaşın: @autoacts', sv: 'Kontakta support: @autoacts', da: 'Kontakt support: @autoacts',
    fi: 'Ota yhteyttä tukeen: @autoacts', cs: 'Kontaktovat podporu: @autoacts', ro: 'Contactează suportul: @autoacts',
    hu: 'Kapcsolatfelvétel a támogatással: @autoacts'
  }
};

interface CoinTheme {
  primary: string;
  bgLight: string;
  borderLight: string;
  textDark: string;
  badgeBg: string;
  logo: string;
}

const COIN_THEMES: Record<string, CoinTheme> = {
  BTC: {
    primary: '#F7931A',
    bgLight: 'bg-amber-50/35',
    borderLight: 'border-amber-200/60',
    textDark: 'text-amber-900',
    badgeBg: 'bg-amber-100 text-amber-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png',
  },
  LTC: {
    primary: '#345D9D',
    bgLight: 'bg-slate-50/50',
    borderLight: 'border-slate-200/60',
    textDark: 'text-slate-800',
    badgeBg: 'bg-slate-100 text-slate-800',
    logo: 'https://coin-images.coingecko.com/coins/images/2/large/litecoin.png',
  },
  ETH: {
    primary: '#627EEA',
    bgLight: 'bg-indigo-50/35',
    borderLight: 'border-indigo-200/60',
    textDark: 'text-indigo-900',
    badgeBg: 'bg-indigo-100 text-indigo-800',
    logo: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png',
  },
  SOL: {
    primary: '#14F195',
    bgLight: 'bg-teal-50/35',
    borderLight: 'border-teal-200/60',
    textDark: 'text-teal-900',
    badgeBg: 'bg-teal-100 text-teal-800',
    logo: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png',
  },
  USDT: {
    primary: '#26A17B',
    bgLight: 'bg-emerald-50/35',
    borderLight: 'border-emerald-200/60',
    textDark: 'text-emerald-900',
    badgeBg: 'bg-emerald-100 text-emerald-800',
    logo: 'https://coin-images.coingecko.com/coins/images/325/large/Tether.png',
  },
  USDC: {
    primary: '#2775CA',
    bgLight: 'bg-sky-50/35',
    borderLight: 'border-sky-200/60',
    textDark: 'text-sky-900',
    badgeBg: 'bg-sky-100 text-sky-800',
    logo: 'https://coin-images.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
  },
  TON: {
    primary: '#0088CC',
    bgLight: 'bg-cyan-50/35',
    borderLight: 'border-cyan-200/60',
    textDark: 'text-cyan-955',
    badgeBg: 'bg-cyan-100 text-cyan-800',
    logo: 'https://coin-images.coingecko.com/coins/images/17980/large/ton_symbol.png',
  },
  TRX: {
    primary: '#FF000F',
    bgLight: 'bg-rose-50/35',
    borderLight: 'border-rose-200/60',
    textDark: 'text-rose-900',
    badgeBg: 'bg-rose-100 text-rose-800',
    logo: 'https://coin-images.coingecko.com/coins/images/1094/large/tron-logo.png',
  },
};

const DEFAULT_THEME: CoinTheme = {
  primary: '#4F46E5',
  bgLight: 'bg-slate-50/50',
  borderLight: 'border-slate-200/50',
  textDark: 'text-slate-800',
  badgeBg: 'bg-slate-100 text-slate-800',
  logo: '',
};

function fmtTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
}

function fallbackCopyText(value: string): boolean {
  if (typeof document === 'undefined') return false;
  let ok = false;
  const textArea = document.createElement('textarea');
  textArea.value = value;
  textArea.setAttribute('readonly', '');
  textArea.contentEditable = 'true'; // critical for iOS Safari
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';
  textArea.style.pointerEvents = 'none';
  textArea.style.fontSize = '16px'; // Prevent auto-zoom on iOS

  document.body.appendChild(textArea);
  try {
    textArea.focus();
    textArea.setSelectionRange(0, value.length);
    textArea.select();
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  } finally {
    if (textArea.parentNode) {
      document.body.removeChild(textArea);
    }
  }
  return ok;
}

function Copyable({
  value,
  label,
  type,
  copyAriaLabel,
  s,
  theme,
  onCopyFailed,
}: {
  value: string;
  label: string;
  type: 'address' | 'amount' | 'memo';
  copyAriaLabel: string;
  s: (k: string) => string;
  theme: CoinTheme;
  onCopyFailed?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const textRef = useRef<HTMLParagraphElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const selectEntireText = () => {
    if (textRef.current && typeof window !== 'undefined') {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(textRef.current);
        sel.addRange(range);
      }
    }
  };

  const handleCopy = async () => {
    setErrorMsg('');

    // Start navigator.clipboard.writeText immediately & synchronously in the click handler
    let clipboardPromise: Promise<void> | null = null;
    if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      try {
        clipboardPromise = navigator.clipboard.writeText(value);
      } catch {
        clipboardPromise = null;
      }
    }

    let success = false;
    if (clipboardPromise) {
      try {
        await clipboardPromise;
        success = true;
      } catch {
        success = false;
      }
    }

    // If clipboard API failed or was rejected, immediately use iOS-compatible fallback
    if (!success) {
      success = fallbackCopyText(value);
    }

    if (success) {
      setCopied(true);
      setErrorMsg('');
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2500); // at least 2s
    } else {
      setCopied(false);
      selectEntireText();
      const msg = type === 'address'
        ? s('copy_failed_address')
        : type === 'amount'
          ? s('copy_failed_amount')
          : s('copy_failed_address');
      setErrorMsg(msg);
      if (onCopyFailed) onCopyFailed();
    }
  };

  return (
    <div className={`rounded-xl border p-3.5 ${theme.bgLight} ${theme.borderLight} transition-all`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-700">{label}</p>
          <p
            ref={textRef}
            onClick={selectEntireText}
            className="font-mono text-xs sm:text-sm text-slate-800 break-all select-all cursor-pointer leading-relaxed tracking-tight py-1"
            title="Tippen zum Markieren"
          >
            {value}
          </p>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? s('copied') : copyAriaLabel}
          className="shrink-0 min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 active:bg-slate-100 flex items-center justify-center transition-colors shadow-2xs self-center"
        >
          <span aria-live="polite">{copied ? s('copied') : s('copy')}</span>
        </button>
      </div>
      {errorMsg && (
        <div role="status" className="mt-2 text-xs font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
          {errorMsg}
        </div>
      )}
    </div>
  );
}

export function CryptoCheckout({
  sessionId,
  initialTariff = '',
  initialAmount = '',
}: {
  sessionId: string;
  initialTariff?: string;
  initialAmount?: string;
}) {
  useHideChatBubble(true);
  const { locale } = useTranslation();
  const { items, total } = useCart();
  const s = (k: keyof typeof STR) => (STR[k][locale] ?? STR[k].en);

  const [cachedTariff, setCachedTariff] = useState(() => {
    if (initialTariff) return initialTariff;
    if (typeof window === 'undefined') return '';
    try {
      const t = localStorage.getItem('esim_checkout_tariff');
      if (t) return t;
      const rawCart = localStorage.getItem('esim_cart_v1');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((i: any) => i.name).filter(Boolean).join(', ');
        }
      }
    } catch {}
    return '';
  });

  const [cachedAmount, setCachedAmount] = useState(() => {
    if (initialAmount) return initialAmount;
    if (typeof window === 'undefined') return '';
    try {
      const a = localStorage.getItem('esim_checkout_amount');
      if (a) return a;
      const rawCart = localStorage.getItem('esim_cart_v1');
      if (rawCart) {
        const parsed = JSON.parse(rawCart);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const tot = parsed.reduce((sum: number, i: any) => sum + (Number(i.priceEur) || 0) * (Number(i.quantity) || 1), 0);
          if (tot > 0) return `${tot.toFixed(2)} €`;
        }
      }
    } catch {}
    return '';
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const t = localStorage.getItem('esim_checkout_tariff');
        const a = localStorage.getItem('esim_checkout_amount');
        if (t) setCachedTariff(t);
        if (a) setCachedAmount(a);
      } catch {}
    }
  }, []);

  const displayTariff = (items.length > 0 ? items.map((i) => i.name).join(', ') : '') || cachedTariff;
  const rawDisplayAmount = cachedAmount || (total > 0 ? `${total.toFixed(2)} €` : '');
  const displayAmount = rawDisplayAmount
    ? (locale === 'de' ? rawDisplayAmount.replace('.', ',') : rawDisplayAmount.replace(',', '.'))
    : '';

  const [sess, setSess]   = useState<SessionState | null>(null);
  const [qr, setQr]       = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [highlightWallet, setHighlightWallet] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const [verifying, setVerifying]   = useState(false);
  const [verifyMsg, setVerifyMsg]   = useState('');
  const [verifyMsgType, setVerifyMsgType] = useState<'success' | 'error' | ''>('');

  const [countdown, setCountdown] = useState(5);
  const [refreshing, setRefreshing] = useState(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json() as SessionState;
      setSess(data);
      setRemaining(data.remainingMs);
      if (data.status === 'paid') {
        if (pollRef.current) clearInterval(pollRef.current);
        setTimeout(() => { window.location.href = data.ref ? `/order?ref=${data.ref}` : '/dashboard'; }, 1500);
      }
      if (data.status === 'expired' || data.status === 'cancelled' || data.status === 'review') {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    } catch { /* keep polling */ }
  }, [sessionId]);

  const handleCancel = async () => {
    if (!confirm(s('confirm_cancel'))) return;
    setCancelError('');
    setCancelling(true);
    try {
      if (pollRef.current) clearInterval(pollRef.current);
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'DELETE' });
      if (res.ok) {
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.setItem('esim_checkout_cancelled', '1');
          } catch {}
        }
        window.location.href = '/cart?cancelled=1';
      } else {
        setCancelError(s('cancel_failed'));
        setCancelling(false);
      }
    } catch {
      setCancelError(s('cancel_failed'));
      setCancelling(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyMsg('');
    setVerifyMsgType('');
    try {
      const res = await fetch(`/api/crypto/session/${sessionId}`, { method: 'POST' });
      const data = await res.json() as SessionState;
      if (res.ok && data) {
        setSess(data);
        if (data.status === 'paid') {
          setVerifyMsgType('success');
          if (pollRef.current) clearInterval(pollRef.current);
          window.location.href = data.ref ? `/order?ref=${data.ref}` : '/dashboard';
        } else if (data.status === 'detected') {
          setVerifyMsgType('success');
        } else if (data.status === 'review' || data.status === 'cancelled' || data.status === 'expired') {
          if (pollRef.current) clearInterval(pollRef.current);
        } else {
          setVerifyMsgType('error');
          setVerifyMsg(s('no_payment_yet'));
        }
      } else {
        setVerifyMsgType('error');
        setVerifyMsg(s('no_payment_yet'));
      }
    } catch {
      setVerifyMsgType('error');
      setVerifyMsg(s('no_payment_yet'));
    } finally {
      setVerifying(false);
    }
  };

  const handleManualRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await poll();
    setCountdown(5);
    setRefreshing(false);
  };

  const status = sess ? (remaining <= 0 && sess.status === 'pending' ? 'expired' : sess.status) : 'pending';

  useEffect(() => {
    poll();
    if (status === 'detected') {
      const timer = setInterval(() => {
        setCountdown((c) => {
          if (c <= 1) {
            poll();
            return 5;
          }
          return c - 1;
        });
      }, 1000);
      pollRef.current = timer;
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    } else {
      const timer = setInterval(poll, 5000);
      pollRef.current = timer;
      return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }
  }, [poll, status]);

  // Local 1s countdown tick
  useEffect(() => {
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  // QR from the payment URI
  useEffect(() => {
    if (!sess?.paymentUri) return;
    QRCode.toDataURL(sess.paymentUri, { width: 512, margin: 2 }).then(setQr).catch(() => setQr(null));
  }, [sess?.paymentUri]);

  if (!sess) {
    return (
      <div className="mx-auto max-w-md px-4 py-10" data-testid="checkout-skeleton">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 animate-pulse">
          {/* Header with PureSim brand */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="PureSim Logo" className="h-7 w-7 object-contain" />
              <span className="text-xl font-bold tracking-tight text-[#1d4ed8]">
                PureSim
              </span>
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>

          {/* Cart Tariff & Amount Box: rendered unconditionally so elements exist in DOM from Frame 0 */}
          <div
            id="skeleton-cart-box"
            data-testid="skeleton-cart-box"
            className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">
                {locale === 'de' ? 'Tarif' : 'Plan'}
              </span>
              <span
                className="text-xs font-bold text-slate-800 text-right truncate max-w-[200px]"
                data-testid="skeleton-tariff-name"
                id="skeleton-tariff-text"
              >
                {displayTariff}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2">
              <span className="text-xs font-semibold text-slate-500">
                {locale === 'de' ? 'Betrag' : 'Amount'}
              </span>
              <span
                className="text-sm font-extrabold text-slate-900 tabular-nums"
                data-testid="skeleton-amount"
                id="skeleton-amount-text"
              >
                {displayAmount}
              </span>
            </div>
          </div>

          {/* Synchronous pre-paint helper script to populate skeleton from localStorage before first paint */}
          <script
            dangerouslySetInnerHTML={{
              __html: `(function(){try{var t=localStorage.getItem('esim_checkout_tariff');var a=localStorage.getItem('esim_checkout_amount');if(!t||!a){var c=localStorage.getItem('esim_cart_v1');if(c){var items=JSON.parse(c);if(Array.isArray(items)&&items.length){if(!t)t=items.map(function(i){return i.name;}).filter(Boolean).join(', ');if(!a){var tot=items.reduce(function(s,i){return s+(Number(i.priceEur)||0)*(Number(i.quantity)||1);},0);if(tot>0)a=tot.toFixed(2)+' €';}}}}var tEl=document.getElementById('skeleton-tariff-text');var aEl=document.getElementById('skeleton-amount-text');if(t&&tEl&&(!tEl.textContent||tEl.textContent.trim()===''))tEl.textContent=t;if(a&&aEl&&(!aEl.textContent||aEl.textContent.trim()===''))aEl.textContent=a;}catch(_){}})();`,
            }}
          />

          {/* Skeleton placeholders */}
          <div className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-3 py-4">
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <svg className="h-8 w-8 animate-spin text-slate-300" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <div className="h-4 w-32 rounded-md bg-slate-100" />
            </div>

            <div className="space-y-2.5">
              <div className="h-11 w-full rounded-xl bg-slate-100" />
              <div className="h-11 w-full rounded-xl bg-slate-100" />
            </div>

            <div className="space-y-2 pt-2">
              <div className="h-12 w-full rounded-xl bg-slate-100" />
              <div className="h-10 w-full rounded-xl bg-slate-100" />
            </div>

            <div className="pt-2 flex justify-center">
              <OpenChatButton />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Terminal states ──
  if (status === 'paid') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">✅</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('paid')}</h1>
        <p className="text-slate-500">{s('paid_sub')}</p>
      </div>
    );
  }
  if (status === 'cancelled') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">🚫</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('cancelled_title')}</h1>
        <p className="mb-6 text-slate-500">{s('cancelled_sub')}</p>
        <a
          href="/cart"
          className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
        >
          {s('back_to_cart')}
        </a>
      </div>
    );
  }
  if (status === 'expired' || status === 'failed') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">⌛</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('expired_title')}</h1>
        <p className="mb-6 text-slate-500">{s('expired_sub')}</p>
        <a
          href="/cart"
          className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
        >
          {s('back_to_cart')}
        </a>
      </div>
    );
  }
  if (status === 'review') {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="mb-4 text-6xl">🔍</p>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">{s('review_title')}</h1>
        <p className="mb-4 text-slate-600">{s('review_desc')}</p>
        {sess?.receivedAmount ? (
          <p className="mb-6 text-xs font-mono text-slate-500">
            {sess.receivedAmount} {sess.coin}
          </p>
        ) : null}
        <div className="mb-6">
          <a
            href="https://t.me/autoacts"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-50 text-blue-700 font-semibold text-sm border border-blue-200 hover:bg-blue-100 transition-colors"
          >
            <span>💬</span> {s('contact_support')}
          </a>
        </div>
        <div>
          <a
            href="/cart"
            className="inline-flex items-center justify-center h-12 min-h-[48px] px-6 rounded-xl font-semibold text-white bg-[#2563eb] hover:bg-blue-700 transition-colors shadow-xs"
          >
            {s('back_to_cart')}
          </a>
        </div>
      </div>
    );
  }

  const theme = COIN_THEMES[sess.coin] || DEFAULT_THEME;

  const expectedNum = Number(sess.cryptoAmount);
  const receivedNum = sess.receivedAmount || 0;
  const decimalLimit = sess.coin === 'TON' ? 9 : (['SOL', 'USDT', 'USDC', 'TRX'].includes(sess.coin) ? 6 : 8);
  const remainingNum = Math.max(0, Number((expectedNum - receivedNum).toFixed(decimalLimit)));
  const receivedStr = receivedNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');
  const remainingStr = remainingNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '');

  const feeNote = sess.surchargePct > 0
    ? s('fee_hint').replace('{pct}', String(sess.surchargePct))
    : sess.surchargeFixedEur > 0
      ? s('fee_fixed').replace('{eur}', sess.surchargeFixedEur.toFixed(2))
      : null;

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className={`rounded-3xl border bg-white p-6 shadow-sm border-slate-200`}>
        {/* Header + countdown */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {theme.logo && (
              <img src={theme.logo} alt={sess.coin} className="h-6 w-6 object-contain" />
            )}
            <h1 className="text-base font-bold text-slate-900">{s('title')} {sess.coinName}</h1>
          </div>
          {status === 'detected' ? (
            <span className="rounded-full bg-blue-100 text-blue-700 px-3 py-1 text-xs font-bold animate-pulse">
              ⏳ {s('confirming_status')}
            </span>
          ) : status === 'partially_paid' ? (
            <span className="rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold animate-pulse">
              ⚠️ Teilzahlung erkannt
            </span>
          ) : (
            <span className={`rounded-full px-3 py-1 text-xs font-bold tabular-nums ${remaining < 120_000 ? 'bg-red-100 text-red-700 animate-pulse' : theme.badgeBg}`}>
              ⏱ {fmtTime(remaining)}
            </span>
          )}
        </div>

        {(sess.coin === 'USDC' || sess.coin === 'USDT') && status !== 'detected' && (
          <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-xs text-blue-900 leading-relaxed flex items-start gap-2">
            <span className="text-sm shrink-0">🌐</span>
            <div>
              <p className="font-extrabold text-[11px] text-blue-950">NETZWERKHINWEIS:</p>
              <p className="text-[10px] text-blue-800">
                Sende <strong>{sess.coin}</strong> ausschließlich über das <strong>Ethereum-Netzwerk (ERC-20)</strong>. Zahlungen über andere Netzwerke gehen verloren.
              </p>
            </div>
          </div>
        )}

        {feeNote && status !== 'detected' && (
          <p className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-medium text-amber-800">
            ⚠ {feeNote}
          </p>
        )}

        {/* QR */}
        {status !== 'detected' && (
          <div className="mb-4 flex flex-col items-center">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Payment QR" width={200} height={200} className="rounded-xl border border-slate-200" />
            ) : (
              <div className="flex h-[200px] w-[200px] items-center justify-center rounded-xl border border-dashed border-slate-200 text-slate-300">QR</div>
            )}
            <a
              href={sess.paymentUri}
              className={`mt-3 w-full max-w-[260px] min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs ${
                highlightWallet
                  ? 'h-12 min-h-[48px] bg-[#2563eb] text-white ring-2 ring-blue-400 ring-offset-2 scale-105'
                  : 'border border-slate-200 bg-white text-slate-800 hover:bg-slate-50'
              }`}
              style={!highlightWallet && theme.primary ? { color: theme.primary, borderColor: theme.borderLight } : undefined}
            >
              <span>👛</span>
              <span>{s('open_wallet')}</span>
              <span>→</span>
            </a>
          </div>
        )}

        {status !== 'detected' && (
          <>
            <p className="mb-3 text-center text-sm text-slate-600">
              <strong>{s('send_exact')}</strong> {s('to_address')}:
            </p>

            {/* Amount + address + optional memo */}
            <div className="space-y-2">
              <Copyable
                label={`${s('amount')} (${sess.coin})`}
                value={sess.cryptoAmount}
                type="amount"
                copyAriaLabel={s('copy_amount_aria')}
                s={s}
                theme={theme}
                onCopyFailed={() => setHighlightWallet(true)}
              />
              <Copyable
                label={s('address')}
                value={sess.walletAddress}
                type="address"
                copyAriaLabel={s('copy_address_aria')}
                s={s}
                theme={theme}
                onCopyFailed={() => setHighlightWallet(true)}
              />
              {sess.paymentMemo && (
                <Copyable
                  label={s('memo')}
                  value={sess.paymentMemo}
                  type="memo"
                  copyAriaLabel={s('copy')}
                  s={s}
                  theme={theme}
                />
              )}
            </div>

            {sess.paymentMemo && (
              <div className="mt-3 space-y-2">
                <div className="rounded-xl bg-red-50/50 border border-red-200 px-3.5 py-2.5 text-xs font-bold text-red-700 leading-relaxed animate-pulse">
                  ⚠ {s('memo_warn')}
                </div>
                <div className="rounded-xl bg-amber-50/50 border border-amber-200 px-3.5 py-2.5 text-xs font-semibold text-amber-800 leading-relaxed">
                  ⚠ {s('fee_warning')}
                </div>
              </div>
            )}

            <p className="mt-3 text-center text-[11px] text-slate-400">
              ≈ {sess.amountEur.toFixed(2)} € · {sess.paymentMemo ? s('exact_memo_warn') : s('exact_warn')}
            </p>
          </>
        )}

        {status === 'detected' && (() => {
          const pctCovered = expectedNum > 0 ? Math.min(100, Math.round((receivedNum / expectedNum) * 100)) : 0;
          return (
            <div className="mb-6 rounded-2xl bg-blue-50/60 border border-blue-100 p-5 text-xs text-blue-800 leading-relaxed shadow-sm">
              <p className="font-bold mb-2 text-sm">{s('detected_title')}</p>
              <p className="mb-4">{s('detected_desc').replace('{coin}', sess.coinName)}</p>
              
              {/* Payment coverage progress indicator */}
              <div className="mb-4 rounded-xl bg-white border border-blue-100 p-3 shadow-inner">
                <div className="flex justify-between items-center mb-1.5 font-semibold text-[10px] uppercase tracking-wider text-slate-500">
                  <span>Zahlungshöhe abgedeckt / Coverage</span>
                  <span className="text-blue-600 text-xs font-bold">{pctCovered}%</span>
                </div>
                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pctCovered}%` }}
                  />
                </div>
                <div className="flex justify-between items-center mt-1.5 text-[11px] text-slate-500 font-mono">
                  <span>{receivedNum.toFixed(decimalLimit).replace(/0+$/, '').replace(/\.$/, '') || '0'} {sess.coin}</span>
                  <span>/ {sess.cryptoAmount} {sess.coin}</span>
                </div>
              </div>
              
              <p className="text-slate-500">{s('detected_hint')}</p>
            </div>
          );
        })()}

        {/* Live status */}
        <div className={`mt-5 rounded-xl border px-4 py-3 text-center ${theme.bgLight} ${theme.borderLight}`}>
          {status === 'detected' ? (
            <p className={`flex items-center justify-center gap-2 text-sm font-bold ${theme.textDark}`}>
              <Spinner color={theme.primary} /> {s('detected')} ({sess.confirmations}/{sess.confirmationsRequired})
            </p>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm font-semibold text-slate-600">
              <Spinner color={theme.primary} /> {s('waiting')}
            </p>
          )}
        </div>

        {status === 'detected' && (
          <div className="mt-4 flex flex-col items-center gap-3">
            <p className="text-xs text-slate-400 font-medium">
              {s('auto_update_in').replace('{seconds}', String(countdown))}
            </p>
            <button
              onClick={handleManualRefresh}
              disabled={refreshing}
              className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 active:scale-[0.98] disabled:opacity-60 transition-all shadow-sm"
            >
              {refreshing ? (
                <>
                  <Spinner color="#64748B" />
                  {s('refreshing')}
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5 text-slate-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                  </svg>
                  {s('refresh_btn')}
                </>
              )}
            </button>
          </div>
        )}

        {receivedNum > 0 && remainingNum > 0 && status !== 'paid' && status !== 'detected' && (
          <div className="mt-4 rounded-2xl bg-amber-50/80 border border-amber-200 p-4 text-xs font-medium text-amber-900 leading-relaxed shadow-sm space-y-2.5">
            <div className="flex items-center gap-2 text-amber-800 font-bold text-sm">
              <span>⚠️</span>
              <span>Teilzahlung / Unterzahlung erkannt</span>
            </div>
            <p>
              {s('underpayment')
                .replace('{received}', receivedStr)
                .replace('{expected}', sess.cryptoAmount)
                .replace('{remaining}', remainingStr)
                .replaceAll('{coin}', sess.coin)}
            </p>
            <div className="rounded-xl bg-white border border-amber-200 p-3 shadow-inner space-y-1 text-[11px]">
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Erhaltener Betrag:</span>
                <span className="font-mono text-blue-700">{receivedStr} {sess.coin}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-semibold">
                <span>Verbleibender Betrag:</span>
                <span className="font-mono text-red-600 font-bold">{remainingStr} {sess.coin}</span>
              </div>
            </div>
            <p className="text-[11px] text-amber-700">
              💡 Bitte sende den verbleibenden Betrag (<strong>{remainingStr} {sess.coin}</strong>) an die oben angezeigte Adresse oder klicke unten auf Support-Ticket.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 space-y-2">
          {status !== 'detected' && (
            <button
              onClick={handleVerify}
              disabled={verifying || cancelling}
              className="flex w-full h-12 min-h-[48px] items-center justify-center gap-2 rounded-xl bg-[#2563eb] py-3 text-sm font-bold text-white hover:bg-blue-700 active:scale-[0.99] disabled:opacity-60 transition-all shadow-md cursor-pointer"
            >
              {verifying ? (
                <>
                  <Spinner color="#ffffff" />
                  {s('checking_payment')}
                </>
              ) : (
                s('i_paid_btn')
              )}
            </button>
          )}

          <button
            onClick={handleCancel}
            disabled={cancelling}
            style={{ position: 'relative', zIndex: 100001 }}
            className="w-full min-h-[44px] rounded-xl border-2 border-slate-300 bg-white py-2.5 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 hover:border-slate-400 active:bg-slate-100 disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer shadow-xs"
          >
            {cancelling ? '...' : s('cancel_btn')}
          </button>

          {cancelError && (
            <div role="status" className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700 text-center">
              {cancelError}
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              try {
                window.dispatchEvent(new CustomEvent('open-ticket-modal', {
                  detail: {
                    invoiceId: sess?.id || sessionId,
                    subject: `Frage / Problem zu Krypto-Zahlung (${sess?.id || sessionId})`,
                    category: 'payment',
                    initialEmail: sess?.customerEmail || '',
                  }
                }));
              } catch (err) {
                console.error('Open ticket error:', err);
              }
            }}
            className="w-full rounded-xl border border-blue-100 bg-blue-50/50 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-2"
          >
            <span>🎫</span> Zahlungsproblem? Support-Ticket öffnen
          </button>

          {/* Support Chat Link */}
          <div className="pt-2 flex justify-center">
            <OpenChatButton />
          </div>
        </div>

        {/* Verification Messages */}
        {verifyMsg && (
          <div className={`mt-4 rounded-xl px-4 py-3 text-xs font-medium ${verifyMsgType === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'}`}>
            {verifyMsg}
          </div>
        )}
      </div>
    </div>
  );
}

function Spinner({ color, className = 'h-4 w-4 shrink-0' }: { color?: string; className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} style={{ color: color || '#4F46E5' }} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
