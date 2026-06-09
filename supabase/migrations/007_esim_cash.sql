-- ============================================================
-- 007 – eSIM Cash & Affiliate/Referral System
-- ============================================================

-- Create eSIM Cash Accounts table
CREATE TABLE IF NOT EXISTS public.esim_cash_accounts (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                  TEXT NOT NULL UNIQUE,
  user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  balance_eur            NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  total_spend_eur        NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  affiliate_code         TEXT NOT NULL UNIQUE,
  referred_by_code       TEXT,
  extra_cashback_queue   INTEGER NOT NULL DEFAULT 0,
  sent_email_3           BOOLEAN NOT NULL DEFAULT FALSE,
  sent_email_5           BOOLEAN NOT NULL DEFAULT FALSE,
  sent_email_10          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_cash_accounts_email ON public.esim_cash_accounts(email);
CREATE INDEX IF NOT EXISTS idx_esim_cash_accounts_user_id ON public.esim_cash_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_esim_cash_accounts_affiliate ON public.esim_cash_accounts(affiliate_code);

-- Create eSIM Cash Transactions table
CREATE TABLE IF NOT EXISTS public.esim_cash_transactions (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email                  TEXT NOT NULL,
  user_id                UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  amount                 NUMERIC(12,2) NOT NULL, -- positive for earn, negative for spend
  type                   TEXT NOT NULL,          -- earn|spend|referral_bonus
  description            TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_esim_cash_transactions_email ON public.esim_cash_transactions(email);
CREATE INDEX IF NOT EXISTS idx_esim_cash_transactions_user_id ON public.esim_cash_transactions(user_id);

-- Add affiliate and cashback tracking columns to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referred_by_code TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cashback_earned_eur NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cashback_applied_eur NUMERIC(12,2) DEFAULT 0.00;

-- Enable RLS
ALTER TABLE public.esim_cash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.esim_cash_transactions ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='esim_cash_accounts' AND policyname='esim_cash_accounts_self_select') THEN
    CREATE POLICY "esim_cash_accounts_self_select" ON public.esim_cash_accounts FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='esim_cash_transactions' AND policyname='esim_cash_transactions_self_select') THEN
    CREATE POLICY "esim_cash_transactions_self_select" ON public.esim_cash_transactions FOR SELECT USING (auth.uid() = user_id);
  END IF;
END $$;

-- Trigger to automatically update updated_at on esim_cash_accounts
DROP TRIGGER IF EXISTS trg_esim_cash_accounts_updated_at ON public.esim_cash_accounts;
CREATE TRIGGER trg_esim_cash_accounts_updated_at
  BEFORE UPDATE ON public.esim_cash_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
