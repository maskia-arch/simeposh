-- Migration 035: Configure unlimited discount minimum days & default discount rule
-- 1. Insert default settings if they do not already exist
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('unlimited_default_discount_rule', 'UNLIMITED_PLAN_DISC', 'Default dynamic discount rule code assigned to DayPass/Unlimited tariffs'),
  ('unlimited_discount_min_days', '4', 'Minimum duration in days before dynamic discount tiers apply (1 to 30, default: 4)')
ON CONFLICT (key) DO NOTHING;
