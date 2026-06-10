-- Migration: 009_add_min_payment_pct.sql
-- Add min_payment_pct column to crypto_coins and received_amount column to crypto_sessions.

ALTER TABLE crypto_coins 
ADD COLUMN min_payment_pct INTEGER DEFAULT 100 NOT NULL 
CHECK (min_payment_pct >= 50 AND min_payment_pct <= 100);

ALTER TABLE crypto_sessions 
ADD COLUMN received_amount NUMERIC DEFAULT 0.0 NOT NULL;
