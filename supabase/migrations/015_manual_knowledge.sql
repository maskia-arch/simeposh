-- ============================================================
-- eSIM Shop – KI-Wissensdatenbank & Konfliktprüfung Migration
-- ============================================================

-- Create manual_knowledge table
CREATE TABLE IF NOT EXISTS public.manual_knowledge (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  value       TEXT NOT NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add conflict_details column to posts
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS conflict_details TEXT;

-- Enable RLS
ALTER TABLE public.manual_knowledge ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (view all knowledge entries)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='manual_knowledge' AND policyname='manual_knowledge_public_read') THEN
    CREATE POLICY "manual_knowledge_public_read" ON public.manual_knowledge FOR SELECT
      USING (true);
  END IF;
END $$;

-- Insert default guidelines into manual_knowledge if they don't exist
INSERT INTO public.manual_knowledge (key, value, description)
VALUES 
  ('brand_name', 'PureSim', 'Der offizielle Markenname des Unternehmens, der in Artikeln verwendet werden soll.'),
  ('product_offer', 'Wir bieten ausschließlich reine "Data-only eSIMs" an (keine Telefonnummern enthalten, reine mobile Reisedatenpakete). Klassische Anrufe oder SMS sind nicht möglich, Telefonie über Apps wie WhatsApp, Skype oder FaceTime funktioniert jedoch problemlos.', 'Details zum eSIM-Produktangebot.'),
  ('activation', 'Die Aktivierung erfolgt in wenigen Minuten per QR-Code (per E-Mail zugestellt) oder manueller Eingabe der SM-DP+-Adresse und des Aktivierungscodes in den Smartphone-Einstellungen. Es ist zwingend eine aktive Internetverbindung (WLAN oder Mobil) für die Aktivierung erforderlich.', 'Wie die eSIM-Aktivierung abläuft.'),
  ('topup', 'Alle aufladbaren Tarife können direkt auf unserer Website unter "Aufladen" (Top-Up) in Sekunden nachgebucht werden, indem der Nutzer seine ICCID eingibt.', 'Informationen zur Aufladbarkeit.'),
  ('esim_cash', 'Wir bieten ein Cashback- und Empfehlungsprogramm namens "eSIM Cash" (bis zu 15 % Guthaben-Cashback bei jedem Kauf und Cashback-Tickets für erfolgreiche Freundschaftswerbungen).', 'Details zum Cashback- und Empfehlungsprogramm.'),
  ('tonality', 'Kompetent, einladend, verständlich, locker, zielgruppenorientiert (für Reisende, Urlauber und Geschäftsleute).', 'Vorgegebene Tonalität für die Artikel.')
ON CONFLICT (key) DO NOTHING;
