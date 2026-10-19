<USER_REQUEST>
# Fix 3 zu Run 6: Kein Rabatt bei 1 bis 3 Tagen, Preise auf /tariffs, türkische Formate, Pluralregeln, restliche Builder-Texte, feste Kartenhöhe, Cache und Admin

## 1. Ziel und Kontext
puresim.net ist ein eSIM-Shop (Next.js App Router, Tailwind, ausgeliefert über Cloudflare, 15 Sprachen, Bezahlung nur mit Krypto). Seit Fix 1 und Fix 2 gibt der Unlimited Builder den Staffelrabatt von eSIM Access 1:1 an die Kunden weiter. Alle Kundenpreise laufen über den gemeinsamen Preis-Helper (`lib/pricing.ts`, unter anderem `getDayPassPrice` und `getTariffMinCustomerPrice`).

Dieser Fix hat zwei Teile:
- **Neue Geschäftsregel:** Bei 1 bis 3 Tagen bekommen Kunden keinen Rabatt. Ab 4 Tagen gilt die Staffel wie bisher.
- **Reste aus der Live-Prüfung von Fix 2:** türkische Formate, sichtbarer Preis auf `/tariffs/{slug}`, fehlende Einzahl, fest eingetragene und englische Texte, Höhensprünge der Preiskarte, Cache auf `/tariffs`, Admin-Rückfall im Code.

Suche die betroffenen Dateien selbst. Bekannt sind unter anderem:
- `lib/pricing.ts`
- `components/UnlimitedConfigurator.tsx`
- `components/TariffCard.tsx`
- `lib/destinations.ts`
- `lib/tariffs.ts`
- `lib/sync/run-sync.ts`
- `app/esim/[country]/page.tsx` und `app/esim/[country]/CountryPageClient.tsx`
- `app/tariffs/[slug]/page.tsx` und `app/tariffs/page.tsx`
- `app/api/crypto/checkout/route.ts`
- `app/dashboard/page.tsx`
- `middleware.ts`
- `lib/i18n/translations/*.ts`
- `scripts/test_translations_hygiene.mjs`

## 2. Ist-Zustand (live geprüft am 19.10.2026)

### Bestanden, nicht anfassen
- Staffelrabatt ab 4 Tagen: Formel, Rundung auf den Cent und alle Sollwerte ab 4 Tagen (Tabelle in Abschnitt 7). Geprüft wurden 56.575 Tagespreise, Seite und API stimmen ohne Abweichung überein.
- Der Checkout rechnet den Preis auf dem Server. Preise aus dem Browser werden ignoriert, ungültige Laufzeiten abgelehnt, und der Test `scripts/test_checkout_server_pricing.ts` ist grün.
- Cache auf `/unlimited/*`, `/esim/*` und der Preis-API: `public, max-age=0, s-maxage=300`. `/cart`, `/checkout` und der Checkout-Endpunkt senden `no-store`.
- Finnisch zeigt „Porrasalennus“ ohne Fremdzeichen, der Trenner im Hinweis unter dem Schieberegler steht einfach.
- Badge, Tipp und Wechsel-Button gibt es in allen 15 Sprachen, und es stehen keine rohen Schlüssel auf der Seite.
- Bei 28 und 29 Tagen bleibt die Tipp-Zeile auf Deutsch und Englisch ruhig.
- Kein Leck: kein Einkaufspreis, USD-Wert, Faktor, Kurs, payRatio oder `raw_data` in 59 geprüften Quellen.
- Sitemaps (54.165 URLs), `robots.txt`, `llms.txt`, Canonicals, hreflang, Aufladezähler X/9 und die Whitelist von `/api/db-query`.

