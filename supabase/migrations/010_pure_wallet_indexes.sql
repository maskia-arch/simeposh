-- Migration: 010_pure_wallet_indexes.sql
-- Drop unique index on (coin, crypto_amount) and (coin, payment_memo) because pure-wallet uses
-- unique derived addresses and does not require unique expected amounts or custom memos.

DROP INDEX IF EXISTS public.uniq_crypto_active_amount;
DROP INDEX IF EXISTS public.uniq_crypto_active_memo;
