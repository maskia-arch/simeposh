const fs = require('fs');
const path = require('path');

const transDir = path.join(__dirname, '..', 'lib', 'i18n', 'translations');

const translations = {
  de: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Mehr über eSIM erfahren & News',
    blog_read_more: 'Artikel lesen',
    blog_published_at: 'Veröffentlicht am',
    blog_category_guide: 'eSIM Grundlagen',
    blog_category_news: 'News & Updates',
    blog_no_posts: 'Keine Artikel gefunden.',
    blog_back: '← Zurück zum Blog',
    blog_title_guides: 'eSIM Grundlagen & Wissen',
    blog_title_news: 'News & Updates',
    blog_desc_guides: 'Alles Wissenswerte über eSIMs, die Einrichtung und Tipps für deine nächste Reise.',
    blog_desc_news: 'Aktuelle Neuigkeiten über Netzabdeckung, neue Features und Entwicklungen.',
    blog_empty_desc: 'In dieser Kategorie wurden noch keine Beiträge veröffentlicht. Schau später wieder vorbei!',
    blog_cta_tagline: 'Günstiges Roaming weltweit',
    blog_cta_title: 'Bereit für deine nächste Reise?',
    blog_cta_desc: 'Hole dir jetzt deine eSIM und bleibe in über 150 Ländern sofort und unkompliziert ohne teures Datenroaming vernetzt.',
    blog_teaser_subtitle: 'Bleibe informiert mit unseren eSIM-Ratgebern und aktuellen Ankündigungen.',
    blog_fallback_guide_title: 'Was ist eine eSIM? Einsteiger-Guide',
    blog_fallback_guide_desc: 'Erfahre alles über die Vorteile, Funktionsweise und Installation von digitalen SIM-Karten für deine nächste Reise.',
    blog_fallback_news1_title: 'Netzabdeckung in Asien erweitert',
    blog_fallback_news1_desc: 'Ab sofort profitierst du in Japan, Südkorea und Thailand von noch schnelleren 5G-Lokalnetzen ohne Aufpreis.',
    blog_fallback_news1_date: '15. Juni 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback-Programm gestartet',
    blog_fallback_news2_desc: 'Sammle bis zu 15% Guthaben-Cashback bei jedem eSIM-Kauf und werbe Freunde für Extra-Cashback-Tickets.',
    blog_fallback_news2_date: '10. Juni 2026'
  },
  en: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Learn more about eSIM & News',
    blog_read_more: 'Read article',
    blog_published_at: 'Published on',
    blog_category_guide: 'eSIM Basics',
    blog_category_news: 'News & Updates',
    blog_no_posts: 'No articles found.',
    blog_back: '← Back to Blog',
    blog_title_guides: 'eSIM Basics & Guides',
    blog_title_news: 'News & Updates',
    blog_desc_guides: 'Everything you need to know about eSIMs, setup, and travel tips.',
    blog_desc_news: 'Latest news on coverage, new features, and developments.',
    blog_empty_desc: 'No articles have been published in this category yet. Check back later!',
    blog_cta_tagline: 'Affordable global roaming',
    blog_cta_title: 'Ready for your next trip?',
    blog_cta_desc: 'Get your eSIM now and stay connected in over 150 countries instantly without expensive data roaming.',
    blog_teaser_subtitle: 'Stay informed with our eSIM guides and latest announcements.',
    blog_fallback_guide_title: 'What is an eSIM? Beginners Guide',
    blog_fallback_guide_desc: 'Learn all about the benefits, how it works, and installation of digital SIM cards for your next trip.',
    blog_fallback_news1_title: 'Network coverage expanded in Asia',
    blog_fallback_news1_desc: 'Starting now, enjoy even faster 5G local networks in Japan, South Korea, and Thailand at no extra cost.',
    blog_fallback_news1_date: 'June 15, 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback Program launched',
    blog_fallback_news2_desc: 'Collect up to 15% balance cashback on every eSIM purchase and refer friends for extra cashback tickets.',
    blog_fallback_news2_date: 'June 10, 2026'
  },
  fr: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'En savoir plus sur l\'eSIM et les nouveautés',
    blog_read_more: 'Lire l\'article',
    blog_published_at: 'Publié le',
    blog_category_guide: 'Bases de l\'eSIM',
    blog_category_news: 'Actualités et Mises à jour',
    blog_no_posts: 'Aucun article trouvé.',
    blog_back: '← Retour au Blog',
    blog_title_guides: 'Bases et Guides eSIM',
    blog_title_news: 'Actualités et Mises à jour',
    blog_desc_guides: 'Tout ce que vous devez savoir sur les eSIM, la configuration et les conseils de voyage.',
    blog_desc_news: 'Dernières nouvelles sur la couverture réseau, les nouvelles fonctionnalités et les développements.',
    blog_empty_desc: 'Aucun article n\'a encore été publié dans cette catégorie.',
    blog_cta_tagline: 'Itinérance mondiale abordable',
    blog_cta_title: 'Prêt pour votre prochain voyage ?',
    blog_cta_desc: 'Obtenez votre eSIM maintenant et restez connecté instantanément dans plus de 150 pays sans itinérance de données coûteuse.',
    blog_teaser_subtitle: 'Restez informé grâce à nos guides eSIM et nos dernières annonces.',
    blog_fallback_guide_title: 'Qu\'est-ce qu\'une eSIM ? Guide pour débutants',
    blog_fallback_guide_desc: 'Découvrez les avantages, le fonctionnement et l\'installation des cartes SIM virtuelles pour votre prochain voyage.',
    blog_fallback_news1_title: 'Couverture réseau étendue en Asie',
    blog_fallback_news1_desc: 'Dès à présent, profitez de réseaux locaux 5G encore plus rapides au Japon, en Corée du Sud et en Thaïlande, sans frais supplémentaires.',
    blog_fallback_news1_date: '15 juin 2026',
    blog_fallback_news2_title: 'Lancement du programme eSIM Cash',
    blog_fallback_news2_desc: 'Cumulez jusqu\'à 15% de cashback à chaque achat d\'eSIM et parrainez des amis pour obtenir des tickets de cashback supplémentaires.',
    blog_fallback_news2_date: '10 juin 2026'
  },
  es: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Aprende más sobre eSIM y Noticias',
    blog_read_more: 'Leer artículo',
    blog_published_at: 'Publicado el',
    blog_category_guide: 'Fundamentos de eSIM',
    blog_category_news: 'Noticias y Actualizaciones',
    blog_no_posts: 'No se encontraron artículos.',
    blog_back: '← Volver al Blog',
    blog_title_guides: 'Fundamentos y Guías de eSIM',
    blog_title_news: 'Noticias y Actualizaciones',
    blog_desc_guides: 'Todo lo que necesitas saber sobre las eSIM, la configuración y consejos de viaje.',
    blog_desc_news: 'Últimas noticias sobre cobertura, nuevas funciones y desarrollos.',
    blog_empty_desc: 'Aún no se han publicado artículos en esta categoría.',
    blog_cta_tagline: 'Roaming global asequible',
    blog_cta_title: '¿Listo para tu próximo viaje?',
    blog_cta_desc: 'Obtén tu eSIM ahora y mantente conectado al instante en más de 150 países sin costosos cargos de roaming.',
    blog_teaser_subtitle: 'Mantente informado con nuestras guías de eSIM y los últimos anuncios.',
    blog_fallback_guide_title: '¿Qué es una eSIM? Guía para principiantes',
    blog_fallback_guide_desc: 'Aprende todo sobre los beneficios, funcionamiento e instalación de tarjetas SIM virtuales para tu próximo viaje.',
    blog_fallback_news1_title: 'Cobertura de red ampliada en Asia',
    blog_fallback_news1_desc: 'A partir de ahora, disfruta de redes locales 5G aún más rápidas en Japón, Corea del Sur y Tailandia sin coste adicional.',
    blog_fallback_news1_date: '15 de junio de 2026',
    blog_fallback_news2_title: 'Lanzamiento del programa eSIM Cash',
    blog_fallback_news2_desc: 'Acumula hasta un 15% de cashback en cada compra de eSIM y refiere amigos para obtener tickets de cashback adicionales.',
    blog_fallback_news2_date: '10 de junio de 2026'
  },
  it: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Scopri di più su eSIM e novità',
    blog_read_more: 'Leggi l\'articolo',
    blog_published_at: 'Pubblicato il',
    blog_category_guide: 'Basi delle eSIM',
    blog_category_news: 'Notizie e Aggiornamenti',
    blog_no_posts: 'Nessun articolo trovato.',
    blog_back: '← Torna al Blog',
    blog_title_guides: 'Basi e Guide eSIM',
    blog_title_news: 'Notizie e Aggiornamenti',
    blog_desc_guides: 'Tutto quello che c\'è da sapere sulle eSIM, la configurazione e consigli di viaggio.',
    blog_desc_news: 'Ultime notizie sulla copertura, nuove funzionalità e sviluppi.',
    blog_empty_desc: 'Non sono ancora stati pubblicati articoli in questa categoria.',
    blog_cta_tagline: 'Roaming globale conveniente',
    blog_cta_title: 'Pronto per il tuo prossimo viaggio?',
    blog_cta_desc: 'Ottieni subito la tua eSIM e rimani connesso all\'istante in oltre 150 paesi senza costosi roaming dati.',
    blog_teaser_subtitle: 'Rimani informato con le nostre guide eSIM e gli ultimi annunci.',
    blog_fallback_guide_title: 'Cos\'è una eSIM? Guida per principianti',
    blog_fallback_guide_desc: 'Scopri tutti i vantaggi, il funzionamento e l\'installazione delle schede SIM virtuali per il tuo prossimo viaggio.',
    blog_fallback_news1_title: 'Copertura di rete ampliata in Asia',
    blog_fallback_news1_desc: 'Da ora in poi, sfrutta reti locali 5G ancora più veloci in Giappone, Corea del Sud e Thailandia senza costi aggiuntivi.',
    blog_fallback_news1_date: '15 giugno 2026',
    blog_fallback_news2_title: 'Avviato il programma eSIM Cash',
    blog_fallback_news2_desc: 'Accumula fino al 15% di cashback su ogni acquisto di eSIM e invita gli amici per ricevere ticket cashback extra.',
    blog_fallback_news2_date: '10 giugno 2026'
  },
  tr: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'eSIM ve Haberler Hakkında Daha Fazla Bilgi Edinin',
    blog_read_more: 'Makaleyi oku',
    blog_published_at: 'Yayınlanma tarihi',
    blog_category_guide: 'eSIM Temelleri',
    blog_category_news: 'Haberler ve Güncellemeler',
    blog_no_posts: 'Makale bulunamadı.',
    blog_back: '← Blog\'a Geri Dön',
    blog_title_guides: 'eSIM Temelleri ve Kılavuzları',
    blog_title_news: 'Haberler ve Güncellemeler',
    blog_desc_guides: 'eSIM\'ler, kurulum ve seyahat ipuçları hakkında bilmeniz gereken her şey.',
    blog_desc_news: 'Kapsama alanı, yeni özellikler ve gelişmeler hakkında en son haberler.',
    blog_empty_desc: 'Bu kategoride henüz bir makale yayınlanmadı.',
    blog_cta_tagline: 'Uygun fiyatlı küresel dolaşım',
    blog_cta_title: 'Bir sonraki seyahatiniz için hazır mısınız?',
    blog_cta_desc: 'eSIM\'inizi şimdi alın ve pahalı veri dolaşımı olmadan 150\'den fazla ülkede anında bağlantıda kalın.',
    blog_teaser_subtitle: 'eSIM kılavuzlarımız ve en son duyurularımızla gelişmelerden haberdar olun.',
    blog_fallback_guide_title: 'eSIM Nedir? Başlangıç Kılavuzu',
    blog_fallback_guide_desc: 'Bir sonraki seyahatiniz için dijital SIM kartların avantajları, nasıl çalıştığı ve kurulumu hakkında her şeyi öğrenin.',
    blog_fallback_news1_title: 'Asya\'da ağ kapsamı genişletildi',
    blog_fallback_news1_desc: 'Şu andan itibaren Japonya, Güney Kore ve Tayland\'da ekstra ücret ödemeden daha hızlı 5G yerel ağlarının keyfini çıkarın.',
    blog_fallback_news1_date: '15 Haziran 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback Programı başlatıldı',
    blog_fallback_news2_desc: 'Her eSIM satın alımında %15\'e varan bakiye iadesi toplayın ve ekstra cashback biletleri için arkadaşlarınızı önerin.',
    blog_fallback_news2_date: '10 Haziran 2026'
  },
  nl: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Lees meer over eSIM & Nieuws',
    blog_read_more: 'Artikel lezen',
    blog_published_at: 'Gepubliceerd op',
    blog_category_guide: 'eSIM Basis',
    blog_category_news: 'Nieuws & Updates',
    blog_no_posts: 'Geen artikelen gevonden.',
    blog_back: '← Terug naar Blog',
    blog_title_guides: 'eSIM Basis & Gidsen',
    blog_title_news: 'Nieuws & Updates',
    blog_desc_guides: 'Alles wat u moet weten over eSIMs, installatie en reistips.',
    blog_desc_news: 'Laatste nieuws over dekking, nieuwe functies en ontwikkelingen.',
    blog_empty_desc: 'Er zijn nog geen artikelen gepubliceerd in deze categorie.',
    blog_cta_tagline: 'Betaalbare wereldwijde roaming',
    blog_cta_title: 'Klaar voor je volgende reis?',
    blog_cta_desc: 'Koop nu je eSIM en blijf direct verbonden in meer dan 150 landen zonder dure dataroaming.',
    blog_teaser_subtitle: 'Blijf op de hoogte met onze eSIM-gidsen en nieuwste aankondigingen.',
    blog_fallback_guide_title: 'Wat is een eSIM? Gids voor beginners',
    blog_fallback_guide_desc: 'Leer alles over de voordelen, werking en installatie van digitale SIM-kaarten voor je volgende reis.',
    blog_fallback_news1_title: 'Netwerkdekking in Azië uitgebreid',
    blog_fallback_news1_desc: 'Profiteer vanaf nu van nog snellere 5G lokale netwerken in Japan, Zuid-Korea en Thailand zonder extra kosten.',
    blog_fallback_news1_date: '15 juni 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback-programma gelanceerd',
    blog_fallback_news2_desc: 'Verzamel tot 15% cashback bij elke eSIM-aankoop en verwijs vrienden voor extra cashback-tickets.',
    blog_fallback_news2_date: '10 juni 2026'
  },
  pl: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Dowiedz się więcej o eSIM i nowościach',
    blog_read_more: 'Przeczytaj artykuł',
    blog_published_at: 'Opublikowano dnia',
    blog_category_guide: 'Podstawy eSIM',
    blog_category_news: 'Wiadomości i Aktualizacje',
    blog_no_posts: 'Nie znaleziono artykułów.',
    blog_back: '← Powrót do Bloga',
    blog_title_guides: 'Podstawy i Poradniki eSIM',
    blog_title_news: 'Wiadomości i Aktualizacje',
    blog_desc_guides: 'Wszystko, co musisz wiedzieć o eSIM, konfiguracji i wskazówkach podróżnych.',
    blog_desc_news: 'Najnowsze wiadomości o zasięgu, nowych funkcjach i rozwoju.',
    blog_empty_desc: 'W tej kategorii nie opublikowano jeszcze żadnych artykułów.',
    blog_cta_tagline: 'Niedrogi roaming globalny',
    blog_cta_title: 'Gotowy na kolejną podróż?',
    blog_cta_desc: 'Kup teraz kartę eSIM i bądź w kontakcie w ponad 150 krajach natychmiast, bez kosztownego roamingu danych.',
    blog_teaser_subtitle: 'Bądź na bieżąco dzięki naszym poradnikom eSIM i najnowszym ogłoszeniom.',
    blog_fallback_guide_title: 'Co to jest eSIM? Poradnik dla początkujących',
    blog_fallback_guide_desc: 'Dowiedz się wszystkiego o zaletach, działaniu i instalacji cyfrowych kart SIM na kolejną podróż.',
    blog_fallback_news1_title: 'Rozszerzony zasięg sieci w Azji',
    blog_fallback_news1_desc: 'Od teraz ciesz się jeszcze szybszymi lokalnymi sieciami 5G w Japonii, Korei Południowej i Tajlandii bez dodatkowych opłat.',
    blog_fallback_news1_date: '15 czerwca 2026',
    blog_fallback_news2_title: 'Uruchomiono program eSIM Cash Cashback',
    blog_fallback_news2_desc: 'Zbieraj do 15% zwrotu na saldo przy każdym zakupie eSIM i polecaj znajomych, aby otrzymać dodatkowe bilety cashback.',
    blog_fallback_news2_date: '10 czerwca 2026'
  },
  pt: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Saiba mais sobre eSIM e Notícias',
    blog_read_more: 'Ler artigo',
    blog_published_at: 'Publicado em',
    blog_category_guide: 'Fundamentos do eSIM',
    blog_category_news: 'Notícias e Atualizações',
    blog_no_posts: 'Nenhum artigo encontrado.',
    blog_back: '← Voltar ao Blog',
    blog_title_guides: 'Fundamentos e Guias de eSIM',
    blog_title_news: 'Notícias e Atualizações',
    blog_desc_guides: 'Tudo o que você precisa saber sobre eSIMs, configuração e dicas de viagem.',
    blog_desc_news: 'Últimas notícias sobre cobertura, novos recursos e desenvolvimentos.',
    blog_empty_desc: 'Nenhum artigo foi publicado nesta categoria ainda.',
    blog_cta_tagline: 'Roaming global acessível',
    blog_cta_title: 'Pronto para a sua próxima viagem?',
    blog_cta_desc: 'Obtenha seu eSIM agora e fique conectado instantaneamente em mais de 150 países sem roaming de dados caro.',
    blog_teaser_subtitle: 'Mantenha-se informado com os nossos guias eSIM e os últimos anúncios.',
    blog_fallback_guide_title: 'O que é um eSIM? Guia para Iniciantes',
    blog_fallback_guide_desc: 'Aprenda tudo sobre as vantagens, funcionamento e instalação de cartões SIM digitais para a sua próxima viagem.',
    blog_fallback_news1_title: 'Cobertura de rede expandida na Ásia',
    blog_fallback_news1_desc: 'A partir de agora, desfrute de redes locais 5G ainda mais rápidas no Japão, Coreia do Sul e Tailândia sem custo extra.',
    blog_fallback_news1_date: '15 de junho de 2026',
    blog_fallback_news2_title: 'Programa eSIM Cash Cashback lançado',
    blog_fallback_news2_desc: 'Acumule até 15% de cashback em cada compra de eSIM e indique amigos para ganhar mais bilhetes de cashback.',
    blog_fallback_news2_date: '10 de junho de 2026'
  },
  sv: {
    nav_blog: 'Blogg',
    footer_blog: 'Blogg',
    blog_title: 'Blogg',
    blog_tagline: 'Läs mer om eSIM och nyheter',
    blog_read_more: 'Läs artikeln',
    blog_published_at: 'Publicerad den',
    blog_category_guide: 'eSIM Grundkurs',
    blog_category_news: 'Nyheter och Uppdateringar',
    blog_no_posts: 'Inga artiklar hittades.',
    blog_back: '← Tillbaka till bloggen',
    blog_title_guides: 'eSIM Grundkurs och Guider',
    blog_title_news: 'Nyheter och Uppdateringar',
    blog_desc_guides: 'Allt du behöver veta om eSIM, installation och restips.',
    blog_desc_news: 'Senaste nyheterna om täckning, nya funktioner och utveckling.',
    blog_empty_desc: 'Inga artiklar har publicerats i den här kategorin än.',
    blog_cta_tagline: 'Prisvärd global roaming',
    blog_cta_title: 'Redo för nästa resa?',
    blog_cta_desc: 'Skaffa ditt eSIM nu och håll dig uppkopplad direkt i över 150 länder utan dyr dataroaming.',
    blog_teaser_subtitle: 'Håll dig informerad med våra eSIM-guider och senaste meddelanden.',
    blog_fallback_guide_title: 'Vad är ett eSIM? Nybörjarguide',
    blog_fallback_guide_desc: 'Lär dig allt om fördelarna, hur det fungerar och installationen av digitala SIM-kort för din nästa resa.',
    blog_fallback_news1_title: 'Nätverkstäckning utökad i Asien',
    blog_fallback_news1_desc: 'Från och med nu kan du njuta av ännu snabbare 5G-lokalnät i Japan, Sydkorea och Thailand utan extra kostnad.',
    blog_fallback_news1_date: '15 juni 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback-programmet har lanserats',
    blog_fallback_news2_desc: 'Samla upp till 15 % cashback vid varje eSIM-köp och värva vänner för extra cashback-biljetter.',
    blog_fallback_news2_date: '10 juni 2026'
  },
  da: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Læs mere om eSIM & Nyheder',
    blog_read_more: 'Læs artikel',
    blog_published_at: 'Udgivet den',
    blog_category_guide: 'eSIM Grundlagen',
    blog_category_news: 'Nyheder & Opdateringer',
    blog_no_posts: 'Ingen artikler fundet.',
    blog_back: '← Tilbage til Blog',
    blog_title_guides: 'eSIM Grundlagen & Guides',
    blog_title_news: 'Nyheder & Opdateringer',
    blog_desc_guides: 'Alt hvad du behøver at vide om eSIMs, opsætning og rejsetips.',
    blog_desc_news: 'Seneste nyheder om dækning, nye funktioner og udvikling.',
    blog_empty_desc: 'Der er endnu ikke udgivet nogen artikler i denne kategori.',
    blog_cta_tagline: 'Prisbillig global roaming',
    blog_cta_title: 'Klar til din næste rejse?',
    blog_cta_desc: 'Få dit eSIM nu og vær forbundet med det samme i over 150 lande uden dyr dataroaming.',
    blog_teaser_subtitle: 'Hold dig informeret med vores eSIM-guides og seneste nyheder.',
    blog_fallback_guide_title: 'Hvad er et eSIM? Begynderguide',
    blog_fallback_guide_desc: 'Lær alt om fordelene, funktionen og installationen af digitale SIM-kort til din næste rejse.',
    blog_fallback_news1_title: 'Dækning i Asien udvidet',
    blog_fallback_news1_desc: 'Nyd endnu hurtigere 5G-lokalnetværk i Japan, Sydkorea og Thailand fra nu af uden ekstra omkostninger.',
    blog_fallback_news1_date: '15. juni 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback-program startet',
    blog_fallback_news2_desc: 'Få op til 15% cashback på hvert eSIM-køb, og henvis venner til ekstra cashback-billetter.',
    blog_fallback_news2_date: '10. juni 2026'
  },
  fi: {
    nav_blog: 'Blogi',
    footer_blog: 'Blogi',
    blog_title: 'Blogi',
    blog_tagline: 'Lue lisää eSIMistä ja uutisista',
    blog_read_more: 'Lue artikkeli',
    blog_published_at: 'Julkaistu',
    blog_category_guide: 'eSIM Perusteet',
    blog_category_news: 'Uutiset ja Päivitykset',
    blog_no_posts: 'Artikkeleita ei löytynyt.',
    blog_back: '← Takaisin blogiin',
    blog_title_guides: 'eSIM Perusteet ja Oppaat',
    blog_title_news: 'Uutiset ja Päivitykset',
    blog_desc_guides: 'Kaikki mitä sinun tarvitsee tietää eSIM-korteista, asennuksesta ja matkavinkeistä.',
    blog_desc_news: 'Viimeisimmät uutiset kuuluvuudesta, uusista ominaisuuksista ja kehityksestä.',
    blog_empty_desc: 'Tässä kategoriassa ei ole vielä julkaistu artikkeleita.',
    blog_cta_tagline: 'Edullinen maailmanlaajuinen verkkovierailu',
    blog_cta_title: 'Valmiina seuraavaan matkaan?',
    blog_cta_desc: 'Hanki eSIM nyt ja pysy yhteydessä heti yli 150 maassa ilman kallista datavierailua.',
    blog_teaser_subtitle: 'Pysy ajan tasalla eSIM-oppaidemme ja uusimpien ilmoitusten avulla.',
    blog_fallback_guide_title: 'Mikä on eSIM? Aloittelijan opas',
    blog_fallback_guide_desc: 'Opi kaikki digitaalisten SIM-korttien eduista, toiminnasta ja asennuksesta seuraavaa matkaasi varten.',
    blog_fallback_news1_title: 'Verkon kuuluvuutta laajennettu Aasiassa',
    blog_fallback_news1_desc: 'Nauti tästä lähtien entistä nopeammista paikallisista 5G-verkoista Japanissa, Etelä-Koreassa ja Thaimaassa ilman lisämaksua.',
    blog_fallback_news1_date: '15. kesäkuuta 2026',
    blog_fallback_news2_title: 'eSIM Cash Cashback-ohjelma käynnistetty',
    blog_fallback_news2_desc: 'Kerää jopa 15 % käteispalautusta jokaisesta eSIM-ostoksesta ja suosittele ystäviäsi saadaksesi ylimääräisiä käteispalautuslippuja.',
    blog_fallback_news2_date: '10. kesäkuuta 2026'
  },
  cs: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Dozvěďte se více o eSIM a novinkách',
    blog_read_more: 'Číst článek',
    blog_published_at: 'Publikováno dne',
    blog_category_guide: 'Základy eSIM',
    blog_category_news: 'Novinky a Aktualizace',
    blog_no_posts: 'Nebyly nalezeny žádné články.',
    blog_back: '← Zpět na Blog',
    blog_title_guides: 'Základy a Návody k eSIM',
    blog_title_news: 'Novinky a Aktualizace',
    blog_desc_guides: 'Vše, co potřebujete vědět o eSIM, nastavení a tipech na cesty.',
    blog_desc_news: 'Nejnovější zprávy o pokrytí, nových funkcích a vývoji.',
    blog_empty_desc: 'V této kategorii zatím nebyly publikovány žádné články.',
    blog_cta_tagline: 'Cenově dostupné globální roaming',
    blog_cta_title: 'Připraveni na další cestu?',
    blog_cta_desc: 'Získejte svou eSIM hned a buďte okamžitě připojeni ve více než 150 zemích bez drahého datového roamingu.',
    blog_teaser_subtitle: 'Zůstaňte informováni díky našim eSIM průvodcům a nejnovějším oznámením.',
    blog_fallback_guide_title: 'Co je eSIM? Průvodce pro začátečníky',
    blog_fallback_guide_desc: 'Zjistěte vše o výhodách, fungování a instalaci digitálních SIM karet pro vaši příští cestu.',
    blog_fallback_news1_title: 'Rozšířené pokrytí sítě v Asii',
    blog_fallback_news1_desc: 'Od nynějška si užívejte ještě rychlejší 5G lokální sítě v Japonsku, Jižní Koreji a Thajsku bez dalších poplatků.',
    blog_fallback_news1_date: '15. června 2026',
    blog_fallback_news2_title: 'Spuštěn program eSIM Cash Cashback',
    blog_fallback_news2_desc: 'Sbírejte až 15% cashback na zůstatek při každém nákupu eSIM a doporučte přátele pro extra cashback vstupenky.',
    blog_fallback_news2_date: '10. června 2026'
  },
  ro: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Aflați mai multe despre eSIM și Știri',
    blog_read_more: 'Citiți articolul',
    blog_published_at: 'Publicat la',
    blog_category_guide: 'Bazele eSIM',
    blog_category_news: 'Știri și Actualizări',
    blog_no_posts: 'Nu au fost găsite articole.',
    blog_back: '← Înapoi la Blog',
    blog_title_guides: 'Bazele eSIM și Ghiduri',
    blog_title_news: 'Știri și Actualizări',
    blog_desc_guides: 'Tot ce trebuie să știți despre eSIM-uri, configurare și sfaturi de călătorie.',
    blog_desc_news: 'Ultimele știri despre acoperire, funcții noi și evoluții.',
    blog_empty_desc: 'Nu au fost publicate încă articole în această categorie.',
    blog_cta_tagline: 'Roaming global accesibil',
    blog_cta_title: 'Pregătit pentru următoarea călătorie?',
    blog_cta_desc: 'Obțineți eSIM-ul acum și rămâneți conectat instantaneu în peste 150 de țări, fără roaming de date costisitor.',
    blog_teaser_subtitle: 'Rămâneți informat cu ghidurile noastre eSIM și cele mai recente anunțuri.',
    blog_fallback_guide_title: 'Ce este un eSIM? Ghid pentru începători',
    blog_fallback_guide_desc: 'Aflați totul despre avantajele, funcționarea și instalarea cardurilor SIM virtuale pentru următoarea călătorie.',
    blog_fallback_news1_title: 'Acoperirea rețelei extinsă în Asia',
    blog_fallback_news1_desc: 'De acum, bucurați-vă de rețele locale 5G și mai rapide în Japonia, Coreea de Sud și Thailanda, fără costuri suplimentare.',
    blog_fallback_news1_date: '15 iunie 2026',
    blog_fallback_news2_title: 'Lansarea programului eSIM Cash Cashback',
    blog_fallback_news2_desc: 'Acumulați până la 15% cashback la fiecare achiziție de eSIM și recomandați prieteni pentru tichete de cashback suplimentare.',
    blog_fallback_news2_date: '10 iunie 2026'
  },
  hu: {
    nav_blog: 'Blog',
    footer_blog: 'Blog',
    blog_title: 'Blog',
    blog_tagline: 'Tudjon meg többet az eSIM-ről és a hírekről',
    blog_read_more: 'Cikk elolvasása',
    blog_published_at: 'Közzétéve',
    blog_category_guide: 'eSIM Alapok',
    blog_category_news: 'Hírek és Frissítések',
    blog_no_posts: 'Nem találhatók cikkek.',
    blog_back: '← Vissza a Bloghoz',
    blog_title_guides: 'eSIM Alapok és Útmutatók',
    blog_title_news: 'Hírek és Frissítések',
    blog_desc_guides: 'Minden, amit az eSIM-ekről, a beállításról och az utazási tippekről tudni kell.',
    blog_desc_news: 'Legfrissebb hírek a lefedettségről, új funkciókról és fejleményekről.',
    blog_empty_desc: 'Ebben a kategóriában még nem jelentek meg cikkek.',
    blog_cta_tagline: 'Megfizethető globális roaming',
    blog_cta_title: 'Készen áll a következő utazásra?',
    blog_cta_desc: 'Szerezze be eSIM-jét most, és maradjon azonnal kapcsolatban több mint 150 országban, drága adatroaming nélkül.',
    blog_teaser_subtitle: 'Maradjon naprakész eSIM-útmutatóinkkal és legfrissebb bejelentéseinkkel.',
    blog_fallback_guide_title: 'Mi az az eSIM? Kezdő útmutató',
    blog_fallback_guide_desc: 'Tudjon meg mindent a digitális SIM-kártyák előnyeiről, működéséről és telepítéséről a következő utazásához.',
    blog_fallback_news1_title: 'Bővült a hálózati lefedettség Ázsiában',
    blog_fallback_news1_desc: 'Ezentúl élvezze a még gyorsabb 5G helyi hálózatokat Japánban, Dél-Koreában és Thaiföldön felár nélkül.',
    blog_fallback_news1_date: '2026. június 15.',
    blog_fallback_news2_title: 'Elindult az eSIM Cash Cashback program',
    blog_fallback_news2_desc: 'Gyűjtsön akár 15% egyenleg-visszatérítést minden eSIM vásárlásakor, és ajánljon barátokat extra cashback jegyekért.',
    blog_fallback_news2_date: '2026. június 10.'
  }
};

