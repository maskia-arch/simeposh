-- ============================================================
-- 002 – Tariff types, price-change proposals, sync log
-- Run in Supabase SQL Editor after 001_initial_schema.sql
-- ============================================================

-- ── 1. Add tariff_type & speed metadata to tariffs ───────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tariffs' AND column_name='tariff_type'
  ) THEN
    ALTER TABLE public.tariffs ADD COLUMN tariff_type TEXT NOT NULL DEFAULT 'travel';
    -- 'travel'        = fixed data volume
    -- 'unlimited_eco' = unlimited with FUP ≤ 512 kbps throttle
    -- 'unlimited_pro' = unlimited with FUP ≥ 1 Mbps throttle
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tariffs' AND column_name='speed_kbps'
  ) THEN
    ALTER TABLE public.tariffs ADD COLUMN speed_kbps INTEGER;
    -- throttle speed in kbps (null = not unlimited)
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tariffs' AND column_name='label'
  ) THEN
    ALTER TABLE public.tariffs ADD COLUMN label TEXT;
    -- promotional label e.g. "Summer Deal", null = no label
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='tariffs' AND column_name='location_codes'
  ) THEN
    ALTER TABLE public.tariffs ADD COLUMN location_codes TEXT[];
    -- array of ISO country codes covered, e.g. {'DE','FR','IT'}
  END IF;
END $$;

-- ── 2. Sync log (one row per cron run) ───────────────────────
CREATE TABLE IF NOT EXISTS public.sync_logs (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id         TEXT NOT NULL UNIQUE,   -- e.g. "2025-01-15T10:00:00Z"
  status          TEXT NOT NULL DEFAULT 'running',  -- running | completed | failed
  total_packages  INTEGER,
  upserted        INTEGER,
  errors          INTEGER,
  usd_eur_rate    NUMERIC(10,6),
  price_changes   INTEGER,     -- how many tariffs had a price change
  duration_ms     INTEGER,
  error_message   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- ── 3. Pending price proposals (one row per changed tariff) ──
CREATE TABLE IF NOT EXISTS public.tariff_price_proposals (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sync_id         TEXT NOT NULL,
  tariff_id       UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  package_code    TEXT NOT NULL,
  old_price_eur   NUMERIC(10,2) NOT NULL,
  new_price_eur   NUMERIC(10,2) NOT NULL,
  change_pct      NUMERIC(6,2) NOT NULL,   -- positive = price increase
  status          TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  label           TEXT,   -- optional promo label set by admin
  reviewed_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_proposals_sync_id ON public.tariff_price_proposals(sync_id);
CREATE INDEX IF NOT EXISTS idx_price_proposals_status  ON public.tariff_price_proposals(status);
CREATE INDEX IF NOT EXISTS idx_price_proposals_tariff  ON public.tariff_price_proposals(tariff_id);

-- ── 4. RLS for new tables ─────────────────────────────────────
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'sync_logs'
      AND policyname = 'sync_logs_service_only'
  ) THEN
    CREATE POLICY "sync_logs_service_only" ON public.sync_logs USING (false);
  END IF;
END $$;

ALTER TABLE public.tariff_price_proposals ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'tariff_price_proposals'
      AND policyname = 'proposals_service_only'
  ) THEN
    CREATE POLICY "proposals_service_only" ON public.tariff_price_proposals USING (false);
  END IF;
END $$;

-- ── 5. Index for tariff_type ──────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tariffs_type ON public.tariffs(tariff_type);
