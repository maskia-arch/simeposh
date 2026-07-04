const fs = require('fs');
const path = require('path');

const transDir = path.join(__dirname, '..', 'lib', 'i18n', 'translations');

const faqKeys = {
  de: {
    faq_title: 'Häufig gestellte Fragen (FAQ)',
    faq_q1: 'Was ist eine eSIM und wie funktioniert sie bei Global eSIM?',
    faq_a1: 'Eine eSIM (embedded SIM) ist eine digitale SIM-Karte, die fest in deinem Smartphone verbaut ist. Du kaufst einen Reisetarif, erhältst einen QR-Code per E-Mail, scannst ihn ein und bist sofort vernetzt – ganz ohne physische SIM-Karte.',
    faq_q2: 'Ist mein Smartphone kompatibel mit Global eSIM?',
    faq_a2: 'Die meisten modernen Geräte unterstützen eSIM, darunter iPhone XS/XR und neuer, Samsung Galaxy S20+ und neuer, sowie Google Pixel 3 und neuer. Du kannst die Kompatibilität in den Einstellungen unter Mobilfunk/Netzwerk prüfen.',
    faq_q3: 'Beinhalten die Tarife eine Telefonnummer?',
    faq_a3: 'Nein, aktuell bieten wir reine Data-only eSIMs an. Diese beinhalten keine Telefonnummer. Du kannst jedoch problemlos Anrufe über VoIP-Apps wie WhatsApp, FaceTime oder Skype tätigen.',
    faq_q4: 'Kann ich meine eSIM aufladen (Top-Up)?',
    faq_a4: 'Ja, bei aufladbaren Tarifen kannst du im Bereich "Aufladen" einfach die ICCID deiner eSIM eingeben und in Sekundenschnelle Datenvolumen nachbuchen.',
    faq_q5: 'Wie funktioniert das eSIM Cash Cashback-Programm?',
    faq_a5: 'Du erhältst bis zu 15% Cashback als Guthaben auf jeden eSIM-Kauf. Zudem kannst du Freunde werben, um Extra-Cashback-Tickets zu erhalten. Dein gesammeltes Guthaben kannst du beim Checkout einlösen.',
    faq_q6: 'Welche Zahlungsmethoden werden unterstützt?',
    faq_a6: 'Wir unterstützen sichere Zahlungen via Sellauth, Kreditkarten sowie verschiedene Kryptowährungen (ohne zusätzliche Gebühren bei ausgewählten Währungen).'
  },
  en: {
    faq_title: 'Frequently Asked Questions (FAQ)',
    faq_q1: 'What is an eSIM and how does it work at Global eSIM?',
    faq_a1: 'An eSIM (embedded SIM) is a digital SIM card built into your device. You purchase your travel plan, receive a QR code via email, scan it, and connect instantly—no physical SIM card required.',
    faq_q2: 'Is my device compatible with Global eSIM?',
    faq_a2: 'Most modern devices support eSIM, including iPhone XS/XR and newer, Samsung Galaxy S20+ and newer, and Google Pixel 3 and newer. Check your device settings under Mobile Data to confirm compatibility.',
    faq_q3: 'Do the plans include a phone number?',
    faq_a3: 'No, currently we offer data-only eSIMs. They do not include a phone number. However, you can use internet-based calling services like WhatsApp, FaceTime, or Skype to stay in touch.',
    faq_q4: 'Can I top up my eSIM?',
    faq_a4: 'Yes, for rechargeable plans you can visit the Top-Up section, enter your eSIM ICCID, and purchase additional data packages in seconds.',
    faq_q5: 'How does the eSIM Cash cashback program work?',
    faq_a5: 'You earn up to 15% cashback on every purchase. You can also refer friends to earn extra cashback tickets. Your earned balance can be used directly as a payment method at checkout.',
    faq_q6: 'What payment methods do you support?',
    faq_a6: 'We accept secure payments via Sellauth, including credit cards and various cryptocurrencies with zero fee on selected networks.'
  },
  fr: {
    faq_title: 'Foire Aux Questions (FAQ)',
    faq_q1: 'Qu\'est-ce qu\'une eSIM et comment fonctionne-t-elle chez Global eSIM ?',
    faq_a1: 'Une eSIM (SIM intégrée) est une carte SIM virtuelle directement intégrée à votre appareil. Vous achetez votre forfait, recevez un code QR par e-mail, le scannez et vous êtes connecté instantanément, sans carte physique.',
    faq_q2: 'Mon appareil est-il compatible avec Global eSIM ?',
    faq_a2: 'La plupart des appareils récents supportent l\'eSIM, notamment l\'iPhone XS/XR et ultérieurs, le Samsung Galaxy S20+ et ultérieurs, et le Google Pixel 3 et ultérieurs. Vérifiez vos paramètres réseau pour confirmer.',
    faq_q3: 'Les forfaits incluent-ils un numéro de téléphone ?',
    faq_a3: 'Non, nous proposons actuellement uniquement des eSIM de données (data-only). Elles n\'incluent pas de numéro de téléphone, mais vous pouvez utiliser des applications comme WhatsApp, FaceTime ou Skype.',
    faq_q4: 'Puis-je recharger mon eSIM ?',
    faq_a4: 'Oui, pour les forfaits rechargeables, rendez-vous dans la section "Recharger", entrez l\'ICCID de votre eSIM et ajoutez du crédit en quelques secondes.',
    faq_q5: 'Comment fonctionne le programme de cashback eSIM Cash ?',
    faq_a5: 'Vous cumulez jusqu\'à 15% de cashback à chaque achat. Vous pouvez parrainer des amis pour obtenir des bonus. Votre solde peut être utilisé directement comme moyen de paiement.',
    faq_q6: 'Quels moyens de paiement acceptez-vous ?',
    faq_a6: 'Nous acceptons les paiements sécurisés via Sellauth, y compris les cartes bancaires et diverses cryptomonnaies sans frais sur certains réseaux.'
  },
  es: {
    faq_title: 'Preguntas Frecuentes (FAQ)',
    faq_q1: '¿Qué es una eSIM y cómo funciona en Global eSIM?',
    faq_a1: 'Una eSIM (SIM integrada) es una tarjeta SIM digital integrada en tu dispositivo. Compras tu plan, recibes un código QR por correo, lo escaneas y te conectas al instante, sin necesidad de una tarjeta física.',
    faq_q2: '¿Mi dispositivo es compatible con Global eSIM?',
    faq_a2: 'La mayoría de los dispositivos modernos admiten eSIM, como iPhone XS/XR y posteriores, Samsung Galaxy S20+ y posteriores, y Google Pixel 3 y posteriores. Comprueba la compatibilidad en los ajustes de red.',
    faq_q3: '¿Los planes incluyen número de teléfono?',
    faq_a3: 'No, actualmente ofrecemos eSIM solo de datos. No incluyen número de teléfono, pero puedes realizar llamadas con apps basadas en internet como WhatsApp, FaceTime o Skype.',
    faq_q4: '¿Puedo recargar mi eSIM?',
    faq_a4: 'Sí, para los planes recargables puedes ir a la sección "Recargar", introducir el ICCID de tu eSIM y comprar paquetes de datos adicionales en segundos.',
    faq_q5: '¿Cómo funciona el programa de cashback eSIM Cash?',
    faq_a5: 'Obtienes hasta un 15% de cashback en cada compra. También puedes referir amigos para ganar tickets de cashback adicionales. Tu saldo acumulado se puede usar al pagar.',
    faq_q6: '¿Qué métodos de pago son compatibles?',
    faq_a6: 'Aceptamos pagos seguros a través de Sellauth, que incluyen tarjetas de crédito y varias criptomonedas sin cargos adicionales en redes seleccionadas.'
  },
  it: {
    faq_title: 'Domande Frequenti (FAQ)',
    faq_q1: 'Cos\'è una eSIM e come funziona su Global eSIM?',
    faq_a1: 'Una eSIM (SIM integrata) è una scheda SIM digitale integrata nel tuo dispositivo. Acquisti il tuo piano, ricevi un codice QR via e-mail, lo scansiona e sei subito connesso, senza bisogno di una SIM fisica.',
    faq_q2: 'Il mio dispositivo è compatibile con Global eSIM?',
    faq_a2: 'La maggior parte dei dispositivi moderni supporta le eSIM, come iPhone XS/XR e successivi, Samsung Galaxy S20+ e successivi, e Google Pixel 3 e successivi. Controlla le impostazioni dei dati cellulari.',
    faq_q3: 'I piani includono un numero di telefono ?',
    faq_a3: 'No, attualmente offriamo solo eSIM dati. Non includono un numero, ma puoi telefonare via internet con app come WhatsApp, FaceTime o Skype.',
    faq_q4: 'Posso ricaricare la mia eSIM ?',
    faq_a4: 'Sì, per i piani ricaricabili puoi andare nella sezione "Ricarica", inserire l\'ICCID della tua eSIM e acquistare pacchetti dati aggiuntivi in pochi secondi.',
    faq_q5: 'Come funziona il programma cashback eSIM Cash?',
    faq_a5: 'Guadagni fino al 15% di cashback su ogni acquisto. Puoi anche invitare amici per ottenere vantaggi extra. Il saldo accumulato può essere usato direttamente al checkout.',
    faq_q6: 'Quali metodi di pagamento sono supportati?',
    faq_a6: 'Accettiamo pagamenti sicuri tramite Sellauth, comprese carte di credito e diverse criptovalute senza commissioni su reti selezionate.'
  },
  tr: {
    faq_title: 'Sıkça Sorulan Sorular (SSS)',
    faq_q1: 'eSIM nedir ve Global eSIM\'de nasıl çalışır?',
    faq_a1: 'eSIM (entegre SIM), cihazınıza yerleşik dijital bir SIM karttır. Seyahat planınızı satın alır, e-posta ile bir QR kod alır, taratır ve fiziksel bir karta ihtiyaç duymadan anında bağlanırsınız.',
    faq_q2: 'Cihazım Global eSIM ile uyumlu mu?',
    faq_a2: 'iPhone XS/XR ve sonrası, Samsung Galaxy S20+ ve sonrası ile Google Pixel 3 ve sonrası dahil olmak üzere çoğu modern cihaz eSIM\'i destekler. Hücresel ayarlarınızdan uyumluluğu kontrol edebilirsiniz.',
    faq_q3: 'Planlar telefon numarası içeriyor mu?',
    faq_a3: 'Hayır, şu anda yalnızca veri (data-only) eSIM\'leri sunuyoruz. Telefon numarası içermezler ancak WhatsApp, FaceTime veya Skype gibi uygulamalar üzerinden sesli arama yapabilirsiniz.',
    faq_q4: 'eSIM\'ime yükleme yapabilir miyim?',
    faq_a4: 'Evet, yükleme yapılabilir planlar için "Yükleme" bölümüne gidip eSIM ICCID numaranızı girerek saniyeler içinde ek veri paketleri satın alabilirsiniz.',
    faq_q5: 'eSIM Cash nakit iade programı nasıl çalışır?',
    faq_a5: 'Her satın alımda %15\'e varan nakit iade (cashback) kazanırsınız. Arkadaşlarınızı davet ederek ekstra iade biletleri de alabilirsiniz. Kazandığınız bakiyeyi ödemede kullanabilirsiniz.',
    faq_q6: 'Hangi ödeme yöntemlerini destekliyorsunuz?',
    faq_a6: 'Kredi kartları ve seçili ağlarda sıfır komisyonlu çeşitli kripto para birimleri dahil olmak üzere Sellauth aracılığıyla güvenli ödemeleri kabul ediyoruz.'
  },
  nl: {
    faq_title: 'Veelgestelde Vragen (FAQ)',
    faq_q1: 'Wat is een eSIM en hoe werkt het bij Global eSIM?',
    faq_a1: 'Een eSIM (embedded SIM) is een digitale SIM-kaart die is ingebouwd in je telefoon. Je koopt een reistarief, ontvangt een QR-code per e-mail, scant deze en bent direct verbonden – zonder fysieke SIM-kaart.',
    faq_q2: 'Is mijn smartphone compatibel met Global eSIM?',
    faq_a2: 'De meeste moderne smartphones ondersteunen eSIM, waaronder iPhone XS/XR en nieuwer, Samsung Galaxy S20+ en nieuwer, en Google Pixel 3 en nieuwer. Controleer dit bij de mobiele netwerkinstellingen.',
    faq_q3: 'Bevatten de tarieven een telefoonnummer?',
    faq_a3: 'Nee, momenteel bieden we alleen data-only eSIMs aan. Deze bevatten geen telefoonnummer. Je kunt wel bellen via internet-apps zoals WhatsApp, FaceTime of Skype.',
    faq_q4: 'Kan ik mijn eSIM opwaarderen?',
    faq_a4: 'Ja, voor opwaardeerbare tarieven kun je in het gedeelte "Opwaarderen" de ICCID van je eSIM invoeren en binnen enkele seconden extra data aanschaffen.',
    faq_q5: 'Hoe werkt het eSIM Cash cashbackprogramma?',
    faq_a5: 'Je ontvangt tot 15% cashback als tegoed op elke eSIM-aankoop. Je kunt ook vrienden uitnodigen voor extra cashback-tickets. Je verzamelde tegoed kan direct bij het afrekenen worden gebruikt.',
    faq_q6: 'Welke betaalmethoden worden ondersteund?',
    faq_a6: 'We ondersteunen veilige betalingen via Sellauth, inclusief creditcards en verschillende cryptovaluta zonder extra kosten op geselecteerde netwerken.'
  },
  pl: {
    faq_title: 'Najczęściej Zadawane Pytania (FAQ)',
    faq_q1: 'Co to jest eSIM i jak działa w Global eSIM?',
    faq_a1: 'eSIM (wbudowany SIM) to cyfrowa karta SIM wbudowana bezpośrednio w urządzenie. Kupujesz plan turystyczny, otrzymujesz kod QR e-mailem, skanujesz go i łączysz się natychmiast, bez fizycznej karty.',
    faq_q2: 'Czy moje urządzenie jest kompatybilne z Global eSIM?',
    faq_a2: 'Większość nowoczesnych telefonów obsługuje eSIM, w tym iPhone XS/XR i nowsze, Samsung Galaxy S20+ i nowsze oraz Google Pixel 3 i nowsze. Możesz to sprawdzić w ustawieniach sieci.',
    faq_q3: 'Czy plany zawierają numer telefonu?',
    faq_a3: 'Nie, obecnie oferujemy wyłącznie karty eSIM do transmisji danych (data-only). Nie zawierają one numeru telefonu, ale możesz dzwonić przez aplikacje WhatsApp, FaceTime lub Skype.',
    faq_q4: 'Czy mogę doładować kartę eSIM?',
    faq_a4: 'Tak, w przypadku planów z opcją doładowania możesz przejść do sekcji "Doładuj", wpisać numer ICCID swojej karty eSIM i dokupić pakiety w kilka sekund.',
    faq_q5: 'Jak działa program cashback eSIM Cash?',
    faq_a5: 'Otrzymujesz do 15% zwrotu za każdy zakup. Możesz też polecać znajomych, by zdobyć dodatkowe bilety cashback. Zgromadzone środki możesz wykorzystać jako metodę płatności przy kasie.',
    faq_q6: 'Jakie metody płatności są obsługiwane?',
    faq_a6: 'Akceptujemy bezpieczne płatności przez Sellauth, w tym karty płatnicze oraz różne kryptowaluty bez prowizji w wybranych sieciach.'
  },
  pt: {
    faq_title: 'Perguntas Frequentes (FAQ)',
    faq_q1: 'O que é um eSIM e como funciona na Global eSIM?',
    faq_a1: 'Um eSIM (SIM embutido) é um cartão SIM digital integrado no seu dispositivo. Adquire o seu plano, recebe um código QR por e-mail, digitaliza-o e liga-se instantaneamente, sem necessidade de cartão físico.',
    faq_q2: 'O meu dispositivo é compatível com a Global eSIM?',
    faq_a2: 'A maioria dos dispositivos modernos suporta eSIM, incluindo iPhone XS/XR e mais recentes, Samsung Galaxy S20+ e mais recentes, e Google Pixel 3 e mais recentes. Verifique as configurações de rede móvel.',
    faq_q3: 'Os planos incluem um número de telefone?',
    faq_a3: 'Não, atualmente disponibilizamos apenas eSIMs de dados (data-only). Não incluem número de telefone, mas pode fazer chamadas através de apps como WhatsApp, FaceTime ou Skype.',
    faq_q4: 'Posso recarregar o meu eSIM?',
    faq_a4: 'Sim, para os planos recarregáveis, pode aceder à secção "Recarregar", introduzir o ICCID do seu eSIM e adquirir pacotes de dados adicionais em segundos.',
    faq_q5: 'Como funciona o programa de cashback eSIM Cash?',
    faq_a5: 'Ganha até 15% de cashback em cada compra. Também pode indicar amigos para ganhar mais bilhetes de cashback. O seu saldo acumulado pode ser utilizado diretamente no checkout.',
    faq_q6: 'Que métodos de pagamento são suportados?',
    faq_a6: 'Aceitamos pagamentos seguros via Sellauth, incluindo cartões de crédito e várias criptomoedas sem taxas adicionais em redes selecionadas.'
  },
  sv: {
    faq_title: 'Vanliga frågor (FAQ)',
    faq_q1: 'Vad är ett eSIM och hur fungerar det hos Global eSIM?',
    faq_a1: 'Ett eSIM (inbyggt SIM) är ett digitalt SIM-kort som är inbyggt i din enhet. Du köper din resplan, får en QR-kod via e-post, skannar den och ansluter direkt – helt utan fysiskt plastkort.',
    faq_q2: 'Är min enhet kompatibel med Global eSIM?',
    faq_a2: 'De flesta moderna enheter har stöd för eSIM, inklusive iPhone XS/XR och nyare, Samsung Galaxy S20+ och nyare samt Google Pixel 3 och nyare. Kontrollera dina mobilnätsinställningar.',
    faq_q3: 'Ingår det ett telefonnummer i planerna?',
    faq_a3: 'Nej, för närvarande erbjuder vi endast eSIM för mobildata (data-only). De innehåller inget telefonnummer, men du kan ringa via internet-appar som WhatsApp, FaceTime eller Skype.',
    faq_q4: 'Kan jag ladda min eSIM (Top-Up)?',
    faq_a4: 'Ja, för återladdningsbara planer kan du gå till sektionen "Ladda", skriva in ditt eSIM ICCID och köpa extra datapaket på några sekunder.',
    faq_q5: 'Hur fungerar cashback-programmet eSIM Cash?',
    faq_a5: 'Du får upp till 15 % cashback på varje köp. Du kan också värva vänner för att få extra cashback-biljetter. Ditt sparade saldo kan dras av direkt som betalmedel i kassan.',
    faq_q6: 'Vilka betalningsmetoder accepteras?',
    faq_a6: 'Vi stödjer säkra betalningar via Sellauth, inklusive kreditkort samt flera kryptovalutor utan avgifter på valda nätverk.'
  },
  da: {
    faq_title: 'Ofte stillede spørgsmål (FAQ)',
    faq_q1: 'Hvad er et eSIM, og hvordan fungerer det hos Global eSIM?',
    faq_a1: 'Et eSIM (integreret SIM) er et digitalt SIM-kort, der er indbygget i din telefon. Du køber en rejseplan, modtager en QR-kode via e-mail, scanner den, og du er forbundet med det samme – helt uden et fysisk SIM-kort.',
    faq_q2: 'Er min telefon kompatibel med Global eSIM?',
    faq_a2: 'De fleste moderne telefoner understøtter eSIM, herunder iPhone XS/XR og nyere, Samsung Galaxy S20+ og nyere, samt Google Pixel 3 og nyere. Tjek dine mobilindstillinger for at bekræfte.',
    faq_q3: 'Inkluderer planerne et telefonnummer?',
    faq_a3: 'Nej, vi tilbyder i øjeblikket kun data-only eSIMs. De inkluderer ikke et telefonnummer, men du kan nemt foretage opkald via internettjenester som WhatsApp, FaceTime eller Skype.',
    faq_q4: 'Kan jeg oplade mit eSIM (Top-Up)?',
    faq_a4: 'Ja, for genopladelige planer kan du gå til afsnittet "Oplad", indtaste dit eSIM ICCID og tilkøbe ekstra datapakker på få sekunder.',
    faq_q5: 'Hvordan fungerer cashback-programmet eSIM Cash?',
    faq_a5: 'Du optjener op til 15% cashback på hvert køb. Du kan også henvise venner for at optjene ekstra cashback-billetter. Din opsparede saldo kan trækkes direkte i kassen.',
    faq_q6: 'Hvilke betalingsmetoder understøttes?',
    faq_a6: 'Vi accepterer sikre betalinger via Sellauth, herunder kreditkort samt forskellige kryptovalutaer med nul gebyrer på udvalgte netværk.'
  },
  fi: {
    faq_title: 'Usein kysytyt kysymykset (FAQ)',
    faq_q1: 'Mikä on eSIM ja miten se toimii Global eSIM -palvelussa?',
    faq_a1: 'eSIM (sulautettu SIM) on digitaalinen SIM-kortti, joka on sisäänrakennettu laitteeseesi. Ostat matkapaketin, saat QR-koodin sähköpostitse, skannaat sen ja olet heti yhteydessä – ilman fyysistä SIM-korttia.',
    faq_q2: 'Onko laitteeni yhteensopiva Global eSIMin kanssa?',
    faq_a2: 'Useimmat modernit laitteet tukevat eSIMiä, kuten iPhone XS/XR ja uudemmat, Samsung Galaxy S20+ ja uudemmat sekä Google Pixel 3 ja uudemmat. Tarkista laitteesi asetukset mobiiliverkon kohdalta.',
    faq_q3: 'Sisältävätkö paketit puhelinnumeroa?',
    faq_a3: 'Ei, tarjoamme tällä hetkellä vain datasiirtoon tarkoitettuja eSIM-kortteja (data-only). Ne eivät sisällä puhelinnumeroa, mutta voit soittaa WhatsApp-, FaceTime- tai Skype-puheluita netin välityksellä.',
    faq_q4: 'Voinko ladata lisää saldoa eSIMiini?',
    faq_a4: 'Kyllä, ladattavien pakettien kohdalla voit mennä "Lataa" -osioon, syöttää eSIMin ICCID-koodin ja ostaa lisää dataa sekunneissa.',
    faq_q5: 'Miten eSIM Cash -käteispalautusohjelma toimii?',
    faq_a5: 'Saat jopa 15 % käteispalautusta jokaisesta ostoksesta. Voit myös suositella ystäviäsi ansaitaksesi lisälippuja. Kertynyttä saldoa voi käyttää suoraan maksamiseen kassalla.',
    faq_q6: 'Mitkä maksutavat ovat tuettuja?',
    faq_a6: 'Hyväksymme turvalliset maksut Sellauthin kautta, mukaan lukien luottokortit ja useat kryptovaluutat ilman kuluja valituissa verkoissa.'
  },
  cs: {
    faq_title: 'Často kladené otázky (FAQ)',
    faq_q1: 'Co je eSIM a jak funguje u Global eSIM?',
    faq_a1: 'eSIM (vestavěná SIM) je digitální SIM karta zabudovaná ve vašem telefonu. Koupíte si cestovní tarif, obdržíte e-mailem QR kód, naskenujete jej a jste okamžitě připojeni – bez fyzické SIM karty.',
    faq_q2: 'Je můj telefon kompatibilní s Global eSIM?',
    faq_a2: 'Většina moderních telefonů podporuje eSIM, včetně iPhone XS/XR a novějších, Samsung Galaxy S20+ a novějších a Google Pixel 3 a novějších. Kompatibilitu ověříte v nastavení mobilní sítě.',
    faq_q3: 'Obsahují tarify telefonní číslo?',
    faq_a3: 'Ne, v současné době nabízíme pouze eSIM pro mobilní data (data-only). Neobsahují telefonní číslo, ale můžete bez problémů volat přes aplikace WhatsApp, FaceTime nebo Skype.',
    faq_q4: 'Mohu si svou eSIM dobít (Top-Up)?',
    faq_a4: 'Ano, u dobíjecích tarifů můžete v sekci "Dobít" jednoduše zadat ICCID své eSIM a během několika sekund dokoupit další datový balíček.',
    faq_q5: 'Jak funguje věrnostní program eSIM Cash?',
    faq_a5: 'Z každého nákupu získáte až 15 % cashback jako kredit. Můžete také doporučit přátele a získat další cashback poukazy. Střádaný kredit lze využít k platbě při placení.',
    faq_q6: 'Jaké platební metody jsou podporovány?',
    faq_a6: 'Přijímáme zabezpečené platby přes Sellauth, včetně platebních karet a různých kryptoměn bez poplatků u vybraných sítí.'
  },
  ro: {
    faq_title: 'Întrebări frecvente (FAQ)',
    faq_q1: 'Ce este un eSIM și cum funcționează la Global eSIM?',
    faq_a1: 'Un eSIM (SIM încorporat) este o cartelă SIM digitală integrată direct în telefon. Cumpărați un tarif de călătorie, primiți un cod QR prin e-mail, îl scanați și sunteți conectat instantaneu – fără cartelă fizică.',
    faq_q2: 'Telefonul meu este compatibil cu Global eSIM?',
    faq_a2: 'Majoritatea telefoanelor moderne acceptă eSIM, inclusiv iPhone XS/XR și modelele mai noi, Samsung Galaxy S20+ și mai noi, precum și Google Pixel 3 și mai noi. Verificați setările rețelei.',
    faq_q3: 'Tarifele includ un număr de telefon?',
    faq_a3: 'Nu, în prezent oferim doar eSIM de date (data-only). Nu includ un număr de telefon, dar puteți efectua apeluri prin WhatsApp, FaceTime sau Skype utilizând conexiunea la internet.',
    faq_q4: 'Pot să îmi reîncarc eSIM-ul (Top-Up)?',
    faq_a4: 'Da, pentru tarifele reîncărcabile puteți accesa secțiunea „Reîncărcare”, introduceți codul ICCID al eSIM-ului și achiziționați pachete de date suplimentare în câteva secunde.',
    faq_q5: 'Cum funcționează programul de cashback eSIM Cash?',
    faq_a5: 'Primiți până la 15% cashback sub formă de credit la fiecare achiziție de eSIM. Puteți, de asemenea, să recomandați prieteni pentru a obține tichete de cashback suplimentare. Creditul poate fi folosit la checkout.',
    faq_q6: 'Ce metode de plată sunt acceptate?',
    faq_a6: 'Acceptăm plăți securizate prin Sellauth, inclusiv carduri de credit și diverse criptomonede fără taxe suplimentare în rețelele selectate.'
  },
  hu: {
    faq_title: 'Gyakran Ismételt Kérdések (GYIK)',
    faq_q1: 'Mi az az eSIM és hogyan működik a Global eSIM-nél?',
    faq_a1: 'Az eSIM (beágyazott SIM) egy digitális SIM-kártya, amely be van építve a telefonba. Megvásárolja az utazási csomagot, e-mailben kap egy QR-kódot, beolvassa, és azonnal csatlakozik – fizikai SIM-kártya nélkül.',
    faq_q2: 'Kompatibilis a telefonom a Global eSIM-mel?',
    faq_a2: 'A legtöbb modern készülék támogatja az eSIM-et, beleértve az iPhone XS/XR és újabb modelleket, a Samsung Galaxy S20+ és újabbakat, valamint a Google Pixel 3 és újabbakat. Ellenőrizze a mobilhálózati beállításokat.',
    faq_q3: 'Tartalmaznak a csomagok telefonszámot?',
    faq_a3: 'Nem, jelenleg kizárólag adatforgalmi eSIM-eket kínálunk (data-only). Telefonszámot nem tartalmaznak, de internetes hívásokat (pl. WhatsApp, FaceTime, Skype) gond nélkül indíthat.',
    faq_q4: 'Feltölthetem az eSIM-emet (Top-Up)?',
    faq_a4: 'Igen, a feltölthető csomagoknál a "Feltöltés" részben megadhatja az eSIM ICCID kódját, és másodpercek alatt vásárolhat további adatcsomagot.',
    faq_q5: 'Hogyan működik az eSIM Cash cashback program?',
    faq_a5: 'Minden vásárlás után akár 15% cashback egyenleget kap vissza. Barátok meghívásával extra cashback jegyeket szerezhet. A felhalmozott egyenleg közvetlenül levonható a fizetésnél.',
    faq_q6: 'Milyen fizetési módokat támogatnak?',
    faq_a6: 'Biztonságos fizetést kínálunk a Sellauth-on keresztül, beleértve a bankkártyákat és a kiválasztott hálózatokon díjmentes kriptovalutákat.'
  }
};

