-- Migration 028_feedback_cashback_reward.sql
-- Add cashback_reward_eur column to feedbacks table to record the 1% reward credited for feedback
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS cashback_reward_eur NUMERIC(12,2) DEFAULT 0.00;