// 1. Update standalone files directly: da.ts, fi.ts, cs.ts, ro.ts, hu.ts, de.ts, en.ts
const allKeysList = Object.keys(translations);
for (const lang of allKeysList) {
  const filePath = path.join(transDir, `${lang}.ts`);
  
  if (lang !== 'others' && fs.existsSync(filePath)) {
    // Re-read file content to have latest structure
    let fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Find closing } as const;
    const endMarker = '} as const;';
    const endIdx = fileContent.indexOf(endMarker);
    if (endIdx === -1) {
      console.error(`End marker not found in file: ${filePath}`);
      continue;
    }
    
    // We want to insert the keys before this endMarker
    // Let's strip the closing brace first
    const beforeBrace = fileContent.substring(0, endIdx).trim();
    // Check if it ends with a comma, if not add it
    const separator = beforeBrace.endsWith(',') ? '\n' : ',\n';
    
    const langKeys = translations[lang];
    const keysStr = Object.entries(langKeys)
      .map(([k, v]) => `  ${k}:${JSON.stringify(v)}`)
      .join(',\n');
      
    // Reconstruct file
    fileContent = beforeBrace + separator + keysStr + '\n' + fileContent.substring(endIdx);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Updated dictionary file: ${filePath}`);
  }
}

// 2. Update others.ts for fr, es, it, tr, nl, pl, pt, sv
const othersList = ['fr', 'es', 'it', 'tr', 'nl', 'pl', 'pt', 'sv'];
const othersPath = path.join(transDir, 'others.ts');
let othersContent = fs.readFileSync(othersPath, 'utf8');

for (const lang of othersList) {
  const marker = 'export const ' + lang + ' = {';
  const startIdx = othersContent.indexOf(marker);
  if (startIdx === -1) {
    console.error(`Marker not found for language ${lang} in others.ts`);
    continue;
  }
  
  const endMarker = '} as const;';
  const endIdx = othersContent.indexOf(endMarker, startIdx);
  if (endIdx === -1) {
    console.error(`End marker not found for language ${lang} in others.ts`);
    continue;
  }
  
  // We want to insert the keys before this endMarker
  const beforeBrace = othersContent.substring(0, endIdx).trim();
  const separator = beforeBrace.endsWith(',') ? '\n' : ',\n';
  
  const langKeys = translations[lang];
  const keysStr = Object.entries(langKeys)
    .map(([k, v]) => `  ${k}:${JSON.stringify(v)}`)
    .join(',\n');
    
  othersContent = beforeBrace + separator + keysStr + '\n' + othersContent.substring(endIdx);
  console.log(`Updated others.ts block for: ${lang}`);
}
fs.writeFileSync(othersPath, othersContent, 'utf8');

console.log('All translations successfully updated.');
