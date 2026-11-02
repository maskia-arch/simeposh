export const GUIDE_SLUGS: Record<string, string> = {
  de: 'puresim-esim-aktivieren-schritt-fuer-schritt-anleitung-ios-android',
  en: 'activate-esim-step-by-step-guide-ios-android',
  fr: 'activer-esim-guide-etape-par-etape-ios-android',
  es: 'activar-esim-guia-paso-a-paso-ios-android',
  it: 'attivare-esim-guida-passo-passo-ios-android',
  nl: 'esim-activeren-stap-voor-stap-handleiding-ios-android',
  pl: 'aktywacja-esim-instrukcja-krok-po-kroku-ios-android',
  pt: 'ativar-esim-guia-paso-a-paso-para-ios-e-android',
  tr: 'esim-etkinlestirme-ios-ve-android-icin-adim-adim-kilavuz',
  sv: 'aktivera-esim-steg-for-steg-guide-for-ios-och-android',
  da: 'aktiver-esim-trin-for-trin-guide-til-ios-og-android',
  fi: 'esim-n-aktivointi-vaiheittainen-opas-ios-lle-ja-androidille',
  cs: 'aktivace-esim-pruvodce-krok-za-krokem-pro-ios-a-android',
  ro: 'activarea-esim-ghid-pas-cu-pas-pentru-ios-si-android',
  hu: 'esim-aktivalasa-lepesrol-lepesre-utmutato-ios-es-android-rendszerhez',
};

export function getGuideUrl(locale: string = 'de'): string {
  const normLocale = locale.toLowerCase().slice(0, 2);
  const slug = GUIDE_SLUGS[normLocale] || GUIDE_SLUGS.en;
  return normLocale === 'de' ? `/blog/${slug}` : `/${normLocale}/blog/${slug}`;
}
