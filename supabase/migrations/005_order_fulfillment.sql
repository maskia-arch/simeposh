-- ============================================================
-- 005 – Order fulfilment, guest profiles & eSIM status
-- Run in Supabase SQL Editor after 004_order_period_num.sql
-- ============================================================

-- ── eSIM delivery + tracking fields ─────────────────────────
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS short_url      TEXT;        -- esimaccess universal install link
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS checkout_ref   TEXT;        -- groups all orders of one checkout (for /order?ref=)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS esim_status    TEXT;        -- new | in_use | used | unknown (cached from esimaccess)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS esim_status_at TIMESTAMPTZ; -- when esim_status was last refreshed

CREATE INDEX IF NOT EXISTS idx_orders_checkout_ref   ON public.orders(checkout_ref);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email ON public.orders(customer_email);

-- ── Allow guests to read their own order(s) by checkout_ref ──
-- The /order page is public and looks up by the unguessable checkout_ref.
-- Reads go through the service client, so no extra RLS policy is required here.


