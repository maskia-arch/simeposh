-- Migration 017_feedback_system.sql
-- Add review_invited column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS review_invited BOOLEAN DEFAULT FALSE;

-- Create feedbacks table
CREATE TABLE IF NOT EXISTS public.feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  display_name VARCHAR(100) NOT NULL,
  is_verified BOOLEAN DEFAULT FALSE,
  reply_text TEXT,
  replied_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for feedbacks sorting
CREATE INDEX IF NOT EXISTS feedbacks_created_at_idx ON public.feedbacks (created_at DESC);
