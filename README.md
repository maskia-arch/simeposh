# 📡 eSIM Shop

Ein vollständiger, produktionsbereiter eSIM-Webshop gebaut mit **Next.js 14**, **Supabase** und **Tailwind CSS**.

---

## Schnellstart (lokal)

```bash
# 1. Abhängigkeiten installieren
npm install

# 2. Umgebungsvariablen anlegen
cp .env.example .env.local
# → .env.local mit deinen echten Werten füllen

# 3. Supabase-Schema anlegen
#    Öffne supabase/migrations/001_initial_schema.sql
#    und führe es im Supabase SQL Editor aus.

# 4. Entwicklungsserver starten
npm run dev
# → http://localhost:3000
```

---

## Architektur

```
app/
├── api/
│   ├── cron/sync-tariffs/ GET  – Täglicher Tarif-Sync von esimaccess
│   ├── crypto/            POST – Krypto-Checkout & Sessions
│   ├── health/            GET  – Health-Check für Render
│   ├── topup/packages/    GET  – Top-Up Pakete für eine ICCID
│   └── order/             GET  – Bestellstatus-API
├── auth/callback/         Supabase E-Mail-Bestätigung
├── dashboard/             Kunden-Dashboard (geschützt)
├── login/ register/       Auth-Seiten
├── success/               Post-Checkout Erfolgsseite mit eSIM-Daten
├── tariffs/               Alle Tarife
└── topup/                 eSIM Aufladefunktion

lib/
├── esimaccess/            esimaccess API-Client + Typen
├── crypto/                Blockchain-Watcher (BTC, LTC, ETH, SOL)
├── email/                 Nodemailer + HTML-E-Mail-Templates
├── supabase/              Client/Server/Service-Role Supabase-Clients
└── pricing.ts             Preisformel: EK_USD × 2 × Rate → x.x9 runden
```

---

## Preisformel

```
Verkaufspreis = roundToX9(EK_USD × 2 × USD_EUR_Rate)
```

Rundung auf x.x9 €: z.B. 4,12 € → 4,19 € | 4,21 € → 4,29 €

---

## Deployment auf Render

1. Repository auf GitHub pushen
2. Neues **Web Service** auf [render.com](https://render.com) erstellen
3. Alle Umgebungsvariablen aus `.env.example` im Render-Dashboard eintragen
4. **Cron Job** für den täglichen Tarif-Sync anlegen (siehe `render.yaml`)

> ⚠️ Niemals `.env.local` oder echte Secrets in Git committen!

---

## Umgebungsvariablen

Alle erforderlichen Variablen sind in `.env.example` dokumentiert. In der Produktion werden sie **ausschließlich** im Render-Dashboard hinterlegt.

| Variable | Beschreibung |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon-Key (öffentlich) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-Role-Key (nur Server!) |
| `ESIMACCESS_API_URL` | esimaccess API Basis-URL |
| `ESIMACCESS_ACCESS_CODE` | esimaccess Access Code |
| `SMTP_*` | SMTP-Konfiguration für E-Mails |
| `CRON_SECRET` | Schützt den Cron-Endpoint vor unbefugtem Zugriff |

---

## Sicherheitsmerkmale

- **Crypto Watcher**: Eingehende Blockchain-Zahlungen werden via On-Chain-Watcher sicher und automatisiert mit den ausstehenden Bestellungen abgeglichen.
- **RLS**: Supabase Row-Level Security – Kunden sehen nur ihre eigenen Bestellungen
- **Keine Hardcoded Secrets**: Alle Credentials laufen über `process.env`
- **Service Role**: Wird nur in serverseitigen Contexts (Watcher, Cron) verwendet
- **Security Headers**: X-Frame-Options, CSP, Referrer-Policy in `next.config.ts`
