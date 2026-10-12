export interface ErrorTranslation {
  title: string;
  desc: string;
  retry: string;
  backHome: string;
}

export const ERROR_I18N: Record<string, ErrorTranslation> = {
  de: {
    title: 'Ein Fehler ist aufgetreten',
    desc: 'Ein unerwarteter Fehler ist aufgetreten. Bitte laden Sie die Seite neu oder kehren Sie zur Startseite zurück.',
    retry: 'Erneut versuchen',
    backHome: 'Zur Startseite',
  },
  en: {
    title: 'An unexpected error occurred',
    desc: 'An unexpected error occurred. Please try again or return to the shop.',
    retry: 'Try again',
    backHome: 'Return to shop',
  },
  fr: {
    title: 'Une erreur est survenue',
    desc: 'Une erreur inattendue est survenue. Veuillez actualiser la page ou revenir à l’accueil.',
    retry: 'Réessayer',
    backHome: 'Retour à l’accueil',
  },
  es: {
    title: 'Ha ocurrido un error',
    desc: 'Ha ocurrido un error inesperado. Por favor, inténtelo de nuevo o vuelva al inicio.',
    retry: 'Reintentar',
    backHome: 'Volver a la tienda',
  },
  it: {
    title: 'Si è verificato un errore',
    desc: 'Si è verificato un errore imprevisto. Riprova o torna alla pagina iniziale.',
    retry: 'Riprova',
    backHome: 'Torna allo shop',
  },
  nl: {
    title: 'Er is een fout opgetreden',
    desc: 'Er is een onverwachte fout opgetreden. Probeer het opnieuw of ga terug naar de startpagina.',
    retry: 'Opnieuw proberen',
    backHome: 'Terug naar winkel',
  },
  pl: {
    title: 'Wystąpił błąd',
    desc: 'Wystąpił nieoczekiwany błąd. Odśwież stronę lub wróć do strony głównej.',
    retry: 'Spróbuj ponownie',
    backHome: 'Wróć do sklepu',
  },
  pt: {
    title: 'Ocorreu um erro',
    desc: 'Ocorreu um erro inesperado. Tente novamente ou volte para a página inicial.',
    retry: 'Tentar novamente',
    backHome: 'Voltar à loja',
  },
  tr: {
    title: 'Bir hata oluştu',
    desc: 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin veya ana sayfaya dönün.',
    retry: 'Tekrar dene',
    backHome: 'Mağazaya dön',
  },
  sv: {
    title: 'Ett fel har inträffat',
    desc: 'Ett oväntat fel uppstod. Försök igen eller gå tillbaka till startsidan.',
    retry: 'Försök igen',
    backHome: 'Tillbaka till butiken',
  },
  da: {
    title: 'Der opstod en fejl',
    desc: 'Der opstod en uventet fejl. Prøv igen eller vend tilbage til forsiden.',
    retry: 'Prøv igen',
    backHome: 'Tilbage til butikken',
  },
  fi: {
    title: 'Tapahtui virhe',
    desc: 'Odottamaton virhe tapahtui. Yritä uudelleen tai palaa etusivulle.',
    retry: 'Yritä uudelleen',
    backHome: 'Takaisin kauppaan',
  },
  cs: {
    title: 'Došlo k chybě',
    desc: 'Došlo k neočekávané chybě. Zkuste to prosím znovu nebo se vraťte na domovskou stránku.',
    retry: 'Zkusit znovu',
    backHome: 'Zpět do obchodu',
  },
  ro: {
    title: 'A apărut o eroare',
    desc: 'A apărut o eroare neașteptată. Vă rugăm să reîncercați sau să reveniți la pagina principală.',
    retry: 'Încearcă din nou',
    backHome: 'Înapoi la magazin',
  },
  hu: {
    title: 'Hiba történt',
    desc: 'Váratlan hiba történt. Kérjük, próbálja újra, vagy térjen vissza a kezdőlapra.',
    retry: 'Próbálja újra',
    backHome: 'Vissza a bolthoz',
  },
};

export function detectErrorLocale(pathname?: string): string {
  let path = pathname;
  if (!path && typeof window !== 'undefined') {
    path = window.location.pathname;
  }
  const match = (path || '').match(/^\/(en|fr|es|it|nl|pl|pt|tr|sv|da|fi|cs|ro|hu)(?:\/|$)/);
  return match ? match[1] : 'de';
}
