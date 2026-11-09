import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isValidLocale, type LocaleCode } from '@/lib/i18n/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EXPIRED_TEXTS: Record<
  LocaleCode,
  { title: string; desc: string; dashboard: string; telegram: string }
> = {
  de: {
    title: 'Link abgelaufen',
    desc: 'Dieser Einrichtungslink ist abgelaufen. Deine eSIM findest du jederzeit in deinem Konto.',
    dashboard: 'Zum Dashboard',
    telegram: 'Support über Telegram',
  },
  en: {
    title: 'Link expired',
    desc: 'This setup link has expired. You can find your eSIM anytime in your account.',
    dashboard: 'Go to Dashboard',
    telegram: 'Support via Telegram',
  },
  fr: {
    title: 'Lien expiré',
    desc: 'Ce lien de configuration a expiré. Vous pouvez retrouver votre eSIM à tout moment dans votre compte.',
    dashboard: 'Accéder au tableau de bord',
    telegram: 'Assistance via Telegram',
  },
  es: {
    title: 'Enlace caducado',
    desc: 'Este enlace de configuración ha caducado. Puedes encontrar tu eSIM en cualquier momento en tu cuenta.',
    dashboard: 'Ir al panel',
    telegram: 'Soporte vía Telegram',
  },
  it: {
    title: 'Link scaduto',
    desc: 'Questo link di configurazione è scaduto. Puoi trovare la tua eSIM in qualsiasi momento nel tuo account.',
    dashboard: 'Vai alla dashboard',
    telegram: 'Supporto via Telegram',
  },
  nl: {
    title: 'Link verlopen',
    desc: 'Deze installatielink is verlopen. Je kunt je eSIM op elk moment in je account vinden.',
    dashboard: 'Naar dashboard',
    telegram: 'Ondersteuning via Telegram',
  },
  pl: {
    title: 'Link wygasł',
    desc: 'Ten link konfiguracyjny wygasł. Swoją kartę eSIM możesz znaleźć w każdej chwili na swoim koncie.',
    dashboard: 'Przejdź do panelu',
    telegram: 'Pomoc przez Telegram',
  },
  pt: {
    title: 'Ligação expirada',
    desc: 'Esta ligação de configuração expirou. Pode encontrar o seu eSIM a qualquer momento na sua conta.',
    dashboard: 'Ir para o painel',
    telegram: 'Apoio via Telegram',
  },
  tr: {
    title: 'Bağlantının süresi doldu',
    desc: "Bu kurulum bağlantısının süresi doldu. eSIM'inizi istediğiniz zaman hesabınızda bulabilirsiniz.",
    dashboard: 'Panele git',
    telegram: 'Telegram üzerinden Destek',
  },
  sv: {
    title: 'Länken har gått ut',
    desc: 'Den här installationslänken har gått ut. Du hittar alltid ditt eSIM på ditt konto.',
    dashboard: 'Gå till instrumentpanelen',
    telegram: 'Support via Telegram',
  },
  da: {
    title: 'Linket er udløbet',
    desc: 'Dette installationslink er udløbet. Du kan altid finde dit eSIM på din konto.',
    dashboard: 'Gå til kontrolpanelet',
    telegram: 'Support via Telegram',
  },
  fi: {
    title: 'Linkki on vanhentunut',
    desc: 'Tämä asennuslinkki on vanhentunut. Löydät eSIM-korttisi milloin tahansa tililtäsi.',
    dashboard: 'Siirry hallintapaneeliin',
    telegram: 'Tuki Telegramissa',
  },
  cs: {
    title: 'Platnost odkazu vypršela',
    desc: 'Platnost tohoto instalačního odkazu vypršela. Svou eSIM najdete kdykoli ve svém účtu.',
    dashboard: 'Přejít na nástěnku',
    telegram: 'Podpora přes Telegram',
  },
  ro: {
    title: 'Link expirat',
    desc: 'Acest link de configurare a expirat. Vă puteți găsi oricând eSIM-ul în contul dvs.',
    dashboard: 'Mergi la panou',
    telegram: 'Asistență prin Telegram',
  },
  hu: {
    title: 'A link lejárt',
    desc: 'Ez a beállítási link lejárt. Az eSIM-kártyáját bármikor megtalálja a fiókjában.',
    dashboard: 'Ugrás a vezérlőpultra',
    telegram: 'Támogatás Telegramon',
  },
};

function detectLocale(request: NextRequest): LocaleCode {
  const cookieLocale = request.cookies.get('locale')?.value;
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale as LocaleCode;
  }
  const acceptLang = request.headers.get('accept-language');
  if (acceptLang) {
    const parts = acceptLang
      .split(',')
      .map(p => p.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const p of parts) {
      if (isValidLocale(p)) {
        return p as LocaleCode;
      }
    }
  }
  return 'de';
}

