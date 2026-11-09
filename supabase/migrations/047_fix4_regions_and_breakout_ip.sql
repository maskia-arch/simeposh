-- Migration 047: Fix 4 Central Region Keys, North America Recovery, and Normalized Breakout IP
-- Idempotent, backwards-compatible, no drops

-- 1. Region Guards: Update legacy / misattributed region codes
-- NA (North America vs Namibia)
UPDATE public.tariffs
SET country_code = 'NORTH_AMERICA',
    region = 'North America'
WHERE country_code = 'NA'
  AND (
    name ILIKE '%north america%'
    OR name ILIKE '%usa & canada%'
    OR name ILIKE '%us & canada%'
    OR region ILIKE '%north america%'
    OR region ILIKE '%usa & canada%'
    OR (location_codes @> ARRAY['US', 'CA']::text[])
  );

-- EU -> EUROPE
UPDATE public.tariffs
SET country_code = 'EUROPE',
    region = 'Europe'
WHERE country_code = 'EU';

-- OC -> OCEANIA
UPDATE public.tariffs
SET country_code = 'OCEANIA',
    region = 'Oceania'
WHERE country_code = 'OC';

-- 2. Breakout IP: Strict normalization to 2 uppercase letters (ISO alpha-2), or NULL
UPDATE public.tariffs
SET breakout_ip = CASE
  WHEN UPPER(TRIM(raw_data->>'ipExport')) ~ '^[A-Z]{2}$' THEN UPPER(TRIM(raw_data->>'ipExport'))
  ELSE NULL
END;

-- Clean any non-alpha-2 entries that may linger in breakout_ip
UPDATE public.tariffs
SET breakout_ip = NULL
WHERE breakout_ip IS NOT NULL AND breakout_ip !~ '^[A-Z]{2}$';

-- 3. Update Sync Guard Trigger Function
CREATE OR REPLACE FUNCTION public.enforce_tariff_sync_guards()
RETURNS TRIGGER AS $$
BEGIN
  -- AS vs ASIA guard
  IF NEW.country_code = 'AS' AND (NEW.region ILIKE '%asia%' OR NEW.name ILIKE '%asia%') THEN
    NEW.country_code := 'ASIA';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Asia';
    END IF;
  END IF;

  -- LA vs LATAM guard
  IF (NEW.country_code = 'LA' OR NEW.country_code = 'LAOS') AND (NEW.name ILIKE '%south america%' OR NEW.name ILIKE '%latin america%' OR NEW.region ILIKE '%latin%') THEN
    NEW.country_code := 'LATAM';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Latin America';
    END IF;
  END IF;

  -- AF vs AFRICA guard
  IF (NEW.country_code = 'AF' OR NEW.country_code = 'GLOB') AND (NEW.name ILIKE '%africa%' OR NEW.region ILIKE '%africa%') THEN
    NEW.country_code := 'AFRICA';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Africa';
    END IF;
  END IF;

  -- ME vs MIDDLE_EAST guard
  IF NEW.country_code = 'ME' AND (NEW.name ILIKE '%middle east%' OR NEW.name ILIKE '%gulf%' OR NEW.name ILIKE '%gcc%' OR NEW.region ILIKE '%middle%' OR NEW.region ILIKE '%gulf%' OR NEW.region ILIKE '%gcc%') THEN
    NEW.country_code := 'MIDDLE_EAST';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Middle East';
    END IF;
  END IF;

  -- NA vs NORTH_AMERICA guard
  IF (NEW.country_code = 'NA' OR NEW.country_code = 'NORTH_AMERICA') AND (
    NEW.name ILIKE '%north america%' OR NEW.name ILIKE '%usa & canada%' OR NEW.name ILIKE '%us & canada%'
    OR NEW.region ILIKE '%north america%' OR NEW.region ILIKE '%usa & canada%'
    OR (NEW.location_codes @> ARRAY['US', 'CA']::text[])
  ) THEN
    NEW.country_code := 'NORTH_AMERICA';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'North America';
    END IF;
  END IF;

  -- EU vs EUROPE guard
  IF NEW.country_code = 'EU' THEN
    NEW.country_code := 'EUROPE';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Europe';
    END IF;
  END IF;

  -- OC vs OCEANIA guard
  IF NEW.country_code = 'OC' THEN
    NEW.country_code := 'OCEANIA';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Oceania';
    END IF;
  END IF;

  -- Breakout IP normalization
  IF NEW.breakout_ip IS NOT NULL THEN
    IF NEW.breakout_ip ~ '^[A-Za-z]{2}$' THEN
      NEW.breakout_ip := UPPER(TRIM(NEW.breakout_ip));
    ELSE
      NEW.breakout_ip := NULL;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tariff_sync_guards ON public.tariffs;
CREATE TRIGGER trg_tariff_sync_guards
BEFORE INSERT OR UPDATE OF country_code, name, region, breakout_ip ON public.tariffs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tariff_sync_guards();
