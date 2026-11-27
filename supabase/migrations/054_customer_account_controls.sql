-- Customer account controls: soft lock, hard lock, cash freeze, admin notes & audit log

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS account_status TEXT NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS lock_reason TEXT,
  ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS cash_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_account_status_check'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_account_status_check
      CHECK (account_status IN ('active', 'soft_locked', 'hard_locked'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.customer_restrictions (
  email TEXT PRIMARY KEY,
  account_status TEXT NOT NULL DEFAULT 'active' CHECK (account_status IN ('active', 'soft_locked', 'hard_locked')),
  lock_reason TEXT,
  locked_until TIMESTAMPTZ,
  locked_at TIMESTAMPTZ,
  cash_frozen BOOLEAN NOT NULL DEFAULT FALSE,
  admin_notes TEXT,
  updated_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.customer_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  user_id UUID,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  admin_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_audit_logs_email
  ON public.customer_audit_logs (LOWER(email), created_at DESC);
