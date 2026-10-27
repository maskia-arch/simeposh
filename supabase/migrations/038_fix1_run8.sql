-- Migration: 038_fix1_run8.sql
-- Fix 1 zu Run 8: Setup-Token, Travel Premium, Dubletten-Ausblendung, Laos/Lateinamerika-Trennung und Supplier-Tags

-- 1. Orders: Setup-Token für sichere und undurchsichtige Einrichtungslinks (/s/<token>)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS setup_token TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_orders_setup_token ON public.orders(setup_token);

-- Bestehende Bestellungen mit sicherem Zufallstoken ausstatten
UPDATE public.orders
SET setup_token = md5(random()::text || id::text || clock_timestamp()::text)
WHERE setup_token IS NULL;

-- 2. Tariffs: Reversibles Ausblenden von Dubletten, Travel Premium Flag und internes Supplier-Tag
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS is_premium BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS is_premium_override BOOLEAN DEFAULT NULL;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS hidden_reason TEXT DEFAULT NULL;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS duplicate_of TEXT DEFAULT NULL;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS supplier_tag TEXT DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_tariffs_hidden_reason ON public.tariffs(hidden_reason);
CREATE INDEX IF NOT EXISTS idx_tariffs_duplicate_of ON public.tariffs(duplicate_of);
CREATE INDEX IF NOT EXISTS idx_tariffs_is_premium ON public.tariffs(is_premium);

-- 3. Laos und Lateinamerika trennen
-- 26 Laos-Tarife: Ländercode 'LA', Name 'Laos'
UPDATE public.tariffs
SET country_code = 'LA', country_name = 'Laos', region = NULL
WHERE is_active = true AND (country_code = 'LA' OR name ILIKE '%laos%')
  AND (name ILIKE '%laos%' OR (location_codes IS NOT NULL AND location_codes = ARRAY['LA']));

-- 25 Südamerika-Tarife: Region 'LATAM', Name 'Latin America'
UPDATE public.tariffs
SET country_code = 'LATAM', country_name = 'Latin America', region = 'Latin America'
WHERE is_active = true AND country_code = 'LA' AND name NOT ILIKE '%laos%';
