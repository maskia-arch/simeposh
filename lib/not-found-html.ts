export interface NotFoundText {
  title: string;
  desc: string;
  btn: string;
}

export const NOT_FOUND_TEXTS: Record<string, NotFoundText> = {
  de: {
    title: 'Seite nicht gefunden',
    desc: 'Die angeforderte Einrichtungsseite oder Webshop-Seite ist unter dieser Adresse nicht erreichbar.',
    btn: 'Zum PureSim Webshop',
  },
  en: {
    title: 'Page Not Found',
    desc: 'The requested page is not available at this address.',
    btn: 'Back to PureSim Webshop',
  },
  fr: {
    title: 'Page non trouvée',
    desc: "La page demandée n'est pas disponible à cette adresse.",
    btn: 'Retour à la boutique PureSim',
  },
  es: {
    title: 'Página no encontrada',
    desc: 'La página solicitada no está disponible en esta dirección.',
    btn: 'Volver a la tienda PureSim',
  },
  it: {
    title: 'Pagina non trovata',
    desc: 'La pagina richiesta non è disponibile a questo indirizzo.',
    btn: 'Torna allo shop PureSim',
  },
  nl: {
    title: 'Pagina niet gevonden',
    desc: 'De opgevraagde pagina is niet beschikbaar op dit adres.',
    btn: 'Naar de PureSim-webshop',
  },
  pl: {
    title: 'Strona nie znaleziona',
    desc: 'Żądana strona nie jest dostępna pod tym adresem.',
    btn: 'Wróć do sklepu PureSim',
  },
  pt: {
    title: 'Página não encontrada',
    desc: 'A página solicitada não está disponível neste endereço.',
    btn: 'Ir para a loja PureSim',
  },
  tr: {
    title: 'Sayfa Bulunamadı',
    desc: 'İstenen sayfa bu adreste mevcut değil.',
    btn: 'PureSim Mağazasına Dön',
  },
  sv: {
    title: 'Sidan hittades inte',
    desc: 'Den begärda sidan är inte tillgänglig på denna adress.',
    btn: 'Till PureSim-butiken',
  },
  da: {
    title: 'Siden blev ikke fundet',
    desc: 'Den ønskede side er ikke tilgængelig på denne adresse.',
    btn: 'Til PureSim-webshoppen',
  },
  fi: {
    title: 'Sivua ei löydy',
    desc: 'Pyydettyä sivua ei löydy tästä osoitteesta.',
    btn: 'PureSim-verkkokauppaan',
  },
  cs: {
    title: 'Stránka nenalezena',
    desc: 'Požadovaná stránka není na této adrese k dispozici.',
    btn: 'Do e-shopu PureSim',
  },
  ro: {
    title: 'Pagina nu a fost găsită',
    desc: 'Pagina solicitată nu este disponibilă la această adresă.',
    btn: 'Către magazinul PureSim',
  },
  hu: {
    title: 'Az oldal nem található',
    desc: 'A kért oldal ezen a címen nem érhető el.',
    btn: 'Vissza a PureSim webshopba',
  },
};

export const UNLIMITED_ENABLED_CODES = new Set([
  'AD','AE','AF','AG','AI','AL','AM','AO','AR','AS','AT','AU','AW','AX','AZ',
  'BA','BB','BD','BE','BF','BG','BH','BJ','BL','BM','BN','BO','BQ','BR','BS',
  'BT','BW','BY','BZ','CA','CD','CG','CH','CI','CL','CM','CN','CO','CR','CV',
  'CW','CY','CZ','DE','DK','DM','DO','DZ','EC','EE','EG','ES','ET','EU','FI',
  'FJ','FO','FR','GA','GB','GD','GE','GF','GH','GI','GL','GM','GN','GP','GR',
  'GT','GU','GW','GY','HK','HN','HR','HT','HU','ID','IE','IL','IM','IN','IQ',
  'IS','IT','JE','JO','JP','KE','KG','KH','KN','KR','KW','KY','KZ','LA','LC',
  'LI','LK','LS','LT','LU','LV','LY','MA','MC','MD','ME','MF','MK','MO','MQ',
  'MR','MS','MT','MU','MV','MW','MX','MY','NA','NC','NE','NG','NI','NL','NO',
  'NP','NR','NZ','OM','PA','PE','PF','PG','PH','PK','PL','PT','PY','QA','RE',
  'RO','RS','RU','RW','SA','SC','SE','SG','SI','SK','SL','SM','SN','SR','SS',
  'SV','SZ','TC','TD','TG','TH','TJ','TN','TO','TR','TT','TW','TZ','UA','UG',
  'US','UY','UZ','VA','VC','VE','VG','VN','VU','WS','XK','YE','YT','ZA','ZM','ZW','GLOB','OC','SEA'
]);

export function render404Html(locale: string): string {
  const loc = NOT_FOUND_TEXTS[locale] ? locale : 'de';
  const t = NOT_FOUND_TEXTS[loc];
  const prefix = loc === 'de' ? '' : `/${loc}`;
  const homeUrl = prefix || '/';

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
      text-align: center;
      padding: 4rem 1rem;
      -webkit-font-smoothing: antialiased;
    }
    .box {
      max-width: 28rem;
      width: 100%;
      margin: 0 auto;
    }
    .icon-wrap {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      border-radius: 1rem;
      background: rgba(37,99,235,0.2);
      border: 1px solid rgba(59,130,246,0.3);
      color: #60a5fa;
      margin-bottom: 1.5rem;
    }
    h1 {
      font-size: 1.875rem;
      font-weight: 800;
      letter-spacing: -0.025em;
      color: #ffffff;
      margin: 0 0 0.5rem 0;
      line-height: 1.25;
    }
    p {
      font-size: 0.875rem;
      color: #94a3b8;
      margin: 0 0 1.5rem 0;
      line-height: 1.5;
    }
    .btn {
      display: inline-flex;
      min-height: 48px;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      border-radius: 0.75rem;
      background-color: #2563eb;
      color: #ffffff;
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 700;
      text-decoration: none;
      box-shadow: 0 10px 15px -3px rgba(37,99,235,0.2);
      transition: background-color 0.15s ease;
      cursor: pointer;
    }
    .btn:hover {
      background-color: #1d4ed8;
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
    <p>${t.desc}</p>
    <div style="display: flex; justify-content: center;">
      <a href="${homeUrl}" class="btn">
        <span>${t.btn}</span>
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
        </svg>
      </a>
    </div>
  </main>
</body>
</html>`;
}
