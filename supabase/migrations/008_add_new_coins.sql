-- ============================================================
-- 008 – Add USDT, USDC, TON & TRX and Memo support
-- ============================================================

-- Seed new supported coins
INSERT INTO public.crypto_coins (code, name, enabled, surcharge_pct, confirmations, decimals, coingecko_id, uri_scheme, chain, sort_order) VALUES
  ('USDT', 'USDT (ETH)', TRUE, 0, 1, 6, 'tether', 'ethereum', 'ethereum_usdt', 5),
  ('USDC', 'USDC (ETH)', TRUE, 0, 1, 6, 'usd-coin', 'ethereum', 'ethereum_usdc', 6),
  ('TON', 'Toncoin', TRUE, 0, 1, 9, 'the-open-network', 'ton', 'ton', 7),
  ('TRX', 'Tron', TRUE, 0, 1, 6, 'tron', 'tron', 'tron', 8)
ON CONFLICT (code) DO NOTHING;

-- Add payment_memo column to crypto_sessions if it doesn't exist
ALTER TABLE public.crypto_sessions ADD COLUMN IF NOT EXISTS payment_memo TEXT;

-- Create unique index to guarantee memo uniqueness among active pending/detected sessions per coin
CREATE UNIQUE INDEX IF NOT EXISTS uniq_crypto_active_memo
  ON public.crypto_sessions(coin, payment_memo)
  WHERE status IN ('pending', 'detected') AND payment_memo IS NOT NULL;
