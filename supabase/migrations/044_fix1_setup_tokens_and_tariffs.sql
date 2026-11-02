-- Migration 044: Fix 1 zu Run 9 - Cryptographic Setup Tokens, Rotation, Unpaid Cleanup, and Tariff Classification
-- PureSim.net

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Replace order setup_token trigger with cryptographically secure gen_random_bytes(16)
CREATE OR REPLACE FUNCTION public.set_order_setup_token()
RETURNS TRIGGER AS $$
BEGIN
  -- Only assign a setup_token if the order is paid/completed/provisioning or already has an ICCID
  IF (NEW.status IN ('completed', 'paid', 'provisioning') OR NEW.iccid IS NOT NULL) THEN
    IF NEW.setup_token IS NULL OR NEW.setup_token = '' THEN
      NEW.setup_token := encode(gen_random_bytes(16), 'hex');
    END IF;
  ELSE
    -- Unpaid, cancelled, failed, expired orders must NOT have a setup token
    NEW.setup_token := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_setup_token ON public.orders;
CREATE TRIGGER trg_orders_setup_token
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_setup_token();

-- 2. Clean up setup_token on all unpaid/cancelled/expired/failed orders
UPDATE public.orders
SET setup_token = NULL
WHERE NOT (status IN ('completed', 'paid', 'provisioning') OR iccid IS NOT NULL)
  AND setup_token IS NOT NULL;

-- 3. Rotate ALL setup tokens for paid/completed orders with cryptographically secure 32 hex chars
UPDATE public.orders
SET setup_token = encode(gen_random_bytes(16), 'hex')
WHERE (status IN ('completed', 'paid', 'provisioning') OR iccid IS NOT NULL);

-- 4. Update short_url to reflect new setup tokens
UPDATE public.orders
SET short_url = 'https://esim.puresim.net/s/' || setup_token
WHERE setup_token IS NOT NULL;

UPDATE public.orders
SET short_url = NULL
WHERE setup_token IS NULL;

-- 5. Fast case-insensitive package_code index for instant /tariffs/<code> resolution (< 3s)
CREATE INDEX IF NOT EXISTS idx_tariffs_package_code_lower ON public.tariffs (lower(package_code));

-- 6. Reclassify tariffs according to the new Fix 1 Rule:
-- Unlimited tariffs are ALWAYS unlimited_eco or unlimited_pro and NEVER premium
UPDATE public.tariffs
SET is_premium = FALSE
WHERE tariff_type LIKE 'unlimited%' OR data_gb = 0;

-- Travel tariffs classification:
-- Lowest price in (country_code, data_gb, validity_days) group -> travel_standard (is_premium = false)
-- Higher price in group -> travel_premium (is_premium = true)
-- Single tariff -> travel_standard (is_premium = false)
-- Equal price -> travel_standard (is_premium = false)
-- is_premium_override takes absolute precedence
WITH ranked_travel AS (
  SELECT id,
         sale_price_eur,
         MIN(sale_price_eur) OVER (PARTITION BY country_code, data_gb, validity_days) AS min_price,
         COUNT(*) OVER (PARTITION BY country_code, data_gb, validity_days) AS group_count
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

-- Ensure any legacy 'travel' type without rank defaults to travel_standard
UPDATE public.tariffs
SET tariff_type = CASE WHEN is_premium IS TRUE THEN 'travel_premium' ELSE 'travel_standard' END
WHERE tariff_type = 'travel';
