-- Migration 031: Add terms acceptance timestamp and version to orders
-- Enables audit trail for legal compliance without storing additional personal data.
-- Existing orders remain NULL.
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS terms_version TEXT;