function renderExpiredHtml(locale: LocaleCode): string {
  const t = EXPIRED_TEXTS[locale] || EXPIRED_TEXTS.de;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${t.title} | PureSim</title>
  <meta name="robots" content="noindex, nofollow" />
  <link rel="icon" href="/icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background-color: #f8fafc; color: #1e293b; min-height: 100vh; display: flex; flex-direction: column; }
    header { background: #ffffff; border-bottom: 1px solid #e2e8f0; padding: 1rem 1.5rem; }
    .header-inner { max-width: 64rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; }
    .logo { display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none; font-weight: 800; font-size: 1.25rem; color: #1d4ed8; min-height: 44px; }
    .logo img { width: 32px; height: 32px; object-fit: contain; }
    .support-link { font-size: 0.8125rem; font-weight: 600; color: #475569; text-decoration: none; transition: color 0.15s; min-height: 44px; display: inline-flex; align-items: center; }
    .support-link:hover { color: #2563eb; }
    main { flex: 1; display: flex; align-items: center; justify-content: center; padding: 4rem 1rem; text-align: center; }
    .card { width: 100%; max-width: 28rem; background: #ffffff; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 1.5rem; padding: 2rem; box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05); }
    .icon-wrap { width: 3.5rem; height: 3.5rem; border-radius: 1rem; background: #fffbeb; border: 1px solid #fde68a; color: #d97706; display: flex; align-items: center; justify-content: center; margin: 0 auto 1.25rem auto; }
    .icon-wrap svg { width: 1.75rem; height: 1.75rem; }
    h1 { font-size: 1.5rem; font-weight: 800; color: #0f172a; margin-bottom: 0.5rem; letter-spacing: -0.025em; }
    p { font-size: 0.875rem; color: #475569; line-height: 1.5; margin-bottom: 2rem; }
    .btn-group { display: flex; flex-direction: column; gap: 0.75rem; }
    .btn-primary { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; border-radius: 0.75rem; background: #2563eb; color: #ffffff; font-size: 0.875rem; font-weight: 700; text-decoration: none; padding: 0.625rem 1.25rem; transition: background 0.15s; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 0.5rem; border-radius: 0.75rem; background: #ffffff; border: 1px solid #cbd5e1; color: #334155; font-size: 0.875rem; font-weight: 600; text-decoration: none; padding: 0.625rem 1.25rem; transition: background 0.15s; }
    .btn-secondary:hover { background: #f8fafc; }
  </style>
</head>
<body>
  <header>
    <div class="header-inner">
      <a href="https://puresim.net/" class="logo">
        <img src="/logo.webp" alt="PureSim Logo" width="28" height="28" />
        <span>PureSim</span>
      </a>
      <a href="https://t.me/autoacts" target="_blank" rel="noopener noreferrer" class="support-link">
        ${t.telegram} ↗
      </a>
    </div>
  </header>
  <main>
    <div class="card">
      <div class="icon-wrap">
        <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h1>${t.title}</h1>
      <p>${t.desc}</p>
      <div class="btn-group">
        <a href="https://puresim.net/dashboard" class="btn-primary">${t.dashboard}</a>
        <a href="https://t.me/autoacts" target="_blank" rel="noopener noreferrer" class="btn-secondary">
          <span>${t.telegram}</span>
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </div>
  </main>
</body>
</html>`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = params?.token?.trim();
  const locale = detectLocale(request);

  if (!token) {
    return new Response(renderExpiredHtml(locale), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  const db = createServiceClient();
  const { data: order, error } = await db
    .from('orders')
    .select('id, status')
    .eq('setup_token', token)
    .maybeSingle();

  if (error || !order || !['completed', 'paid', 'provisioning'].includes(order.status)) {
    return new Response(renderExpiredHtml(locale), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }

  // Forward directly to local Next.js server instance on port 4444
  const port = process.env.PORT || '4444';
  const targetUrl = `http://127.0.0.1:${port}/setup-view/${encodeURIComponent(token)}`;
  
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.set('host', 'esim.puresim.net');

  try {
    const res = await fetch(targetUrl, {
      headers: forwardHeaders,
      cache: 'no-store',
    });
    return new Response(res.body, {
      status: res.status,
      headers: res.headers,
    });
  } catch (err) {
    console.error('[Setup Token Proxy Error]', err);
    return new Response(renderExpiredHtml(locale), {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'private, no-cache, no-store, max-age=0, must-revalidate',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    });
  }
}
