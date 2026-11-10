-- Migration 049: Fix 6 Enforce No Travel Type, Unhide Duplicate Tariffs, Refine Update Trigger
-- Idempotent, backwards-compatible

-- 1. Ensure review columns exist on tariffs
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS needs_difference_review boolean DEFAULT false;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS difference_review_notes text;

-- 2. Alter column default for tariff_type to 'travel_standard'
ALTER TABLE public.tariffs ALTER COLUMN tariff_type SET DEFAULT 'travel_standard';

-- 3. Migrate any remaining legacy 'travel' type tariffs to 'travel_standard'
UPDATE public.tariffs
SET tariff_type = 'travel_standard'
WHERE tariff_type = 'travel';

-- 4. Unhide all duplicate higher price tariffs so no active supplier tariff is hidden
UPDATE public.tariffs
SET hidden_reason = NULL,
    duplicate_of = NULL
WHERE hidden_reason = 'duplicate_higher_price';

-- 5. Enforce check constraint: active tariffs can never have legacy 'travel' type
ALTER TABLE public.tariffs DROP CONSTRAINT IF EXISTS chk_tariffs_no_legacy_travel;
ALTER TABLE public.tariffs ADD CONSTRAINT chk_tariffs_no_legacy_travel
  CHECK (is_active = false OR tariff_type <> 'travel');

-- 6. Dedicated tariff update trigger that only bumps updated_at when user-facing fields change
CREATE OR REPLACE FUNCTION public.set_tariff_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    OLD.sale_price_eur IS DISTINCT FROM NEW.sale_price_eur OR
    OLD.data_gb IS DISTINCT FROM NEW.data_gb OR
    OLD.validity_days IS DISTINCT FROM NEW.validity_days OR
    OLD.tariff_type IS DISTINCT FROM NEW.tariff_type OR
    OLD.is_premium IS DISTINCT FROM NEW.is_premium OR
    OLD.breakout_ip IS DISTINCT FROM NEW.breakout_ip OR
    OLD.ip_countries IS DISTINCT FROM NEW.ip_countries OR
    OLD.premium_diff_chip IS DISTINCT FROM NEW.premium_diff_chip OR
    OLD.name IS DISTINCT FROM NEW.name OR
    OLD.description IS DISTINCT FROM NEW.description OR
    OLD.speed_kbps IS DISTINCT FROM NEW.speed_kbps OR
    OLD.label IS DISTINCT FROM NEW.label OR
    OLD.is_top_up_eligible IS DISTINCT FROM NEW.is_top_up_eligible OR
    OLD.active_type IS DISTINCT FROM NEW.active_type OR
    OLD.support_top_up_type IS DISTINCT FROM NEW.support_top_up_type OR
    OLD.country_code IS DISTINCT FROM NEW.country_code OR
    OLD.location_codes IS DISTINCT FROM NEW.location_codes OR
    OLD.region IS DISTINCT FROM NEW.region OR
    OLD.is_active IS DISTINCT FROM NEW.is_active OR
    OLD.hidden_reason IS DISTINCT FROM NEW.hidden_reason
  ) THEN
    NEW.updated_at := NOW();
  ELSE
    NEW.updated_at := OLD.updated_at;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tariffs_updated_at ON public.tariffs;
CREATE TRIGGER trg_tariffs_updated_at
BEFORE UPDATE ON public.tariffs
FOR EACH ROW
EXECUTE FUNCTION public.set_tariff_updated_at();
