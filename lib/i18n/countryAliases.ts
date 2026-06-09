/**
 * Maps localised country names (lower-case) → ISO 3166-1 alpha-2 code.
 * Used so users can search in their own language and still find results
 * whose English names are stored in the database.
 *
 * Covers all 15 shop languages: DE FR ES IT NL PL PT TR SV DA FI CS RO HU + EN
 */
export const COUNTRY_ALIASES: Record<string, string> = {
  // ── A ──────────────────────────────────────────────────────────
  'albanien':            'AL', 'albanie':              'AL', 'albania':       'AL',
  'algerien':            'DZ', 'algérie':              'DZ', 'argelia':       'DZ',
  'armenien':            'AM', 'arménie':              'AM', 'armenia':       'AM',
  'australien':          'AU', 'australie':            'AU', 'australia':     'AU', 'austrálie':     'AU',
  'österreich':          'AT', 'autriche':             'AT', 'austria':       'AT', 'austrija':      'AT',
  'aserbaidschan':       'AZ', 'azerbaïdjan':          'AZ', 'azerbaiyán':   'AZ',

  // ── B ──────────────────────────────────────────────────────────
  'bahrain':             'BH', 'bahrein':              'BH',
  'bangladesch':         'BD', 'bangladesh':           'BD',
  'belgien':             'BE', 'belgique':             'BE', 'bélgica':       'BE', 'belgio':         'BE', 'belgie': 'BE', 'belgia': 'BE', 'belçika': 'BE',
  'bolivien':            'BO', 'bolivie':              'BO', 'bolivia':       'BO',
  'bosnien':             'BA', 'bosnie':               'BA', 'bosnia':        'BA',
  'brasilien':           'BR', 'brésil':               'BR', 'brasil':        'BR', 'brazilië':       'BR', 'brazylia': 'BR', 'brazílie': 'BR', 'brazilija': 'BR', 'brezilya': 'BR',
  'bulgarien':           'BG', 'bulgarie':             'BG', 'bulgaria':      'BG', 'bulgarije':      'BG', 'bułgaria': 'BG', 'bulharsko': 'BG', 'bulgária': 'BG',

  // ── C ──────────────────────────────────────────────────────────
  'kambodscha':          'KH', 'cambodge':             'KH', 'camboya':       'KH', 'cambodia':       'KH',
  'kanada':              'CA', 'canada':               'CA', 'kanadě':        'CA',
  'chile':               'CL',
  'china':               'CN', 'chine':                'CN',
  'kolumbien':           'CO', 'colombie':             'CO', 'colombia':      'CO', 'kolumbia':       'CO',
  'kroatien':            'HR', 'croatie':              'HR', 'croacia':       'HR', 'kroatia':        'HR', 'kroacja': 'HR', 'chorvatsko': 'HR', 'hrvatska': 'HR', 'horvátország': 'HR',
  'zypern':              'CY', 'chypre':               'CY', 'chipre':        'CY', 'cipro':          'CY', 'cyprus': 'CY', 'kıbrıs': 'CY',
  'tschechien':          'CZ', 'tchéquie':             'CZ', 'chequia':       'CZ', 'czech republic': 'CZ', 'czechy': 'CZ', 'tjeckien': 'CZ', 'česká republika': 'CZ', 'csehország': 'CZ',

  // ── D ──────────────────────────────────────────────────────────
  'dänemark':            'DK', 'danemark':             'DK', 'dinamarca':     'DK', 'danimarca':      'DK', 'denemarken': 'DK', 'dania': 'DK', 'danimarka': 'DK', 'tanska': 'DK', 'dánsko': 'DK', 'dánia': 'DK',
  'deutschland':         'DE', 'allemagne':            'DE', 'alemania':      'DE', 'germania':       'DE', 'duitsland': 'DE', 'niemcy': 'DE', 'alemanha': 'DE', 'almanya': 'DE', 'saksa': 'DE', 'tyskland': 'DE', 'nemecko': 'DE', 'németország': 'DE',
  'dominikanische republik': 'DO', 'dominican republic': 'DO',

  // ── E ──────────────────────────────────────────────────────────
  'ecuador':             'EC',
  'ägypten':             'EG', 'égypte':               'EG', 'egipto':        'EG', 'egitto':         'EG', 'egypte': 'EG', 'egipt': 'EG', 'egito': 'EG', 'mısır': 'EG', 'egypten': 'EG', 'egypt': 'EG',
  'estland':             'EE', 'estonie':              'EE', 'estonia':       'EE', 'estónia':        'EE', 'észtország': 'EE',
  'äthiopien':           'ET', 'éthiopie':             'ET', 'etiopía':       'ET', 'ethiopia':       'ET',

  // ── F ──────────────────────────────────────────────────────────
  'finnland':            'FI', 'finlande':             'FI', 'finlandia':     'FI', 'suomi':          'FI', 'finlandiya': 'FI', 'finland': 'FI', 'finsko': 'FI', 'finnország': 'FI',
  'frankreich':          'FR', 'france':               'FR', 'francia':       'FR', 'frankrig':       'FR', 'frankrijk': 'FR', 'francja': 'FR', 'fransa': 'FR', 'francie': 'FR', 'franciaország': 'FR',

  // ── G ──────────────────────────────────────────────────────────
  'georgien':            'GE', 'géorgie':              'GE', 'georgia':       'GE',
  'ghana':               'GH',
  'griechenland':        'GR', 'grèce':                'GR', 'grecia':        'GR', 'griekenland':    'GR', 'grecja': 'GR', 'grécia': 'GR', 'yunanistan': 'GR', 'kreikka': 'GR', 'řecko': 'GR', 'görögország': 'GR',
  'guatemala':           'GT',

  // ── H ──────────────────────────────────────────────────────────
  'hongkong':            'HK', 'hong kong':            'HK',
  'ungarn':              'HU', 'hongrie':              'HU', 'hungría':       'HU', 'ungheria':       'HU', 'hongarije': 'HU', 'węgry': 'HU', 'hungria': 'HU', 'macaristan': 'HU', 'unkari': 'HU', 'maďarsko': 'HU', 'magyarország': 'HU',

  // ── I ──────────────────────────────────────────────────────────
  'island':              'IS', 'islande':              'IS', 'islandia':      'IS', 'islanda':        'IS', 'ijsland': 'IS', 'izlandia': 'IS',
  'indien':              'IN', 'inde':                 'IN', 'india':         'IN', 'indie':          'IN', 'hindistan': 'IN', 'intia': 'IN',
  'indonesien':          'ID', 'indonésie':            'ID', 'indonesia':     'ID', 'indonezija':     'ID',
  'iran':                'IR',
  'irland':              'IE', 'irlande':              'IE', 'irlanda':       'IE', 'ierland':        'IE', 'irsko': 'IE', 'írország': 'IE',
  'israel':              'IL', 'israël':               'IL',
  'italien':             'IT', 'italie':               'IT', 'italia':        'IT', 'italië':         'IT', 'włochy': 'IT', 'itália': 'IT', 'italya': 'IT', 'itálie': 'IT', 'olaszország': 'IT',

  // ── J ──────────────────────────────────────────────────────────
  'jamaika':             'JM', 'jamaïque':             'JM', 'jamaica':       'JM',
  'japan':               'JP', 'japon':                'JP', 'japón':         'JP', 'giappone':       'JP', 'japonya': 'JP', 'japani': 'JP', 'japonsko': 'JP', 'japonia': 'JP',
  'jordanien':           'JO', 'jordanie':             'JO', 'jordania':      'JO',

  // ── K ──────────────────────────────────────────────────────────
  'kasachstan':          'KZ', 'kazakhstan':           'KZ',
  'kenia':               'KE', 'kenya':                'KE',
  'südkorea':            'KR', 'corée du sud':         'KR', 'corea del sur': 'KR', 'south korea':    'KR', 'korea': 'KR', 'corée': 'KR', 'güney kore': 'KR',
  'kuwait':              'KW',
  'kirgisistan':         'KG', 'kirghizistan':         'KG', 'kyrgyzstan':    'KG',

  // ── L ──────────────────────────────────────────────────────────
  'lettland':            'LV', 'lettonie':             'LV', 'letonia':       'LV', 'latvia':         'LV', 'letonya': 'LV', 'latvija': 'LV',
  'libanon':             'LB', 'liban':                'LB', 'líbano':        'LB', 'libano':         'LB',
  'litauen':             'LT', 'lituanie':             'LT', 'lituania':      'LT', 'lituânia':       'LT', 'litvanya': 'LT', 'liettua': 'LT', 'litva': 'LT', 'lietuva': 'LT',
  'luxemburg':           'LU', 'luxembourg':           'LU', 'lussemburgo':   'LU',

  // ── M ──────────────────────────────────────────────────────────
  'malaysia':            'MY', 'malaisie':             'MY', 'malasia':       'MY',
  'malta':               'MT',
  'mexiko':              'MX', 'mexique':              'MX', 'méxico':        'MX', 'messico':        'MX', 'meksika': 'MX', 'meksiko': 'MX',
  'moldau':              'MD', 'moldavie':             'MD', 'moldova':       'MD',
  'mongolei':            'MN', 'mongolie':             'MN', 'mongolia':      'MN',
  'marokko':             'MA', 'maroc':                'MA', 'marruecos':     'MA', 'marocco':        'MA', 'fas': 'MA', 'morocco': 'MA',

  // ── N ──────────────────────────────────────────────────────────
  'nepal':               'NP',
  'niederlande':         'NL', 'pays-bas':             'NL', 'países bajos':  'NL', 'paesi bassi':    'NL', 'nederland': 'NL', 'holandia': 'NL', 'países baixos': 'NL', 'hollanda': 'NL', 'alankomaat': 'NL', 'nizozemsko': 'NL', 'hollandia': 'NL',
  'neuseeland':          'NZ', 'nouvelle-zélande':     'NZ', 'nueva zelanda': 'NZ', 'new zealand':    'NZ', 'uusi-seelanti': 'NZ',
  'nigeria':             'NG',
  'nordmazedonien':      'MK', 'macédoine du nord':    'MK', 'norte de macedonia': 'MK',
  'norwegen':            'NO', 'norvège':              'NO', 'noruega':       'NO', 'norvegia':       'NO', 'noorwegen': 'NO', 'norwegia': 'NO', 'norja': 'NO', 'norsko': 'NO', 'norvégia': 'NO',

  // ── O ──────────────────────────────────────────────────────────
  'oman':                'OM',

  // ── P ──────────────────────────────────────────────────────────
  'pakistan':            'PK',
  'panama':              'PA',
  'paraguay':            'PY',
  'peru':                'PE', 'pérou':                'PE', 'perù':          'PE',
  'philippinen':         'PH', 'philippines':          'PH', 'filipinas':     'PH', 'filippijnen':    'PH', 'filipinler': 'PH',
  'polen':               'PL', 'pologne':              'PL', 'polonia':       'PL', 'polska':         'PL', 'polsko': 'PL', 'lengyelország': 'PL',
  'portugal':            'PT', 'portogallo':           'PT',

  // ── Q ──────────────────────────────────────────────────────────
  'katar':               'QA', 'qatar':                'QA',

  // ── R ──────────────────────────────────────────────────────────
  'rumänien':            'RO', 'roumanie':             'RO', 'rumanía':       'RO', 'romania':        'RO', 'roemenië': 'RO', 'rumunia': 'RO', 'romanya': 'RO', 'románia': 'RO',
  'russland':            'RU', 'russie':               'RU', 'rusia':         'RU', 'russia':         'RU', 'rusland': 'RU', 'rosja': 'RU', 'rússia': 'RU', 'rusya': 'RU', 'venäjä': 'RU', 'rusko': 'RU', 'oroszország': 'RU',

  // ── S ──────────────────────────────────────────────────────────
  'saudi-arabien':       'SA', 'arabie saoudite':      'SA', 'arabia saudita': 'SA', 'saudi-arabië':  'SA', 'suudi arabistan': 'SA', 'saudi arabia': 'SA',
  'senegal':             'SN',
  'serbien':             'RS', 'serbie':               'RS', 'serbia':        'RS',
  'singapur':            'SG', 'singapour':            'SG', 'singapore':     'SG',
  'slowakei':            'SK', 'slovaquie':            'SK', 'eslovaquia':    'SK', 'slovakia':       'SK', 'slovensko': 'SK', 'szlovákia': 'SK',
  'slowenien':           'SI', 'slovénie':             'SI', 'eslovenia':     'SI', 'slovenia':       'SI', 'slovenija': 'SI', 'szlovénia': 'SI',
  'südafrika':           'ZA', 'afrique du sud':       'ZA', 'sudáfrica':     'ZA', 'south africa':   'ZA', 'sydafrika': 'ZA', 'güney afrika': 'ZA',
  'spanien':             'ES', 'espagne':              'ES', 'españa':        'ES', 'spagna':         'ES', 'spanje': 'ES', 'hiszpania': 'ES', 'espanha': 'ES', 'ispanya': 'ES', 'espanja': 'ES', 'španělsko': 'ES', 'spanyolország': 'ES',
  'sri lanka':           'LK',
  'schweden':            'SE', 'suède':                'SE', 'suecia':        'SE', 'svezia':         'SE', 'zweden': 'SE', 'szwecja': 'SE', 'suécia': 'SE', 'isveç': 'SE', 'ruotsi': 'SE', 'sverige': 'SE', 'švédsko': 'SE', 'svédország': 'SE',
  'schweiz':             'CH', 'suisse':               'CH', 'suiza':         'CH', 'svizzera':       'CH', 'zwitserland': 'CH', 'szwajcaria': 'CH', 'suíça': 'CH', 'isviçre': 'CH', 'sveitsi': 'CH', 'švýcarsko': 'CH', 'svájc': 'CH',

  // ── T ──────────────────────────────────────────────────────────
  'taiwan':              'TW',
  'tansania':            'TZ', 'tanzanie':             'TZ', 'tanzania':      'TZ',
  'thailand':            'TH', 'thaïlande':            'TH', 'tailandia':     'TH', 'tayland':        'TH', 'thaimaa': 'TH', 'thajsko': 'TH',
  'tunesien':            'TN', 'tunisie':              'TN', 'túnez':         'TN', 'tunisia':        'TN', 'tunus': 'TN',
  'türkei':              'TR', 'turquie':              'TR', 'turquía':       'TR', 'turchia':        'TR', 'turkije': 'TR', 'turcja': 'TR', 'turquia': 'TR', 'türkiye': 'TR', 'turkki': 'TR', 'turecko': 'TR', 'törökország': 'TR',

  // ── U ──────────────────────────────────────────────────────────
  'ukraine':             'UA', 'ucrania':              'UA', 'ucraina':       'UA', 'oekraïne':       'UA', 'ukraina': 'UA', 'ukrayna': 'UA',
  'vereinigte arabische emirate': 'AE', 'émirats arabes unis': 'AE', 'emiratos árabes unidos': 'AE', 'emirati arabi uniti': 'AE', 'vae': 'AE', 'uae': 'AE', 'dubai': 'AE', 'abu dhabi': 'AE',
  'vereinigtes königreich': 'GB', 'royaume-uni':       'GB', 'reino unido':   'GB', 'regno unito':    'GB', 'verenigd koninkrijk': 'GB', 'wielka brytania': 'GB', 'birleşik krallık': 'GB', 'iso-britannia': 'GB', 'spojené království': 'GB', 'egyesült királyság': 'GB', 'uk': 'GB', 'england': 'GB', 'großbritannien': 'GB', 'britain': 'GB',
  'usa':                 'US', 'united states':        'US', 'états-unis':    'US', 'estados unidos': 'US', 'stati uniti': 'US', 'verenigde staten': 'US', 'stany zjednoczone': 'US', 'amerikan yhdysvallat': 'US', 'spojené státy': 'US', 'america': 'US',
  'usbekistan':          'UZ', 'ouzbékistan':          'UZ', 'uzbekistán':    'UZ', 'uzbekistan':     'UZ',

  // ── V ──────────────────────────────────────────────────────────
  'vietnam':             'VN', 'viêt nam':             'VN',

  // ── Z ──────────────────────────────────────────────────────────
  'simbabwe':            'ZW', 'zimbabwe':             'ZW',

  // ── English names commonly missing above (no duplicates) ────────
  'germany':     'DE', 'spain':        'ES', 'italy':       'IT',
  'greece':      'GR', 'switzerland':  'CH', 'netherlands': 'NL', 'belgium':     'BE',
  'ireland':     'IE', 'poland':       'PL',
  'sweden':      'SE', 'norway':       'NO',
  'iceland':     'IS', 'hungary':      'HU',
  'czechia':     'CZ',
  'turkey':      'TR', 'mexico':       'MX',
  'brazil':      'BR', 'argentina':    'AR',
};

