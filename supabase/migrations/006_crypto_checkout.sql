-- ============================================================
-- 006 – Native crypto checkout (amount-based order matching)
-- Run in Supabase SQL Editor after 005_order_fulfillment.sql
-- ============================================================

-- ── Per-coin configuration (admin-editable) ─────────────────
CREATE TABLE IF NOT EXISTS public.crypto_coins (
  code                  TEXT PRIMARY KEY,           -- BTC, LTC, ETH, SOL
  name                  TEXT NOT NULL,
  enabled               BOOLEAN NOT NULL DEFAULT TRUE,
  surcharge_pct         NUMERIC(6,3) NOT NULL DEFAULT 0,   -- e.g. 5.000 = +5%
  surcharge_fixed_eur   NUMERIC(10,2) NOT NULL DEFAULT 0,  -- flat fee on top
  confirmations         INTEGER NOT NULL DEFAULT 1,        -- required blockchain confirmations
  decimals              INTEGER NOT NULL DEFAULT 8,         -- display/match precision
  coingecko_id          TEXT NOT NULL,             -- bitcoin, litecoin, ethereum, solana
  uri_scheme            TEXT NOT NULL,             -- bitcoin, litecoin, ethereum, solana
  chain                 TEXT NOT NULL,             -- watcher adapter key
  sort_order            INTEGER NOT NULL DEFAULT 0,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed the supported coins (wallets come from ENV, never the DB).
INSERT INTO public.crypto_coins (code, name, enabled, surcharge_pct, confirmations, decimals, coingecko_id, uri_scheme, chain, sort_order) VALUES
  ('LTC', 'Litecoin', TRUE, 0, 1, 8, 'litecoin', 'litecoin', 'litecoin', 1),
  ('BTC', 'Bitcoin',  TRUE, 0, 1, 8, 'bitcoin',  'bitcoin',  'bitcoin',  2),
  ('ETH', 'Ethereum', TRUE, 0, 1, 8, 'ethereum', 'ethereum', 'ethereum', 3),
  ('SOL', 'Solana',   TRUE, 0, 1, 6, 'solana',   'solana',   'solana',   4)
ON CONFLICT (code) DO NOTHING;

-- ── Crypto checkout sessions ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.crypto_sessions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_ids              TEXT[] NOT NULL,            -- orders this payment fulfils
  customer_email         TEXT NOT NULL,
  coin                   TEXT NOT NULL REFERENCES public.crypto_coins(code),
  wallet_address         TEXT NOT NULL,             -- snapshot of the receiving address
  base_eur               NUMERIC(12,2) NOT NULL,    -- price before surcharge
  amount_eur             NUMERIC(12,2) NOT NULL,    -- price incl. surcharge (fiat target)
  surcharge_pct          NUMERIC(6,3)  NOT NULL DEFAULT 0,
  surcharge_fixed_eur    NUMERIC(10,2) NOT NULL DEFAULT 0,
  rate_eur               NUMERIC(20,8) NOT NULL,    -- coin price in EUR at creation
  slot_id                INTEGER NOT NULL,          -- 0..9999 identification slot
  crypto_amount          NUMERIC(30,8) NOT NULL,    -- EXACT expected amount incl. slot
  confirmations_required INTEGER NOT NULL DEFAULT 1,
  confirmations          INTEGER NOT NULL DEFAULT 0,
  status                 TEXT NOT NULL DEFAULT 'pending', -- pending|detected|paid|expired|failed
  tx_hash                TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at             TIMESTAMPTZ NOT NULL,
  paid_at                TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_crypto_sessions_status  ON public.crypto_sessions(status);
CREATE INDEX IF NOT EXISTS idx_crypto_sessions_coin    ON public.crypto_sessions(coin);
CREATE INDEX IF NOT EXISTS idx_crypto_sessions_expires ON public.crypto_sessions(expires_at);

-- ── Slot pool guard ─────────────────────────────────────────
-- The decisive constraint: a given crypto AMOUNT may only be reserved by ONE
-- *active* session per coin at a time. The 4-digit slot makes the amount unique,
-- so on-chain matching is always unambiguous. (Same slot may be reused across
-- different base prices because the full amounts differ.)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_crypto_active_amount
  ON public.crypto_sessions(coin, crypto_amount)
  WHERE status IN ('pending', 'detected');

-- ── RLS (service-role only; all access goes through the API) ──
ALTER TABLE public.crypto_coins    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crypto_sessions ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crypto_coins' AND policyname='crypto_coins_public_read') THEN
    CREATE POLICY "crypto_coins_public_read" ON public.crypto_coins FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='crypto_sessions' AND policyname='crypto_sessions_service_only') THEN
    CREATE POLICY "crypto_sessions_service_only" ON public.crypto_sessions USING (false);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_crypto_coins_updated_at ON public.crypto_coins;
CREATE TRIGGER trg_crypto_coins_updated_at
  BEFORE UPDATE ON public.crypto_coins
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