### Befunde für diesen Fix
1. **Neue Preisregel:** Heute bekommt auch die Laufzeit von 1 bis 3 Tagen die Stufe −4 % (1 Tag 0,57 €). Der „ab“-Preis steht deshalb auf 0,57 €. Marcel möchte bei 1 bis 3 Tagen keinen Rabatt.
2. **Türkisch:**
   - Das Badge und alle fünf Staffel-Pills zeigen das Prozentzeichen doppelt, zum Beispiel „Kademeli indirim −%11%“ und „−%4%“ bis „−%18%“. Das steht schon im Server-HTML.
   - Im Preisblock steht das € doppelt („€0,57 €“).
3. **Preis auf `/tariffs/{slug}`:** Sichtbar steht der Frontpreis 0,59 €, im JSON-LD `Offer.price` dagegen 0.57. Das gilt in allen 15 Sprachen und in 8 von 8 Stichproben, unabhängig vom Cache. Der sichtbare Preis kommt nicht aus dem Helper.
4. **`/unlimited/germany`:** Die Seite zeigt gleichzeitig „Startpreis ab 0,57 €“ und „Tagespreis ab 0,59 € / Tag“.
5. **JSON-LD auf `/esim/germany`:** Im Feld `description` steht „Highspeed-Daten ab 0.57“, mit Punkt und ohne €.
6. **Cache auf `/tariffs`:** `/tariffs` und `/tariffs/*` ohne Sprachpräfix senden `public, max-age=14400, s-maxage=300` und kommen als HIT aus dem Cloudflare-Cache. `/en/tariffs` und `/fi/tariffs` senden korrekt `max-age=0`. Das Team vermutet eine Cloudflare-Cache-Regel für genau diesen Pfad, belegt ist es nicht.
7. **Einzahl im Tipp fehlt:** In 13 Sprachen steht zum Beispiel „1 Tage“, „1 more days“, „1 jours“ oder „1 dni“. Im Rumänischen ist der Satz zusätzlich ungrammatisch („pentru cu“).
8. **Fest eingetragene oder englische Texte im Builder:**
   - „🔍 Zielgebiet ändern“ steht in allen 14 anderen Sprachen auf Deutsch.
   - Das Land heißt in allen Sprachen „Germany“, auch auf Deutsch.
   - Die Laufzeit-Chips zeigen „1d“ und „3d“.
   - In der Formelzeile ist ein Prozentwert fest eingetragen, zum Beispiel „− 15 %“.
   - Der Trenner am Kauf-Button ist uneinheitlich („Sofort kaufen ·0,57 €“).
   - Die Plan-Texte („Daily high-speed allowance, then unlimited at 512 kbps“, „… ≥ 1 Mbps“) und der Hinweis zur Datenerneuerung sind in cs, fi, hu, pl, pt, ro, sv und tr noch englisch.
   - Im Französischen steht „10 Jours“ statt „10 jours“.
9. **Meta auf `/tariffs/{slug}`:** Die Meta-Beschreibung ist in 13 Sprachen eine englische Vorlage, und der Titel ist englisch („Germany 500MB/Day“).
10. **Höhe der Preiskarte:**
    - Desktop, Deutsch: Bei 28 und 29 Tagen ist die Karte 466,5 px hoch, bei 30 Tagen ohne Tipp nur 452,5 px. „Warenkorb“ springt dabei um 14 px nach oben.
    - 390 px: In fi und pl springt die Seite bei 30 Tagen um 16,5 px nach unten, in es und pt ab 30 Tagen um 16,5 px nach oben. Ursache ist eine andere Builder-Zeile, die neu umbricht.
    - Finnisch: Die Feature-Tags brechen um („Kertakäyttöinen“), die Karte wird 478 px hoch.
11. **Hygiene-Test zu schwach:** `scripts/test_translations_hygiene.mjs` hat das doppelte Prozentzeichen, die fehlende Einzahl, die englischen Reste und die fest eingetragenen Texte nicht erkannt.
12. **Admin:**
    - Ist `unlimited_default_discount_rule` in `system_settings` nicht gesetzt, fällt `lib/sync/run-sync.ts` weiter fest auf `UNLIMITED_PLAN_DISC` zurück.
    - Das Warn-Banner im Dashboard nennt nur Ländernamen, keine Tarife.