/**
 * Maps localised region names → virtual region codes stored in DB.
 * Covers all shop languages.
 */
export const REGION_ALIASES: Record<string, string> = {
  // ── Europe / EU ────────────────────────────────────────────────
  'europa':              'EU', 'europe':               'EU', 'europe travel':   'EU',
  'eu':                  'EU', 'european':             'EU', 'europäisch':      'EU',
  'europe esim':         'EU', 'europa esim':          'EU',
  'europe (30+)':        'EU', 'europa (30+)':         'EU',
  'avrupa':              'EU', 'europe multi':         'EU',

  // ── Asia / AS ──────────────────────────────────────────────────
  'asien':               'AS', 'asia':                 'AS', 'asie':            'AS',
  'asya':                'AS', 'ásia':                 'AS', 'azja':            'AS',
  'ázsia':               'AS', 'asien esim':           'AS', 'asia esim':       'AS',

  // ── Southeast Asia / SEA ───────────────────────────────────────
  'südostasien':         'SEA', 'southeast asia':      'SEA', 'asie du sud-est': 'SEA',
  'sudeste asiatico':    'SEA', 'asie sud-est':        'SEA', 'güneydoğu asya':  'SEA',

  // ── Middle East / ME ───────────────────────────────────────────
  'naher osten':         'ME', 'middle east':          'ME', 'moyen-orient':    'ME',
  'oriente medio':       'ME', 'medio oriente':        'ME', 'orta doğu':       'ME',
  'midden-oosten':       'ME', 'bliski wschód':        'ME', 'oriente médio':   'ME',

  // ── North America / NA ─────────────────────────────────────────
  'nordamerika':         'NA', 'north america':        'NA', 'amérique du nord': 'NA',
  'norteamérica':        'NA', 'america del nord':     'NA', 'noord-amerika':    'NA',
  'ameryka północna':    'NA', 'kuzey amerika':        'NA',

  // ── Latin America / LA ─────────────────────────────────────────
  'lateinamerika':       'LA', 'latin america':        'LA', 'amérique latine':  'LA',
  'latinoamérica':       'LA', 'amérique centrale':    'LA', 'america latina':   'LA',
  'latijns-amerika':     'LA', 'ameryka łacińska':     'LA',

  // ── Oceania / OC ───────────────────────────────────────────────
  'ozeanien':            'OC', 'oceania':              'OC', 'océanie':          'OC',
  'oceanía':             'OC', 'okyanusya':            'OC',

  // ── Africa / AF ────────────────────────────────────────────────
  'afrika':              'AF', 'africa':               'AF', 'afrique':          'AF',
  'áfrica':              'AF', 'afrique sub':          'AF',

  // ── Global / GLOB ──────────────────────────────────────────────
  'global':              'GLOB', 'worldwide':          'GLOB', 'weltweit':        'GLOB',
  'international':       'GLOB', 'international esim': 'GLOB',
};

