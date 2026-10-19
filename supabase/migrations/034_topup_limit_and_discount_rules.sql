-- Migration 034: eSIM-Access-Update: Aufladelimit 9/9 und dynamische Rabattstaffel
-- 1. Tariffs table schema additions
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS active_type smallint;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS support_top_up_type smallint;
ALTER TABLE public.tariffs ADD COLUMN IF NOT EXISTS discount_rule_code text;

CREATE INDEX IF NOT EXISTS idx_tariffs_slug ON public.tariffs (slug);
CREATE INDEX IF NOT EXISTS idx_tariffs_discount_rule_code ON public.tariffs (discount_rule_code);

-- Backfill tariffs columns from raw_data
UPDATE public.tariffs SET
  active_type = CASE 
    WHEN raw_data->>'activeType' ~ '^[0-9]+$' THEN (raw_data->>'activeType')::smallint 
    ELSE 2 
  END,
  support_top_up_type = CASE 
    WHEN raw_data->>'supportTopUpType' ~ '^[0-9]+$' THEN (raw_data->>'supportTopUpType')::smallint 
    ELSE 1 
  END,
  discount_rule_code = NULLIF(raw_data->>'discountRuleCode', '')
WHERE active_type IS NULL OR support_top_up_type IS NULL;

-- Harmonize is_top_up_eligible: strictly derived from active_type and support_top_up_type
UPDATE public.tariffs SET
  is_top_up_eligible = (active_type != 3 AND support_top_up_type IN (2, 3));

-- 2. esims table (issued eSIMs with atomic topup_count constraint 0..9)
CREATE TABLE IF NOT EXISTS public.esims (
  iccid text PRIMARY KEY,
  topup_count integer NOT NULL DEFAULT 0,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT esims_topup_count_range CHECK (topup_count BETWEEN 0 AND 9)
);

CREATE INDEX IF NOT EXISTS idx_esims_iccid ON public.esims(iccid);

-- Backfill esims from orders (all unique ICCIDs)
INSERT INTO public.esims (iccid, topup_count)
SELECT DISTINCT COALESCE(top_up_iccid, iccid) AS iccid, 0
FROM public.orders
WHERE COALESCE(top_up_iccid, iccid) IS NOT NULL AND COALESCE(top_up_iccid, iccid) != ''
ON CONFLICT (iccid) DO NOTHING;

-- Link primary order_id if available
UPDATE public.esims e
SET order_id = o.id
FROM public.orders o
WHERE e.iccid = o.iccid AND o.order_type = 'new_esim' AND e.order_id IS NULL;

-- Backfill topup_count from completed top_up orders
WITH topup_counts AS (
  SELECT 
    COALESCE(top_up_iccid, iccid) AS target_iccid,
    COUNT(*)::int AS count
  FROM public.orders
  WHERE order_type = 'top_up' AND status = 'completed' AND COALESCE(top_up_iccid, iccid) IS NOT NULL
  GROUP BY COALESCE(top_up_iccid, iccid)
)
UPDATE public.esims e
SET topup_count = LEAST(9, GREATEST(e.topup_count, tc.count)),
    updated_at = NOW()
FROM topup_counts tc
WHERE e.iccid = tc.target_iccid;

-- 3. discount_rules table (for dynamic provider discount tiers)
CREATE TABLE IF NOT EXISTS public.discount_rules (
  discount_rule_code text PRIMARY KEY,
  reward_type integer NOT NULL,
  period_rules jsonb NOT NULL,
  valid_from timestamptz,
  valid_to timestamptz,
  synced_at timestamptz NOT NULL DEFAULT now()
);
