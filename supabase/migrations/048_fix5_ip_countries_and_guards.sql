-- Migration 048: Fix 5 IP Countries Array, Multi-Country IP Routing, and Sync Guard Update
-- Idempotent, backwards-compatible, no drops

-- 1. Ensure ip_countries column exists
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS ip_countries text[];

-- 2. Update sync guard trigger function to allow multi-country breakout_ip and ip_countries
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

  -- Clean breakout_ip: trim whitespace, do not nullify multi-country strings
  IF NEW.breakout_ip IS NOT NULL THEN
    NEW.breakout_ip := TRIM(NEW.breakout_ip);
    IF NEW.breakout_ip = '' THEN
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

-- 3. Populate ip_countries from supplier raw_data->>'ipExport'
UPDATE public.tariffs
SET ip_countries = ARRAY(
  SELECT CASE WHEN upper(trim(x)) = 'EUROPE' THEN 'EU' ELSE upper(trim(x)) END
  FROM regexp_split_to_table(raw_data->>'ipExport', '[\/,]') x
  WHERE trim(x) != '' AND (upper(trim(x)) ~ '^[A-Z]{2}$' OR upper(trim(x)) = 'EUROPE')
)
WHERE raw_data->>'ipExport' IS NOT NULL;

-- 4. Populate breakout_ip as clean formatted string e.g. "FR / NL / UK" or "SG"
UPDATE public.tariffs
SET breakout_ip = array_to_string(ip_countries, ' / ')
WHERE ip_countries IS NOT NULL AND array_length(ip_countries, 1) > 0;
