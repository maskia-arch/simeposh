-- Migration 046: Fix 3 Sync Guards, Clean Regions, Single Tariffs, and Teasers
-- Idempotent, backwards-compatible, no drops

-- 1. Region Guards: Resolve ISO Alpha-2 vs Region Conflicts
-- AS (American Samoa) vs ASIA
UPDATE public.tariffs
SET country_code = 'ASIA',
    region = 'Asia'
WHERE country_code = 'AS' OR (region ILIKE '%asia%' AND country_code = 'AS');

-- LA (Laos) vs LATAM (Latin America)
UPDATE public.tariffs
SET country_code = 'LATAM',
    region = 'Latin America'
WHERE (country_code = 'LA' OR country_code = 'LAOS')
  AND (name ILIKE '%south america%' OR name ILIKE '%latin america%' OR region ILIKE '%latin%');

-- AF (Afghanistan) vs AFRICA
UPDATE public.tariffs
SET country_code = 'AFRICA',
    region = 'Africa'
WHERE (country_code = 'AF' OR country_code = 'GLOB')
  AND (name ILIKE '%africa%' OR region ILIKE '%africa%');

-- ME (Montenegro) vs MIDDLE_EAST
UPDATE public.tariffs
SET country_code = 'MIDDLE_EAST',
    region = 'Middle East'
WHERE country_code = 'ME'
  AND (name ILIKE '%middle east%' OR name ILIKE '%gulf%' OR name ILIKE '%gcc%'
       OR region ILIKE '%middle%' OR region ILIKE '%gulf%' OR region ILIKE '%gcc%');

-- 2. Clean Single Tariffs: A tariff alone in its group (count = 1) is ALWAYS Travel Standard unless an explicit override exists
WITH ranked_travel AS (
  SELECT id,
         COUNT(*) OVER (
           PARTITION BY COALESCE(NULLIF(region, ''), country_code),
           (CASE WHEN array_length(location_codes, 1) > 1 THEN array_length(location_codes, 1) ELSE 1 END),
           data_gb,
           validity_days
         ) AS grp_count
  FROM public.tariffs
  WHERE is_active = true
    AND hidden_reason IS NULL
    AND tariff_type NOT LIKE 'unlimited%'
    AND data_gb > 0
)
UPDATE public.tariffs t
SET is_premium = FALSE,
    tariff_type = 'travel_standard',
    premium_diff_chip = NULL,
    needs_difference_review = FALSE
FROM ranked_travel r
WHERE t.id = r.id
  AND r.grp_count = 1
  AND t.is_premium_override IS NULL;

-- 3. Fix 222 / 232 teaser numbers across posts and post_translations to uniform "200+"
UPDATE public.posts
SET excerpt = regexp_replace(excerpt, '(über|over|plus de|más de|oltre|meer dan|ponad|mais de|yli|více než|peste|több mint)\s+(222|232)', '\1 200+', 'gi'),
    title = regexp_replace(title, '(über|over|plus de|más de|oltre|meer dan|ponad|mais de|yli|více než|peste|több mint)\s+(222|232)', '\1 200+', 'gi');

UPDATE public.posts
SET excerpt = regexp_replace(excerpt, '232(\x27|'')den fazla', '200\1den fazla', 'gi'),
    title = regexp_replace(title, '232(\x27|'')den fazla', '200\1den fazla', 'gi');

UPDATE public.post_translations
SET excerpt = regexp_replace(excerpt, '(über|over|plus de|más de|oltre|meer dan|ponad|mais de|yli|více než|peste|több mint)\s+(222|232)', '\1 200+', 'gi'),
    title = regexp_replace(title, '(über|over|plus de|más de|oltre|meer dan|ponad|mais de|yli|více než|peste|több mint)\s+(222|232)', '\1 200+', 'gi');

UPDATE public.post_translations
SET excerpt = regexp_replace(excerpt, '232(\x27|'')den fazla', '200\1den fazla', 'gi'),
    title = regexp_replace(title, '232(\x27|'')den fazla', '200\1den fazla', 'gi');

-- 4. Sync Guard: Trigger function to ensure region guards are perpetually enforced on insert/update
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tariff_sync_guards ON public.tariffs;
CREATE TRIGGER trg_tariff_sync_guards
BEFORE INSERT OR UPDATE OF country_code, name, region ON public.tariffs
FOR EACH ROW
EXECUTE FUNCTION public.enforce_tariff_sync_guards();

-- 5. Legacy 'travel' cleanup: Ensure every travel tariff is explicitly travel_standard or travel_premium
UPDATE public.tariffs
SET tariff_type = CASE WHEN is_premium IS TRUE THEN 'travel_premium' ELSE 'travel_standard' END
WHERE tariff_type = 'travel';

