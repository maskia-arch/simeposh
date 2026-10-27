-- Migration 039: Add breakout_ip column to tariffs table and backfill from raw_data
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS breakout_ip TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_tariffs_breakout_ip ON public.tariffs(breakout_ip);

UPDATE public.tariffs
SET breakout_ip = UPPER(TRIM(raw_data->>'ipExport'))
WHERE raw_data IS NOT NULL 
  AND raw_data->>'ipExport' IS NOT NULL 
  AND breakout_ip IS NULL;