/**
 * Given a search query, return all ISO country codes whose aliases match (prefix or substring).
 */
export function aliasesToCodes(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const codes = new Set<string>();
  for (const [alias, code] of Object.entries(COUNTRY_ALIASES)) {
    if (alias.startsWith(q) || alias.includes(q)) {
      codes.add(code.toUpperCase());
    }
  }
  return Array.from(codes);
}

/**
 * Given a search query, return all virtual region codes whose aliases match (prefix or substring).
 */
export function aliasesToRegions(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const regions = new Set<string>();
  for (const [alias, code] of Object.entries(REGION_ALIASES)) {
    if (alias.startsWith(q) || alias.includes(q)) {
      regions.add(code.toUpperCase());
    }
  }
  return Array.from(regions);
}

/**
 * Given a search query, return the ISO country code it maps to (or null).
 * Handles case-insensitive matching.
 */
export function aliasToCode(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Prefer exact match first
  if (COUNTRY_ALIASES[q]) return COUNTRY_ALIASES[q];
  const list = aliasesToCodes(query);
  return list.length > 0 ? list[0] : null;
}

/**
 * Given a search query, return the virtual region code it maps to (or null).
 * E.g. "Europa" → "EU", "Asien" → "AS".
 */
export function aliasToRegion(query: string): string | null {
  const q = query.trim().toLowerCase();
  if (!q) return null;
  // Prefer exact match first
  if (REGION_ALIASES[q]) return REGION_ALIASES[q];
  const list = aliasesToRegions(query);
  return list.length > 0 ? list[0] : null;
}
