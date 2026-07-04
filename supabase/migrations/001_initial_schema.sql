-- ============================================================
-- eSIM Shop – Initial Schema  (idempotent – safe to re-run)
-- Run in Supabase SQL Editor BEFORE 002_tariff_types_and_price_review.sql
-- ============================================================

-- Enable UUID extension (already enabled on Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUM TYPES (create only if not already there)
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.order_status AS ENUM (
      'pending', 'paid', 'provisioning', 'completed', 'failed', 'refunded'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'order_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.order_type AS ENUM ('new_esim', 'top_up');
  END IF;
END $$;

-- ============================================================
-- TABLES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT,
  full_name     TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tariffs (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  package_code          TEXT NOT NULL UNIQUE,
  slug                  TEXT NOT NULL UNIQUE,
  name                  TEXT NOT NULL,
  description           TEXT,
  country_code          TEXT NOT NULL,
  country_name          TEXT NOT NULL,
  region                TEXT,
  flag_emoji            TEXT,
  data_gb               NUMERIC(10,3),
  validity_days         INTEGER NOT NULL,
  ek_price_usd          NUMERIC(10,4) NOT NULL,
  sale_price_eur        NUMERIC(10,2) NOT NULL,
  usd_eur_rate          NUMERIC(10,6) NOT NULL,
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  is_top_up_eligible    BOOLEAN NOT NULL DEFAULT FALSE,
  raw_data              JSONB,
  last_synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tariffs_country_code ON public.tariffs(country_code);
CREATE INDEX IF NOT EXISTS idx_tariffs_is_active    ON public.tariffs(is_active);
CREATE INDEX IF NOT EXISTS idx_tariffs_region       ON public.tariffs(region);

CREATE TABLE IF NOT EXISTS public.orders (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tariff_id             UUID NOT NULL REFERENCES public.tariffs(id),
  order_type            public.order_type NOT NULL DEFAULT 'new_esim',
  status                public.order_status NOT NULL DEFAULT 'pending',
  customer_email        TEXT NOT NULL,
  customer_name         TEXT,
  amount_eur            NUMERIC(10,2) NOT NULL,
  usd_eur_rate          NUMERIC(10,6) NOT NULL,
  payment_confirmed_at  TIMESTAMPTZ,
  iccid                 TEXT,
  qr_code_url           TEXT,
  qr_code_base64        TEXT,
  activation_code       TEXT,
  smdp_address          TEXT,
  apn                   TEXT,
  top_up_iccid          TEXT,
  error_message         TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id           ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status            ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_iccid             ON public.orders(iccid);
CREATE INDEX IF NOT EXISTS idx_orders_top_up_iccid      ON public.orders(top_up_iccid);

CREATE TABLE IF NOT EXISTS public.system_settings (
  key         TEXT PRIMARY KEY,
  value       TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO public.system_settings (key, value, description) VALUES
  ('usd_eur_rate',   '0.92',              'Fallback USD→EUR exchange rate'),
  ('sync_enabled',   'true',              'Enable/disable the daily tariff sync'),
  ('shop_name',      'eSIM Shop',         'Display name of the shop'),
  ('support_email',  'support@example.com', 'Customer support email')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_updated_at    ON public.users;
DROP TRIGGER IF EXISTS trg_tariffs_updated_at  ON public.tariffs;
DROP TRIGGER IF EXISTS trg_orders_updated_at   ON public.orders;
DROP TRIGGER IF EXISTS trg_settings_updated_at ON public.system_settings;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_tariffs_updated_at
  BEFORE UPDATE ON public.tariffs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

