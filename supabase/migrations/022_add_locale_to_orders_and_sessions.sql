-- Migration 022: Add locale column to orders, crypto_sessions, and users for localized email communications
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'de';
ALTER TABLE public.crypto_sessions ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'de';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS locale TEXT DEFAULT 'de';
