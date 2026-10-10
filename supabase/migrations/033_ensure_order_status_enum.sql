-- ============================================================
-- 033 – Ensure all standard order_status ENUM values exist
-- Safe idempotent migration
-- ============================================================

DO $$
DECLARE
  val text;
BEGIN
  FOREACH val IN ARRAY ARRAY['pending', 'paid', 'provisioning', 'completed', 'failed', 'refunded', 'expired', 'cancelled', 'review']
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
      WHERE pg_type.typname = 'order_status' AND enumlabel = val
    ) THEN
      EXECUTE format('ALTER TYPE public.order_status ADD VALUE %L', val);
    END IF;
  END LOOP;
END $$;
