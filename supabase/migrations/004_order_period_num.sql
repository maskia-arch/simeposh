-- ============================================================
-- 004 – Custom (configurable) unlimited orders
-- Run in Supabase SQL Editor after 003_fix_slug_and_sync.sql
--
-- Stores the customer-chosen number of days for day-pass / unlimited
-- plans so the webhook can provision esimaccess with the correct
-- `periodNum` (Days × Daily Plan).
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders' AND column_name='period_num'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN period_num INTEGER;
    -- NULL  = fixed package (use tariff.validity_days)
    -- >= 1  = custom day-pass duration passed to esimaccess as periodNum
  END IF;
END $$;

-- Optional: remember the Sellauth product/variant we create per checkout,
-- useful for later cleanup of unlisted on-demand products.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='orders' AND column_name='sellauth_product_ref'
  ) THEN
    ALTER TABLE public.orders ADD COLUMN sellauth_product_ref TEXT;
  END IF;
END $$;
