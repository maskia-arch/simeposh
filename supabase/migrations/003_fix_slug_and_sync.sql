-- ============================================================
-- 003 – Fix slug uniqueness & sync performance
-- Run in Supabase SQL Editor after 002_tariff_types_and_price_review.sql
--
-- WHY:
--   The slug column has a UNIQUE constraint, but two esimaccess packageCodes
--   can slugify to the same string (e.g. "ESIM-DE-1GB" and "ESIM_DE_1GB"
--   both → "esim-de-1gb"). This causes entire upsert batches of 200 rows
--   to fail with a unique constraint violation, leaving most packages unsaved.
--
--   package_code is already UNIQUE – that is the true identifier.
--   slug is only for URL readability and does NOT need to be globally unique.
-- ============================================================

-- ── 1. Drop the UNIQUE constraint on slug ────────────────────
-- (keep it as a plain non-unique index for lookup performance)
ALTER TABLE public.tariffs DROP CONSTRAINT IF EXISTS tariffs_slug_key;

-- Non-unique index for slug lookups (e.g. redirect old URLs)
CREATE INDEX IF NOT EXISTS idx_tariffs_slug ON public.tariffs(slug);

-- ── 2. Add index on last_synced_at for efficient deactivation ──
-- Instead of a huge IN-clause ("WHERE package_code NOT IN (140k items)"),
-- the sync now deactivates old rows by timestamp comparison.
CREATE INDEX IF NOT EXISTS idx_tariffs_last_synced_at ON public.tariffs(last_synced_at);

-- ── 3. Fix existing slugs to use the new slug format ─────────
-- New format: slugify(package_code) = lowercase, hyphens only.
-- Fixes old format which was "country-name-Xgb-Yd-PACKAGECODE"[0:100].
UPDATE public.tariffs
SET slug = lower(regexp_replace(package_code, '[^a-z0-9A-Z]', '-', 'g'))
WHERE slug IS NOT NULL;

-- Remove leading/trailing hyphens from the regex replacement
UPDATE public.tariffs
SET slug = trim(both '-' from slug);

-- ── 4. Reset all tariffs to is_active = false ────────────────
-- This is a clean-slate reset so the NEXT sync can reactivate all
-- currently-available packages. Without this, packages that failed
-- to upsert in previous syncs remain permanently stale.
-- IMPORTANT: After running this migration, trigger a new sync immediately.
UPDATE public.tariffs SET is_active = false;

-- ── 5. Composite index for shop queries (active + type + price) ──
CREATE INDEX IF NOT EXISTS idx_tariffs_active_type_price
  ON public.tariffs(is_active, tariff_type, sale_price_eur)
  WHERE is_active = true;

-- ── 6. Index on country_code for search ─────────────────────
-- Already exists from migration 001 (idx_tariffs_country_code),
-- but add a composite one for filtered searches.
CREATE INDEX IF NOT EXISTS idx_tariffs_country_type
  ON public.tariffs(country_code, tariff_type)
  WHERE is_active = true;