## 3. Harte Vorgaben zur Preislogik
- Die interne Preislogik bleibt geheim und unverändert. Einkaufspreis, Faktor, Kurs, payRatio-Rohwerte und `raw_data` erscheinen nie im Frontend, in API-Antworten, im HTML, im JSON-LD oder in der Browser-Konsole.
- Der Frontpreis pro Tag (`frontCents`) endet weiter auf ,x9 und wird nicht verändert.
- **1 bis 3 Tage, neu:** Es gibt keinen Rabatt. Endpreis = Frontpreis × Tage, aufgerundet auf den nächsten Betrag mit ,x9 am Ende. Liegt der Betrag schon auf ,x9, bleibt er.
  - In Cent: `base = frontCents * days`, `x9 = Math.floor(base / 10) * 10 + 9`, `finalCents = x9 >= base ? x9 : x9 + 10`.
  - Beispiele bei 0,59 €/Tag: 0,59 €, 1,18 € → 1,19 €, 1,77 € → 1,79 €.
  - Beispiele bei 0,99 €/Tag: 0,99 €, 1,99 €, 2,99 €.
- **Ab 4 Tagen, unverändert:** Die Staffel von eSIM Access gilt 1:1, ohne ,x9-Rundung danach. `ratioBp = Math.round(payRatio * 10000)`, `finalCents = Math.floor((frontCents * days * ratioBp + 5000) / 10000)`. Für Tag 4 gilt die Stufe, in der Tag 4 liegt, heute 1–4 Tage mit −4 %.
- Die Grenze „Rabatt erst ab 4 Tagen“ steht an genau einer Stelle: als Admin-Einstellung `unlimited_discount_min_days`, Standardwert 4, nur auf dem Server gelesen. Fehlt der Wert, gilt 4.
- Diese Regel steckt ausschließlich im gemeinsamen Preis-Helper. Seite, Builder, Preis-API, Warenkorb, Checkout-Server, Aufladung (falls Laufzeiten dort gekauft werden), JSON-LD, Meta, OpenGraph, Tarifkarten und „ab“-Preise übernehmen sie automatisch. Nirgends sonst wird ein Kundenpreis berechnet.
- Travel-Tarife ohne Staffel bleiben unverändert.

## 4. Anforderungen

### 4.1 Preisregel 1 bis 3 Tage
- Baue die Regel aus Abschnitt 3 in den Helper ein. `getTariffMinCustomerPrice` liefert für Unlimited-Tarife danach den Preis für 1 Tag. Bei 0,59 €/Tag ist das 0,59 €.
- Preis-API `/api/tariffs/price-table?code=`:
  - Sie liefert für 1 bis 3 Tage die gerundeten Preise ohne Rabatt.
  - Die Stufen in der Antwort beginnen bei 4 Tagen, die erste Stufe zeigt also 4–4 Tage mit −4 %.
  - Die Antwort enthält keine payRatio-Rohwerte.
- **Anzeige im Builder bei 1 bis 3 Tagen:**
  - Es gibt kein Rabatt-Badge, keine Rechnungszeile mit Rabatt und kein „Du sparst“.
  - Sichtbar ist nur der Endpreis, zum Beispiel 1,79 € für 3 Tage.
  - Der Tagespreis-Text zeigt den Frontpreis (0,59 € / Tag).
  - Die Höhe der Karte bleibt trotzdem gleich, siehe 4.6.
- **Hinweis unter dem Schieberegler:**
  - Bei 1 bis 3 Tagen lautet er sinngemäß „Rabatt ab 4 Tagen: −4 %“.
  - Ab 4 Tagen bleibt er wie heute („4 % Rabatt inklusive · ab 5 Tagen sogar 8 %“).
  - Die Prozentwerte kommen aus den Sync-Stufen, nicht fest aus dem Code.
