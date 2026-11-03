import Link from 'next/link';
import { headers, cookies } from 'next/headers';
import type { Metadata } from 'next';
import { isValidLocale, type LocaleCode } from '@/lib/i18n/config';

export const metadata: Metadata = {
  title: { absolute: 'Link abgelaufen | PureSim' },
  robots: { index: false, follow: false },
};

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

function detectLocaleFromRequest(
  cookieLocale: string | undefined,
  acceptLanguage: string | undefined
): LocaleCode {
  if (cookieLocale && isValidLocale(cookieLocale)) {
    return cookieLocale as LocaleCode;
  }
  if (acceptLanguage) {
    const langs = acceptLanguage
      .split(',')
      .map((part) => part.split(';')[0].trim().toLowerCase().slice(0, 2));
    for (const l of langs) {
      if (isValidLocale(l)) {
        return l as LocaleCode;
      }
    }
  }
  return 'de';
}

export default function SetupLinkNotFound() {
  let cookieLoc: string | undefined;
  let acceptLang: string | undefined;

  try {
    const reqHeaders = headers();
    const reqCookies = cookies();
    cookieLoc = reqCookies.get('locale')?.value;
    acceptLang = reqHeaders.get('accept-language') || undefined;
  } catch {}

  const locale = detectLocaleFromRequest(cookieLoc, acceptLang);
  const t = EXPIRED_TEXTS[locale] || EXPIRED_TEXTS.de;

  const dashboardUrl = locale === 'de' ? 'https://puresim.net/dashboard' : `https://puresim.net/${locale}/dashboard`;

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
      {/* Light Header with PureSim Logo */}
      <header className="border-b border-slate-200 bg-white py-4 px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link href={locale === 'de' ? 'https://puresim.net/' : `https://puresim.net/${locale}`} className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-slate-900">PureSim</span>
          </Link>
          <a
            href="https://t.me/autoacts"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-semibold text-slate-600 hover:text-brand-600"
          >
            {t.telegram} ↗
          </a>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16 text-center">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 mb-2">
            {t.title}
          </h1>

          <p className="text-sm text-slate-600 mb-8 leading-relaxed">
            {t.desc}
          </p>

          <div className="flex flex-col gap-3">
            <a
              href={dashboardUrl}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white shadow-xs transition-all hover:bg-brand-700"
            >
              {t.dashboard}
            </a>

            <a
              href="https://t.me/autoacts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
            >
              <span>{t.telegram}</span>
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
