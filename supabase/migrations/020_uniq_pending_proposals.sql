-- 020 – Unique pending price proposals per package code

-- Clean up any existing duplicate pending proposals, keeping only the newest one
DELETE FROM public.tariff_price_proposals
WHERE id NOT IN (
  SELECT DISTINCT ON (package_code) id
  FROM public.tariff_price_proposals
  WHERE status = 'pending'
  ORDER BY package_code, created_at DESC
) AND status = 'pending';

-- Create unique index to physically guarantee no duplicates can ever occur in the future
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pending_proposals
  ON public.tariff_price_proposals (package_code)
  WHERE (status = 'pending');