- **Staffel-Chips:** Der erste Chip zeigt die tatsächliche Spanne ab der Mindestlaufzeit, also „4 Tage −4 %“ statt „1–4 Tage“. Die Zahlen kommen aus den Stufen und aus `unlimited_discount_min_days`.
- **Tipp für die günstigere Laufzeit:** Er rechnet weiter über den Helper. Er erscheint nur, wenn eine längere Laufzeit tatsächlich weniger kostet. Mit der neuen Regel darf bei 3 Tagen kein falscher Tipp auf 4 Tage erscheinen (1,79 € gegen 2,27 €).
- **„ab“-Preise:** Auf `/unlimited/*`, `/esim/*`, `/tariffs`, `/tariffs/{slug}` sowie in Meta, OpenGraph und `llms.txt` steht danach überall „ab 0,59 €“ (bei 0,59 €/Tag). Im JSON-LD stehen `lowPrice`, `minPrice` und `Offer.price` jeweils auf 0.59. Das gilt für alle Länder und alle 15 Sprachen, zum Beispiel DE, ES, IT und TR.
- **`/unlimited/germany`:** „Startpreis ab …“ und „Tagespreis ab … / Tag“ widersprechen sich nicht mehr. Bei 0,59 €/Tag zeigen beide 0,59 €.

### 4.2 Sichtbarer Preis auf `/tariffs/{slug}` und JSON-LD-Texte
- Der sichtbare Preis auf `/tariffs/{slug}` und in der `/tariffs`-Übersicht kommt aus demselben Helper wie `Offer.price`. Sichtbarer Preis und JSON-LD-Preis sind auf jeder Seite identisch.
- Prüfe alle Textfelder im JSON-LD (`description`, `name` und weitere) sowie Meta und OpenGraph auf eingebettete Preise. Preise in Texten sind lokalisiert und haben die Währung, zum Beispiel „ab 0,59 €“ auf Deutsch und „from €0.59“ auf Englisch.
- Nur die Felder `price`, `lowPrice` und `minPrice` bleiben maschinenlesbar, mit Punkt und zwei Nachkommastellen, plus `priceCurrency` „EUR“.
- Titel und Meta-Beschreibung von `/tariffs/{slug}` werden in allen 15 Sprachen übersetzt. Nutze dafür Übersetzungsschlüssel mit Platzhaltern für Land, Datenmenge und Preis. Ländernamen kommen lokalisiert, siehe 4.4.

### 4.3 Türkische und allgemeine Zahlenformate
- Im Türkischen steht das Prozentzeichen vor der Zahl, und zwar genau einmal: „Kademeli indirim −%11“, die Pills „−%4“ bis „−%18“.
- Setze Prozentwerte möglichst mit `Intl.NumberFormat(locale, { style: 'percent' })` oder mit einem Schlüssel pro Sprache, der genau einen Platzhalter und genau ein Prozentzeichen enthält. Kein Übersetzungstext enthält ein eigenes `%` neben einem Platzhalter, der schon ein `%` liefert.
- Beträge kommen immer komplett aus `Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' })`. Übersetzungstexte enthalten kein eigenes „€“ neben einem Betrags-Platzhalter. Damit verschwindet „€0,57 €“.
- Diese Regel gilt in allen 15 Sprachen. Prüfe dabei auch Badge, Pills, Formelzeile, „Du sparst“, Tipp, Kauf-Button und Tarifkarten.

### 4.4 Pluralregeln und restliche Texte
- **Pluralregeln:**
  - Führe für alle Texte mit Tagesangaben echte Pluralformen ein: Tipp, Wechsel-Button, Chips, Laufzeit, Rechnungszeile und Tarifkarten.
  - Nutze `Intl.PluralRules(locale)` mit den Kategorien der jeweiligen Sprache, zum Beispiel `one` und `other`, für Polnisch und Tschechisch auch `few` und `many`.
  - Danach steht „1 Tag“, „1 day“, „1 jour“ und „1 dzień“, aber „2 dni“ und „5 dni“.
