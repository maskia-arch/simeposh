-- 019 – Add min_order_eur and checkout_duration_mins to crypto_coins

ALTER TABLE public.crypto_coins ADD COLUMN IF NOT EXISTS min_order_eur NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.crypto_coins ADD COLUMN IF NOT EXISTS checkout_duration_mins INTEGER NOT NULL DEFAULT 30;
