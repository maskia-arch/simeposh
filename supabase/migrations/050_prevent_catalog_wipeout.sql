-- Migration 050: Production Safeguards to Prevent Catalog Wipeout and Enforce Safe Tariff Types
-- Idempotent, backwards-compatible

-- 1. Update enforce_tariff_sync_guards to guarantee no legacy 'travel' type ever reaches constraints
CREATE OR REPLACE FUNCTION public.enforce_tariff_sync_guards()
RETURNS TRIGGER AS $$
BEGIN
  -- Coerce legacy or empty 'travel' type to 'travel_standard' before check constraints run
  IF NEW.tariff_type = 'travel' OR NEW.tariff_type IS NULL THEN
    NEW.tariff_type := 'travel_standard';
  END IF;

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

  -- EU -> EUROPE guard
  IF NEW.country_code = 'EU' THEN
    NEW.country_code := 'EUROPE';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Europe';
    END IF;
  END IF;

  -- OC -> OCEANIA guard
  IF NEW.country_code = 'OC' THEN
    NEW.country_code := 'OCEANIA';
    IF NEW.region IS NULL OR NEW.region = '' THEN
      NEW.region := 'Oceania';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Ensure trigger runs BEFORE INSERT OR UPDATE on all tariff rows
DROP TRIGGER IF EXISTS trg_tariff_sync_guards ON public.tariffs;
CREATE TRIGGER trg_tariff_sync_guards
BEFORE INSERT OR UPDATE ON public.tariffs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tariff_sync_guards();

-- 3. Statement-level trigger to physically prevent catalog wipeout
-- If any query attempts to reduce active tariffs below 500, abort transaction.
CREATE OR REPLACE FUNCTION public.protect_tariffs_catalog_wipeout()
RETURNS TRIGGER AS $$
DECLARE
  v_active_count integer;
BEGIN
  SELECT count(*) INTO v_active_count FROM public.tariffs WHERE is_active = true;
  IF v_active_count < 500 THEN
    RAISE EXCEPTION 'PureSim Critical Safety Guard: Catalog wipeout prevented! Remaining active tariffs (%) is below absolute minimum threshold of 500. Transaction aborted.', v_active_count;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tariffs_wipeout_guard ON public.tariffs;
CREATE TRIGGER trg_tariffs_wipeout_guard
AFTER UPDATE OF is_active OR DELETE ON public.tariffs
FOR EACH STATEMENT
EXECUTE FUNCTION public.protect_tariffs_catalog_wipeout();