- **Rumänisch:** Formuliere den Tipp grammatisch korrekt neu, ohne „pentru cu“.
- **„🔍 Zielgebiet ändern“:** Als Übersetzungsschlüssel in allen 15 Sprachen.
- **Ländername:**
  - Er wird in der jeweiligen Sprache angezeigt, zum Beispiel „Deutschland“, „Germany“ oder „Saksa“.
  - Nutze dafür die vorhandenen Länderübersetzungen des Projekts. Gibt es keine, nimm `Intl.DisplayNames(locale, { type: 'region' })` mit dem ISO-Code.
  - Das gilt im Builder, in den Titeln und in der Meta von `/tariffs/{slug}`.
- **Laufzeit-Chips:** Statt „1d“ und „3d“ steht eine lokalisierte Angabe, zum Beispiel „1 Tag“ oder „3 Tage“. Bei Platzmangel nimm eine übersetzte Kurzform pro Sprache, nie das englische „d“.
- **Formelzeile:** Der Prozentwert kommt aus der aktuellen Stufe, nie fest aus dem Code.
- **Kauf-Button:** Ein einheitlicher Trenner mit Leerzeichen auf beiden Seiten: „Sofort kaufen · 0,57 €“. Das Muster gilt in allen Sprachen gleich.
- **Plan-Texte und Hinweis zur Datenerneuerung:** In cs, fi, hu, pl, pt, ro, sv und tr übersetzen. Prüfe dabei alle 15 Sprachen.
- **Französisch:** „jours“ klein, also „10 jours“. Prüfe die Groß- und Kleinschreibung der Einheiten in allen Sprachen.
- Diese Eigennamen bleiben in allen Sprachen unübersetzt: Unlimited Builder, Travel, Travel Premium, Unlimited Eco, Unlimited Pro, „Unlimited eSIM {Land}“. Das Land darin wird lokalisiert.

### 4.5 Hygiene-Test erweitern
Erweitere `scripts/test_translations_hygiene.mjs`, oder lege einen zweiten Test an, um diese Prüfungen:
- **Prozentzeichen:** Kein Text enthält zwei Prozentzeichen um einen Platzhalter herum, also kein `%{pct}%` und kein `−%…%`.
- **Währung:** Kein Text enthält „€“ neben einem Betrags-Platzhalter.
- **Pluralregeln:** Jeder Schlüssel mit Tagesangabe hat alle Pluralkategorien, die `Intl.PluralRules` für die Sprache liefert. Für 1 Tag ergibt sich in jeder Sprache die Einzahl.
- **Englische Reste:**
  - Builder-, Plan- und Meta-Schlüssel sind in keiner Sprache außer Englisch wortgleich mit dem englischen Wert.
  - Bekannte englische Fragmente wie „Daily high-speed“, „more days“, „Germany“ oder „1d“ kommen außerhalb von en nicht vor.
  - Eine kurze Ausnahmeliste für Eigennamen ist erlaubt.
- **Deutsche Reste:** Bekannte deutsche Texte wie „Zielgebiet ändern“ oder „Staffelrabatt“ kommen außerhalb von de nicht vor.
- **Fest eingetragene Texte:** Eine Suche über `components/UnlimitedConfigurator.tsx`, `components/TariffCard.tsx` und die `/tariffs`-Seiten findet keine sichtbaren Texte außerhalb von `t()`. Erlaubt sind nur Eigennamen, Symbole und Emoji.
- **Preisgleichheit:** Für mindestens Deutschland 500 MB in de, en, tr und fi sind der sichtbare „ab“-Preis, `lowPrice` bzw. `Offer.price` und der Preis aus dem Helper gleich, auf `/esim/germany`, `/unlimited/germany` und einer Seite `/tariffs/{slug}`.
- Prüfe, dass jede neue Prüfung die heutigen Fehler findet. Füge die Fehler dafür kurz absichtlich ein und nimm sie danach wieder heraus.

