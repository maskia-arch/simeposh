-- ============================================================
-- 024 – Add expired & cancelled to public.order_status ENUM
-- Safe idempotent migration
-- ============================================================

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'order_status' AND enumlabel = 'expired'
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'expired';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
    WHERE pg_type.typname = 'order_status' AND enumlabel = 'cancelled'
  ) THEN
    ALTER TYPE public.order_status ADD VALUE 'cancelled';
  END IF;
END $$;
