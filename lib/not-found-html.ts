export interface NotFoundText {
  title: string;
  desc: string;
  btn: string;
  searchPlaceholder: string;
  popularTitle: string;
  linkEsim: string;
  linkTariffs: string;
  linkFaq: string;
  linkHome: string;
}

export const NOT_FOUND_TEXTS: Record<string, NotFoundText> = {
  de: {
    title: 'Seite nicht gefunden',
    desc: 'Die gewünschte Seite ist unter dieser Adresse leider nicht erreichbar.',
    btn: 'Zum PureSim Webshop',
    searchPlaceholder: 'Reiseziel suchen...',
    popularTitle: 'Beliebte Reiseziele',
    linkEsim: 'eSIM Länderübersicht',
    linkTariffs: 'Alle Tarife vergleichen',
    linkFaq: 'Häufige Fragen (FAQ)',
    linkHome: 'Startseite',
  },
  en: {
    title: 'Page Not Found',
    desc: 'The requested page is not available at this address.',
    btn: 'Back to PureSim Webshop',
    searchPlaceholder: 'Search destination...',
    popularTitle: 'Popular Destinations',
    linkEsim: 'eSIM Destinations Overview',
    linkTariffs: 'Compare All Tariffs',
    linkFaq: 'Frequently Asked Questions (FAQ)',
    linkHome: 'Homepage',
  },
  fr: {
    title: 'Page non trouvée',
    desc: "La page demandée n'est pas disponible à cette adresse.",
    btn: 'Retour à la boutique PureSim',
    searchPlaceholder: 'Rechercher une destination...',
    popularTitle: 'Destinations populaires',
    linkEsim: 'Aperçu des destinations eSIM',
    linkTariffs: 'Comparer tous les forfaits',
    linkFaq: 'Foire aux questions (FAQ)',
    linkHome: "Page d'accueil",
  },
  es: {
    title: 'Página no encontrada',
    desc: 'La página solicitada no está disponible en esta dirección.',
    btn: 'Volver a la tienda PureSim',
    searchPlaceholder: 'Buscar destino...',
    popularTitle: 'Destinos populares',
    linkEsim: 'Resumen de destinos eSIM',
    linkTariffs: 'Comparar todas las tarifas',
    linkFaq: 'Preguntas frecuentes (FAQ)',
    linkHome: 'Página principal',
  },
  it: {
    title: 'Pagina non trovata',
    desc: 'La pagina richiesta non è disponibile a questo indirizzo.',
    btn: 'Torna allo shop PureSim',
    searchPlaceholder: 'Cerca destinazione...',
    popularTitle: 'Destinazioni popolari',
    linkEsim: 'Panoramica destinazioni eSIM',
    linkTariffs: 'Confronta tutte le tariffe',
    linkFaq: 'Domande frequenti (FAQ)',
    linkHome: 'Home page',
  },
  nl: {
    title: 'Pagina niet gevonden',
    desc: 'De opgevraagde pagina is niet beschikbaar op dit adres.',
    btn: 'Naar de PureSim-webshop',
    searchPlaceholder: 'Bestemming zoeken...',
    popularTitle: 'Populaire bestemmingen',
    linkEsim: 'Overzicht eSIM-bestemmingen',
    linkTariffs: 'Alle tarieven vergelijken',
    linkFaq: 'Veelgestelde vragen (FAQ)',
    linkHome: 'Startpagina',
  },
  pl: {
    title: 'Strona nie znaleziona',
    desc: 'Żądana strona nie jest dostępna pod tym adresem.',
    btn: 'Wróć do sklepu PureSim',
    searchPlaceholder: 'Szukaj kierunku...',
    popularTitle: 'Popularne kierunki',
    linkEsim: 'Przegląd kierunków eSIM',
    linkTariffs: 'Porównaj wszystkie taryfy',
    linkFaq: 'Często zadawane pytania (FAQ)',
    linkHome: 'Strona główna',
  },
  pt: {
    title: 'Página não encontrada',
    desc: 'A página solicitada não está disponível neste endereço.',
    btn: 'Ir para a loja PureSim',
    searchPlaceholder: 'Pesquisar destino...',
    popularTitle: 'Destinos populares',
    linkEsim: 'Visão geral de destinos eSIM',
    linkTariffs: 'Comparar todas as tarifas',
    linkFaq: 'Perguntas frequentes (FAQ)',
    linkHome: 'Página inicial',
  },
  tr: {
    title: 'Sayfa Bulunamadı',
    desc: 'İstenen sayfa bu adreste mevcut değil.',
    btn: 'PureSim Web Mağazasına Dön',
    searchPlaceholder: 'Hedef ara...',
    popularTitle: 'Popüler Rotalar',
    linkEsim: 'eSIM Rotaları Genel Bakış',
    linkTariffs: 'Tüm Tarifeleri Karşılaştır',
    linkFaq: 'Sıkça Sorulan Sorular (SSS)',
    linkHome: 'Ana Sayfa',
  },
  sv: {
    title: 'Sidan hittades inte',
    desc: 'Den begärda sidan är tyvärr inte tillgänglig på denna adress.',
    btn: 'Till PureSim-butiken',
    searchPlaceholder: 'Sök destination...',
    popularTitle: 'Populära destinationer',
    linkEsim: 'Översikt över eSIM-destinationer',
    linkTariffs: 'Jämför alla abonnemang',
    linkFaq: 'Vanliga frågor (FAQ)',
    linkHome: 'Startsida',
  },
  da: {
    title: 'Siden blev ikke fundet',
    desc: 'Den ønskede side er desværre ikke tilgængelig på denne adresse.',
    btn: 'Til PureSim-webshoppen',
    searchPlaceholder: 'Søg destination...',
    popularTitle: 'Populære destinationer',
    linkEsim: 'Oversigt over eSIM-destinationer',
    linkTariffs: 'Sammenlign alle takster',
    linkFaq: 'Ofte stillede spørgsmål (FAQ)',
    linkHome: 'Forside',
  },
  fi: {
    title: 'Sivua ei löytynyt',
    desc: 'Pyydettyä sivua ei valitettavasti löydy tästä osoitteesta.',
    btn: 'PureSim-kauppaan',
    searchPlaceholder: 'Hae kohdetta...',
    popularTitle: 'Suositut kohteet',
    linkEsim: 'eSIM-kohteiden yleiskatsaus',
    linkTariffs: 'Vertaile kaikkia liittymiä',
    linkFaq: 'Usein kysytyt kysymykset (UKK)',
    linkHome: 'Etusivu',
  },
  cs: {
    title: 'Stránka nenalezena',
    desc: 'Požadovaná stránka bohužel není na této adrese k dispozici.',
    btn: 'Přejít do obchodu PureSim',
    searchPlaceholder: 'Hledat destinaci...',
    popularTitle: 'Oblíbené destinace',
    linkEsim: 'Přehled destinací eSIM',
    linkTariffs: 'Porovnat všechny tarify',
    linkFaq: 'Časté dotazy (FAQ)',
    linkHome: 'Hlavní stránka',
  },
  ro: {
    title: 'Pagina nu a fost găsită',
    desc: 'Pagina solicitată nu este disponibilă la această adresă.',
    btn: 'Către magazinul PureSim',
    searchPlaceholder: 'Caută destinație...',
    popularTitle: 'Destinații populare',
    linkEsim: 'Prezentare generală destinații eSIM',
    linkTariffs: 'Comparați toate tarifele',
    linkFaq: 'Întrebări frecvente (FAQ)',
    linkHome: 'Pagina principală',
  },
  hu: {
    title: 'Az oldal nem található',
    desc: 'A kért oldal ezen a címen nem érhető el.',
    btn: 'Vissza a PureSim webshopba',
    searchPlaceholder: 'Úti cél keresése...',
    popularTitle: 'Népszerű úti célok',
    linkEsim: 'eSIM úti célok áttekintése',
    linkTariffs: 'Összes tarifa összehasonlítása',
    linkFaq: 'Gyakran Ismételt Kérdések (GYIK)',
    linkHome: 'Kezdőlap',
  },
};