### 4.6 Feste Höhe der Preiskarte
- Die Preiskarte im Builder hat in jedem Zustand dieselbe Höhe:
  - 1 bis 3 Tage ohne Badge und Rechnungszeile
  - ab 4 Tagen mit Badge und Rechnungszeile
  - mit und ohne Tipp
  - 30 Tage und mehr
- Reserviere dafür feste Plätze für Badge, Rechnungszeile, „Du sparst“ und Tipp. Ausgeblendete Elemente behalten ihren Platz, zum Beispiel über `visibility: hidden` oder eine feste Mindesthöhe, ohne dass Text abgeschnitten wird. Ausgeblendete Elemente sind für Screenreader nicht lesbar (`aria-hidden`). `role="status"` und `aria-live` am Tipp bleiben.
- Finde auch andere Zeilen, die je nach Laufzeit umbrechen. Ein Beispiel ist die Zeile, die bei 390 px in fi, pl, es und pt den Sprung von 16,5 px auslöst. Gib ihr eine feste Mindesthöhe oder einen stabilen Text.
- Die Feature-Tags im Finnischen dürfen umbrechen, die Karte springt dabei aber nicht. Alternativ bekommen sie eine kürzere Übersetzung, die passt.
- Ziel: Beim Wechsel zwischen 1, 3, 4, 28, 29, 30 und 31 Tagen bewegen sich die Kaufbuttons um 0 px. Prüfe das bei 390, 768 und 1280 px in allen 15 Sprachen.

### 4.7 Cache auf `/tariffs` ohne Sprachpräfix
- Prüfe im Code, warum `/tariffs` und `/tariffs/*` ohne Sprachpräfix `max-age=14400` senden, mit Sprachpräfix aber nicht. Die Stellen dafür sind `middleware.ts`, `next.config`-Header, Route-Segment-Konfiguration (`revalidate`, `dynamic`) und Weiterleitungen.
- Sorge dafür, dass der Code für alle `/tariffs`-Pfade, mit und ohne Präfix, `Cache-Control: public, max-age=0, s-maxage=300` setzt.
- Ändere keine Cloudflare-Einstellungen. Kommt der Wert nachweislich nicht aus dem Code, schreib das klar in den Bericht. Marcel prüft dann in Cloudflare unter Caching → Cache Rules eine Regel für `/tariffs*` oder die Browser-Cache-Dauer.

### 4.8 Admin
- **Kein fester Rückfall im Code:** Lege `unlimited_default_discount_rule` mit dem Wert `UNLIMITED_PLAN_DISC` per Migration oder Seed in `system_settings` an. Entferne den festen Rückfall auf `UNLIMITED_PLAN_DISC` aus `lib/sync/run-sync.ts`.
  - Fehlt die Einstellung, setzt der Sync keinen Standardcode und zeigt eine Warnung.
  - Ist sie leer, setzt er ebenfalls keinen Standardcode.
  - Die Prüfung gegen `discount_rules` bleibt.
- **Neue Einstellung:** `unlimited_discount_min_days` (Standard 4) aus Abschnitt 3, im Admin sichtbar und änderbar. Erlaubt sind ganze Zahlen von 1 bis 30. Nach einer Änderung werden die betroffenen Seiten neu erzeugt, wie nach einem Sync.
- **Warn-Banner im Dashboard:** Es nennt die Zahl der betroffenen Unlimited-Tarife und listet jeden Tarif mit Land, Tarifname bzw. Paketcode und Datenmenge auf, statt nur der Ländernamen. Bei vielen Einträgen ist die Liste einklappbar. Keine Einkaufspreise. Travel-Tarife lösen keine Warnung aus.

## 5. Einschränkungen
- Ändere nur, was dieser Fix verlangt. Alles unter „Bestanden, nicht anfassen“ bleibt, wie es ist.
- Nicht anfassen:
  - Staffelformel ab 4 Tagen
  - Frontpreis
  - Serverpreis-Logik im Checkout
  - Aufladezähler und Aufladesperre
  - Whitelist von `/api/db-query`
  - Sitemaps und Canonicals
