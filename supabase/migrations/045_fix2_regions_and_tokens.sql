-- Migration 045: Fix 2 zu Run 9 - True Region Classification, Difference Chips, Review List, and Token Preservation
-- PureSim.net

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Add difference chip and review tracking columns to tariffs
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS premium_diff_chip TEXT;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS needs_difference_review BOOLEAN DEFAULT FALSE;

-- 2. Update set_order_setup_token trigger function to preserve tokens on intermediate status updates
CREATE OR REPLACE FUNCTION public.set_order_setup_token()
RETURNS TRIGGER AS $$
BEGIN
  -- If order is paid/completed/provisioning or has an ICCID, ensure setup_token is set
  IF (NEW.status IN ('completed', 'paid', 'provisioning') OR NEW.iccid IS NOT NULL) THEN
    IF NEW.setup_token IS NULL OR NEW.setup_token = '' THEN
      NEW.setup_token := encode(gen_random_bytes(16), 'hex');
    END IF;
  ELSIF TG_OP = 'UPDATE' AND OLD.setup_token IS NOT NULL AND NEW.status NOT IN ('cancelled', 'failed', 'expired') THEN
    -- Preserve existing setup_token during intermediate status changes (e.g. review)
    NEW.setup_token := OLD.setup_token;
  ELSE
    -- Truly unpaid/cancelled/expired orders without prior valid token
    IF NEW.status IN ('cancelled', 'failed', 'expired') AND NEW.iccid IS NULL THEN
      NEW.setup_token := NULL;
    END IF;
  END IF;

  IF NEW.setup_token IS NOT NULL THEN
    NEW.short_url := 'https://esim.puresim.net/s/' || NEW.setup_token;
  ELSE
    NEW.short_url := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_setup_token ON public.orders;
CREATE TRIGGER trg_orders_setup_token
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_setup_token();

-- 3. Reset chips on all Unlimited and non-travel tariffs (Unlimited is NEVER premium)
UPDATE public.tariffs
SET is_premium = FALSE,
    premium_diff_chip = NULL,
    needs_difference_review = FALSE
WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0;

-- 4. Reclassify travel tariffs partitioned by TRUE REGION (COALESCE(NULLIF(region, ''), country_code))
WITH ranked_travel AS (
  SELECT id,
         sale_price_eur,
         MIN(sale_price_eur) OVER (PARTITION BY COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days) AS min_price,
         COUNT(*) OVER (PARTITION BY COALESCE(NULLIF(region, ''), country_code), data_gb, validity_days) AS group_count
  FROM public.tariffs
  WHERE is_active = true AND hidden_reason IS NULL AND tariff_type NOT LIKE 'unlimited%' AND data_gb > 0
)
UPDATE public.tariffs t
SET is_premium = CASE
      WHEN t.is_premium_override IS NOT NULL THEN t.is_premium_override
      WHEN r.group_count > 1 AND r.sale_price_eur > r.min_price THEN TRUE
      ELSE FALSE
    END,
    tariff_type = CASE
      WHEN t.is_premium_override IS TRUE OR (t.is_premium_override IS NULL AND r.group_count > 1 AND r.sale_price_eur > r.min_price) THEN 'travel_premium'
      ELSE 'travel_standard'
    END
FROM ranked_travel r
WHERE t.id = r.id;

UPDATE public.tariffs
SET tariff_type = CASE WHEN is_premium IS TRUE THEN 'travel_premium' ELSE 'travel_standard' END
WHERE tariff_type = 'travel';