const POPULAR_COUNTRIES: Record<string, Array<{ name: string; slug: string; flag: string }>> = {
  de: [
    { name: 'Vereinigte Staaten', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Türkei', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Deutschland', slug: 'germany', flag: '🇩🇪' },
    { name: 'Schweiz', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Vereinigtes Königreich', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australien', slug: 'australia', flag: '🇦🇺' },
  ],
  en: [
    { name: 'United States', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turkey', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Germany', slug: 'germany', flag: '🇩🇪' },
    { name: 'Switzerland', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'United Kingdom', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  fr: [
    { name: 'États-Unis', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turquie', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Allemagne', slug: 'germany', flag: '🇩🇪' },
    { name: 'Suisse', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japon', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thaïlande', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Royaume-Uni', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australie', slug: 'australia', flag: '🇦🇺' },
  ],
  es: [
    { name: 'Estados Unidos', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turquía', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Alemania', slug: 'germany', flag: '🇩🇪' },
    { name: 'Suiza', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japón', slug: 'japan', flag: '🇯🇵' },
    { name: 'Tailandia', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Reino Unido', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  it: [
    { name: 'Stati Uniti', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turchia', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Germania', slug: 'germany', flag: '🇩🇪' },
    { name: 'Svizzera', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Giappone', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailandia', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Regno Unito', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  nl: [
    { name: 'Verenigde Staten', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turkije', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Duitsland', slug: 'germany', flag: '🇩🇪' },
    { name: 'Zwitserland', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Verenigd Koninkrijk', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australië', slug: 'australia', flag: '🇦🇺' },
  ],
  pl: [
    { name: 'Stany Zjednoczone', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turcja', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Niemcy', slug: 'germany', flag: '🇩🇪' },
    { name: 'Szwajcaria', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japonia', slug: 'japan', flag: '🇯🇵' },
    { name: 'Tajlandia', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Wielka Brytania', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  pt: [
    { name: 'Estados Unidos', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turquia', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Alemanha', slug: 'germany', flag: '🇩🇪' },
    { name: 'Suíça', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japão', slug: 'japan', flag: '🇯🇵' },
    { name: 'Tailândia', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Reino Unido', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Austrália', slug: 'australia', flag: '🇦🇺' },
  ],
  tr: [
    { name: 'Amerika Birleşik Devletleri', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Türkiye', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Almanya', slug: 'germany', flag: '🇩🇪' },
    { name: 'İsviçre', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japonya', slug: 'japan', flag: '🇯🇵' },
    { name: 'Tayland', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Birleşik Krallık', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Avustralya', slug: 'australia', flag: '🇦🇺' },
  ],
  sv: [
    { name: 'USA', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turkiet', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Tyskland', slug: 'germany', flag: '🇩🇪' },
    { name: 'Schweiz', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Storbritannien', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australien', slug: 'australia', flag: '🇦🇺' },
  ],
  da: [
    { name: 'USA', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Tyrkiet', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Tyskland', slug: 'germany', flag: '🇩🇪' },
    { name: 'Schweiz', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japan', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailand', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Storbritannien', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australien', slug: 'australia', flag: '🇦🇺' },
  ],
  fi: [
    { name: 'Yhdysvallat', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turkki', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Saksa', slug: 'germany', flag: '🇩🇪' },
    { name: 'Sveitsi', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japani', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thaimaa', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Yhdistynyt kuningaskunta', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  cs: [
    { name: 'Spojené státy', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turecko', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Německo', slug: 'germany', flag: '🇩🇪' },
    { name: 'Švýcarsko', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japonsko', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thajsko', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Velká Británie', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Austrálie', slug: 'australia', flag: '🇦🇺' },
  ],
  ro: [
    { name: 'Statele Unite', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Turcia', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Germania', slug: 'germany', flag: '🇩🇪' },
    { name: 'Elveția', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japonia', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thailanda', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Regatul Unit', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Australia', slug: 'australia', flag: '🇦🇺' },
  ],
  hu: [
    { name: 'Egyesült Államok', slug: 'united-states', flag: '🇺🇸' },
    { name: 'Törökország', slug: 'turkey', flag: '🇹🇷' },
    { name: 'Németország', slug: 'germany', flag: '🇩🇪' },
    { name: 'Svájc', slug: 'switzerland', flag: '🇨🇭' },
    { name: 'Japán', slug: 'japan', flag: '🇯🇵' },
    { name: 'Thaiföld', slug: 'thailand', flag: '🇹🇭' },
    { name: 'Egyesült Királyság', slug: 'united-kingdom', flag: '🇬🇧' },
    { name: 'Ausztrália', slug: 'australia', flag: '🇦🇺' },
  ],
};

export function render404Html(locale: string): string {
  const loc = NOT_FOUND_TEXTS[locale] ? locale : 'de';
  const t = NOT_FOUND_TEXTS[loc];
  const prefix = loc === 'de' ? '' : `/${loc}`;
  const homeUrl = prefix || '/';
  const esimUrl = `${prefix}/esim`;
  const tariffsUrl = `${prefix}/tariffs`;
  const faqUrl = `${prefix}/faq`;

  const popular = POPULAR_COUNTRIES[loc] || POPULAR_COUNTRIES.en;

  const popularLinksHtml = popular
    .map(
      (c) =>
        `<a href="${prefix}/esim/${c.slug}" class="pop-chip"><span class="flag">${c.flag}</span><span>${c.name}</span></a>`
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="${loc}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${t.title} · PureSim</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/icon.png" type="image/png">
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background-color: #020617;
      color: #f8fafc;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      -webkit-font-smoothing: antialiased;
    }
    .box {
      max-width: 38rem;
      width: 100%;
      margin: 0 auto;
      text-align: center;
    }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 1.25rem;
      background: rgba(37,99,235,0.2);
      border: 1px solid rgba(59,130,246,0.3);
      color: #60a5fa;
      margin-bottom: 1.25rem;
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
      line-height: 1.2;
    }
    p.desc {
      font-size: 0.9375rem;
      color: #94a3b8;
      margin: 0 0 2rem 0;
      line-height: 1.5;
    }
    .search-box {
      margin-bottom: 2rem;
    }
    .search-form {
      position: relative;
      max-width: 28rem;
      margin: 0 auto;
    }
    .search-input {
      width: 100%;
      padding: 0.875rem 1rem 0.875rem 2.75rem;
      border-radius: 1rem;
      background: #0f172a;
      border: 1px solid #334155;
      color: #f8fafc;
      font-size: 0.9375rem;
      outline: none;
      transition: border-color 0.15s ease;
    }
    .search-input:focus {
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59,130,246,0.2);
    }
    .search-icon {
      position: absolute;
      left: 1rem;
      top: 50%;
      transform: translateY(-50%);
      color: #64748b;
      pointer-events: none;
    }
    .pop-section {
      margin-bottom: 2rem;
    }
    .pop-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
      margin-bottom: 0.75rem;
    }
    .pop-grid {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 0.5rem;
    }
    .pop-chip {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.875rem;
      border-radius: 0.75rem;
      background: #0f172a;
      border: 1px solid #1e293b;
      color: #e2e8f0;
      text-decoration: none;
      font-size: 0.8125rem;
      font-weight: 600;
      transition: all 0.15s ease;
      min-height: 44px;
    }
    .pop-chip:hover {
      background: #1e293b;
      border-color: #3b82f6;
      color: #ffffff;
    }
    .nav-links {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #1e293b;
    }
    .btn-main {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: 0.75rem;
      background-color: #2563eb;
      color: #ffffff;
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      transition: background-color 0.15s ease;
    }
    .btn-main:hover {
      background-color: #1d4ed8;
    }
    .btn-sec {
      display: inline-flex;
      min-height: 44px;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: 0.75rem;
      background-color: transparent;
      border: 1px solid #334155;
      color: #cbd5e1;
      padding: 0.625rem 1rem;
      font-size: 0.8125rem;
      font-weight: 600;
      text-decoration: none;
      transition: all 0.15s ease;
    }
    .btn-sec:hover {
      background-color: #1e293b;
      color: #ffffff;
      border-color: #475569;
    }
  </style>
</head>
<body>
  <main class="box">
    <div class="icon-wrap">
      <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
      </svg>
    </div>
    <h1>${t.title}</h1>
    <p class="desc">${t.desc}</p>

    <!-- Search Form -->
    <div class="search-box">
      <form action="${esimUrl}" method="GET" class="search-form">
        <svg class="search-icon" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
        </svg>
        <input type="text" name="q" placeholder="${t.searchPlaceholder}" class="search-input" aria-label="${t.searchPlaceholder}">
      </form>
    </div>

    <!-- Popular Destinations -->
    <div class="pop-section">
      <div class="pop-title">${t.popularTitle}</div>
      <div class="pop-grid">
        ${popularLinksHtml}
      </div>
    </div>

    <!-- Navigation Links -->
    <div class="nav-links">
      <a href="${homeUrl}" class="btn-main">${t.linkHome}</a>
      <a href="${esimUrl}" class="btn-sec">${t.linkEsim}</a>
      <a href="${tariffsUrl}" class="btn-sec">${t.linkTariffs}</a>
      <a href="${faqUrl}" class="btn-sec">${t.linkFaq}</a>
    </div>
  </main>
</body>
</html>`;
}
