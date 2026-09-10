-- Migration 029: Add initial_balance to crypto_sessions
ALTER TABLE public.crypto_sessions ADD COLUMN IF NOT EXISTS initial_balance NUMERIC DEFAULT 0;
