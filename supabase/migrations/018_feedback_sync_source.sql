-- Migration 018_feedback_sync_source.sql
-- Add source column to feedbacks
ALTER TABLE public.feedbacks ADD COLUMN IF NOT EXISTS source VARCHAR(100);
