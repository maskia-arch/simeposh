-- ============================================================
-- 053 – eSIM Cash Security, Constraints & Idempotent Accounting
-- Idempotent migration
-- ============================================================

-- 1. Ensure balance_eur is never negative and enforce CHECK constraint
UPDATE public.esim_cash_accounts
SET balance_eur = 0.00
WHERE balance_eur < 0;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'chk_esim_cash_balance_non_negative'
      AND conrelid = 'public.esim_cash_accounts'::regclass
  ) THEN
    ALTER TABLE public.esim_cash_accounts
      ADD CONSTRAINT chk_esim_cash_balance_non_negative CHECK (balance_eur >= 0);
  END IF;
END $$;

-- 2. Track cashback completion idempotently on orders (even when 0.00 EUR earned, e.g. paid with eSIM Cash)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cashback_processed BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE public.orders
SET cashback_processed = TRUE
WHERE cashback_processed = FALSE
  AND (
    COALESCE(cashback_earned_eur, 0) > 0
    OR COALESCE(cashback_applied_eur, 0) > 0
  );

-- 3. Link eSIM Cash ledger entries to checkout_ref and order_id for idempotency & auditability
ALTER TABLE public.esim_cash_transactions
  ADD COLUMN IF NOT EXISTS checkout_ref TEXT;

ALTER TABLE public.esim_cash_transactions
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_esim_cash_transactions_checkout_ref
  ON public.esim_cash_transactions(checkout_ref);

CREATE INDEX IF NOT EXISTS idx_esim_cash_transactions_order_id
  ON public.esim_cash_transactions(order_id);

-- Partial unique indexes prevent duplicate spend/earn/refund entries under concurrency or retries
CREATE UNIQUE INDEX IF NOT EXISTS uniq_esim_cash_spend_checkout_ref
  ON public.esim_cash_transactions(checkout_ref)
  WHERE type = 'spend' AND checkout_ref IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_esim_cash_earn_order_id
  ON public.esim_cash_transactions(order_id)
  WHERE type = 'earn' AND order_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_esim_cash_refund_order_id
  ON public.esim_cash_transactions(order_id)
  WHERE type = 'refund' AND order_id IS NOT NULL;

-- 4. Backfill unlinked guest eSIM Cash accounts where a matching active registered user exists
UPDATE public.esim_cash_accounts a
SET user_id = u.id
FROM public.users u
WHERE a.user_id IS NULL
  AND u.deleted_at IS NULL
  AND LOWER(TRIM(a.email)) = LOWER(TRIM(u.email));
