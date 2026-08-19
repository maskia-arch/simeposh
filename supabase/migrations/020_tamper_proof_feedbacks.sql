-- Migration: 020_tamper_proof_feedbacks.sql
-- Ensure review_invited exists on orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_invited BOOLEAN DEFAULT FALSE;

-- Ensure payment_confirmed_at index
CREATE INDEX IF NOT EXISTS idx_orders_payment_confirmed_at ON public.orders(payment_confirmed_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_customer_email_lower ON public.orders(LOWER(customer_email));
CREATE INDEX IF NOT EXISTS idx_orders_review_invited ON public.orders(review_invited) WHERE review_invited = FALSE;

-- Create unique index on feedbacks(order_id) to prevent duplicate reviews per order
CREATE UNIQUE INDEX IF NOT EXISTS idx_feedbacks_order_id_unique ON public.feedbacks(order_id) WHERE order_id IS NOT NULL;