const allKeysList = Object.keys(faqKeys);
for (const lang of allKeysList) {
  const filePath = path.join(transDir, `${lang}.ts`);
  
  if (lang !== 'others' && fs.existsSync(filePath)) {
    let fileContent = fs.readFileSync(filePath, 'utf8');
    const endMarker = '} as const;';
    const endIdx = fileContent.indexOf(endMarker);
    if (endIdx === -1) {
      console.error(`End marker not found in file: ${filePath}`);
      continue;
    }
    
    const beforeBrace = fileContent.substring(0, endIdx).trim();
    const separator = beforeBrace.endsWith(',') ? '\n' : ',\n';
    
    const langKeys = faqKeys[lang];
    const keysStr = Object.entries(langKeys)
      .map(([k, v]) => `  ${k}:${JSON.stringify(v)}`)
      .join(',\n');
      
    fileContent = beforeBrace + separator + keysStr + '\n' + fileContent.substring(endIdx);
    fs.writeFileSync(filePath, fileContent, 'utf8');
    console.log(`Updated dictionary file with FAQ: ${filePath}`);
  }
}

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
  
  const beforeBrace = othersContent.substring(0, endIdx).trim();
  const separator = beforeBrace.endsWith(',') ? '\n' : ',\n';
  
  const langKeys = faqKeys[lang];
  const keysStr = Object.entries(langKeys)
    .map(([k, v]) => `  ${k}:${JSON.stringify(v)}`)
    .join(',\n');
    
  othersContent = beforeBrace + separator + keysStr + '\n' + othersContent.substring(endIdx);
  console.log(`Updated others.ts with FAQ block for: ${lang}`);
}
fs.writeFileSync(othersPath, othersContent, 'utf8');

console.log('All FAQ translations successfully updated.');