- Diese Punkte gehören ausdrücklich nicht in diesen Fix, sie kommen später:
  - Canonical von `/ai`
  - Schriftgröße von „Du sparst“ und des Wechsel-Links
  - Wechsel-Link als Button und sein Kontrast
  - einheitliches Prozentformat auf Deutsch („−4 %“ gegen „−4%“), außer wo 4.3 es verlangt
  - Emoji ⚡ statt 🚫 im Builder
  - eigener Fokusring am Tipp-Button
  - Seitengröße von `/unlimited/*`
- Respektiere das bestehende Design-System: Tailwind-Klassen, Farben, Abstände und Komponenten. Keine neuen Abhängigkeiten, wenn es ohne geht.
- Keine echten Zahlungen. Jede Test-Session endet auf `cancelled`. Der Checkout bleibt reine Kryptozahlung.
- Kein Einkaufspreis, keine Formel, kein Faktor und kein Kurs in Frontend, API, HTML, JSON-LD oder Browser-Konsole.

## 6. Umsetzungsschritte
1. Bestandsaufnahme:
   - jede Stelle, die einen Kundenpreis zeigt oder berechnet
   - alle Texte mit Tagesangaben, Prozent und Betrag
   - fest eingetragene Texte im Builder und auf `/tariffs`
   - Quelle der Cache-Header für `/tariffs`
   - Sync- und Admin-Einstellungen
2. Den Hygiene-Test erweitern (4.5) und zeigen, dass er die heutigen Fehler findet.
3. Die Preisregel für 1 bis 3 Tage im Helper umsetzen und die Admin-Einstellung `unlimited_discount_min_days` anlegen (Abschnitt 3, 4.1, 4.8). Dazu einen Unit-Test mit der Tabelle aus Abschnitt 7 schreiben.
4. Den Builder an die neue Regel anpassen: Anzeige bei 1 bis 3 Tagen, Hinweis, Chips, Tipp.
5. Den sichtbaren Preis auf `/tariffs` und die Preise in JSON-LD-Texten, Meta und OpenGraph umstellen (4.2).
6. Formate für Prozent und Betrag korrigieren (4.3), danach Pluralregeln und restliche Texte (4.4).
7. Feste Höhe der Preiskarte umsetzen (4.6).
8. Cache auf `/tariffs` prüfen und im Code korrigieren (4.7).
9. Admin: Seed für die Standardregel, Rückfall entfernen, Banner mit Tarifliste (4.8).
10. Alle Tests laufen lassen, alte und neue. Danach Build, Prüfung im Browser und Leck-Suche.

## 7. Abnahmekriterien und Tests

### Preise
Diese Sollwerte gelten auf Seite, Builder, Preis-API, Warenkorb und Checkout-Server:

| Frontpreis | Tage | Endpreis | Ersparnis |
|---|---|---|---|
| 0,59 € | 1 | 0,59 € | keine |
| 0,59 € | 2 | 1,19 € | keine |
| 0,59 € | 3 | 1,79 € | keine |
| 0,59 € | 4 | 2,27 € | 0,09 € |
| 0,59 € | 5 | 2,71 € | 0,24 € |
| 0,59 € | 7 | 3,80 € | 0,33 € |
| 0,59 € | 10 | 5,25 € | 0,65 € |
| 0,59 € | 20 | 10,03 € | 1,77 € |
| 0,59 € | 29 | 14,54 € | 2,57 € (plus Tipp für 30 Tage) |
| 0,59 € | 30 | 14,51 € | 3,19 € |
| 0,99 € | 1 | 0,99 € | kei
</USER_REQUEST>
<ADDITIONAL_METADATA>
The current local time is: 2026-10-19T15:40:57+02:00.
</ADDITIONAL_METADATA>