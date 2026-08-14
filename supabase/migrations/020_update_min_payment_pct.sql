-- Migration: 020_update_min_payment_pct.sql
-- Ensure 98% underpayment tolerance (2% threshold) is set for all crypto coins.

ALTER TABLE public.crypto_coins 
ALTER COLUMN min_payment_pct SET DEFAULT 98;

UPDATE public.crypto_coins 
SET min_payment_pct = 98 
WHERE min_payment_pct IS NULL OR min_payment_pct >= 100;
