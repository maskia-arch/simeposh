-- ============================================================
-- 025 – Add eSIM Usage & Status Tracking Columns to orders
-- Safe idempotent migration
-- ============================================================

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS smdp_status TEXT,
  ADD COLUMN IF NOT EXISTS data_remaining_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS data_total_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS esim_expired_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS esim_usage_updated_at TIMESTAMPTZ;

-- Index for background cron query optimization
CREATE INDEX IF NOT EXISTS idx_orders_usage_sync
  ON public.orders(iccid, status, smdp_status)
  WHERE iccid IS NOT NULL;
