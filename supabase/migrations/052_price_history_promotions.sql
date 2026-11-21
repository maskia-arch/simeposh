-- Migration 052: Add promotion tracking to tariff_price_history and indexes
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS is_promotional BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS regular_price_eur NUMERIC(10,2);
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS promotion_name TEXT;

CREATE INDEX IF NOT EXISTS idx_price_history_promo ON public.tariff_price_history(is_promotional);
