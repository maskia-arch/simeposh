-- Migration 051: Promotions, Themes, Quotes and Price History Enhancements
-- Reversible and backwards-compatible

-- 1. Create promotions table
CREATE TABLE IF NOT EXISTS public.promotions (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug                  TEXT UNIQUE NOT NULL,
  internal_name         TEXT NOT NULL,
  titles                JSONB NOT NULL DEFAULT '{}'::jsonb,
  texts                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  badge_texts           JSONB NOT NULL DEFAULT '{}'::jsonb,
  discount_basis_points INTEGER NOT NULL DEFAULT 0 CHECK (discount_basis_points >= 0 AND discount_basis_points <= 9000),
  rounding_strategy     TEXT NOT NULL DEFAULT 'x9_down' CHECK (rounding_strategy IN ('x9_down', 'existing_x9')),
  show_reference_price  BOOLEAN NOT NULL DEFAULT FALSE,
  scope                 TEXT NOT NULL DEFAULT 'new_esim' CHECK (scope IN ('new_esim', 'all', 'specific')),
  applies_to_topup      BOOLEAN NOT NULL DEFAULT FALSE,
  applies_to_cash       BOOLEAN NOT NULL DEFAULT FALSE,
  allow_voucher_stacking BOOLEAN NOT NULL DEFAULT FALSE,
  starts_at             TIMESTAMPTZ NOT NULL,
  ends_at               TIMESTAMPTZ NOT NULL,
  priority              INTEGER NOT NULL DEFAULT 0,
  status                TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'active', 'paused', 'ended')),
  theme_id              TEXT NOT NULL DEFAULT 'standard',
  version               INTEGER NOT NULL DEFAULT 1,
  approved_by           TEXT,
  approved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_promo_dates CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_promotions_status ON public.promotions(status);
CREATE INDEX IF NOT EXISTS idx_promotions_dates ON public.promotions(starts_at, ends_at);
CREATE INDEX IF NOT EXISTS idx_promotions_priority ON public.promotions(priority DESC);

-- 2. Audit logs for all promotion changes
CREATE TABLE IF NOT EXISTS public.promotion_audit_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  promotion_id  UUID NOT NULL REFERENCES public.promotions(id) ON DELETE CASCADE,
  action        TEXT NOT NULL,
  changed_by    TEXT NOT NULL,
  changes       JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_promo_audit_promo_id ON public.promotion_audit_logs(promotion_id);

-- 3. Quotes table for price binding at checkout
CREATE TABLE IF NOT EXISTS public.quotes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  quote_token     TEXT UNIQUE NOT NULL,
  items           JSONB NOT NULL,
  currency        TEXT NOT NULL DEFAULT 'EUR',
  subtotal_cents  INTEGER NOT NULL,
  discount_cents  INTEGER NOT NULL DEFAULT 0,
  total_cents     INTEGER NOT NULL,
  promotion_id    UUID REFERENCES public.promotions(id) ON DELETE SET NULL,
  expires_at      TIMESTAMPTZ NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_token ON public.quotes(quote_token);
CREATE INDEX IF NOT EXISTS idx_quotes_expires_at ON public.quotes(expires_at);

-- 4. Extend tariff_price_history with promotion references
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS is_promotional BOOLEAN DEFAULT FALSE;
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS promotion_id UUID REFERENCES public.promotions(id) ON DELETE SET NULL;
ALTER TABLE public.tariff_price_history ADD COLUMN IF NOT EXISTS regular_price_eur NUMERIC(10,2);

-- 5. Seed templates for Black Week 2026 (Status: draft, so production is inactive)
INSERT INTO public.promotions (
  slug, internal_name, titles, texts, badge_texts,
  discount_basis_points, rounding_strategy, show_reference_price,
  scope, applies_to_topup, applies_to_cash, allow_voucher_stacking,
  starts_at, ends_at, priority, status, theme_id, version
) VALUES
(
  'black-week-2026',
  'Black Week 2026 (15 %)',
  '{"de": "Black Week: 15 % Rabatt auf alle eSIMs", "en": "Black Week: 15% off all eSIMs", "fr": "Black Week : -15% sur toutes les eSIM", "es": "Black Week: 15% de descuento en todas las eSIM", "it": "Black Week: 15% di sconto su tutte le eSIM", "nl": "Black Week: 15% korting op alle eSIMs", "pl": "Black Week: 15% zniżki na wszystkie eSIM", "pt": "Black Week: 15% de desconto em todos os eSIM", "tr": "Black Week: Tüm eSIMlerde %15 İndirim", "sv": "Black Week: 15% rabatt på alla eSIM", "da": "Black Week: 15% rabat på alle eSIM", "fi": "Black Week: 15% alennus kaikista eSIMeistä", "cs": "Black Week: 15% sleva na všechny eSIM", "ro": "Black Week: 15% reducere la toate eSIM-urile", "hu": "Black Week: 15% kedvezmény minden eSIM-re"}'::jsonb,
  '{"de": "Spare 15 % auf alle eSIM-Neukäufe. Gültig bis zum 1. Dezember.", "en": "Save 15% on all new eSIM purchases. Valid until December 1st."}'::jsonb,
  '{"de": "15 % RABATT", "en": "15% OFF"}'::jsonb,
  1500,
  'x9_down',
  false,
  'new_esim',
  false,
  false,
  false,
  '2026-11-22 23:00:00+00', -- 2026-11-23 00:00 Europe/Berlin
  '2026-11-30 23:00:00+00', -- 2026-12-01 00:00 Europe/Berlin
  10,
  'draft',
  'black_week',
  1
),
(
  'black-friday-2026',
  'Black Friday 2026 (25 %)',
  '{"de": "Black Friday: 25 % Rabatt auf alle eSIMs", "en": "Black Friday: 25% off all eSIMs", "fr": "Black Friday : -25% sur toutes les eSIM", "es": "Black Friday: 25% de descuento en todas las eSIM", "it": "Black Friday: 25% di sconto su tutte le eSIM", "nl": "Black Friday: 25% korting op alle eSIMs", "pl": "Black Friday: 25% zniżki na wszystkie eSIM", "pt": "Black Friday: 25% de desconto em todos os eSIM", "tr": "Black Friday: Tüm eSIMlerde %25 İndirim", "sv": "Black Friday: 25% rabatt på alla eSIM", "da": "Black Friday: 25% rabat på alle eSIM", "fi": "Black Friday: 25% alennus kaikista eSIMeistä", "cs": "Black Friday: 25% sleva na všechny eSIM", "ro": "Black Friday: 25% reducere la toate eSIM-urile", "hu": "Black Friday: 25% kedvezmény minden eSIM-re"}'::jsonb,
  '{"de": "Nur heute: Unser größter Rabatt des Jahres! 25 % auf alle neuen eSIM-Tarife.", "en": "Today only: 25% off all new eSIM plans!"}'::jsonb,
  '{"de": "25 % RABATT", "en": "25% OFF"}'::jsonb,
  2500,
  'x9_down',
  false,
  'new_esim',
  false,
  false,
  false,
  '2026-11-26 23:00:00+00', -- 2026-11-27 00:00 Europe/Berlin
  '2026-11-27 23:00:00+00', -- 2026-11-28 00:00 Europe/Berlin
  20,
  'draft',
  'black_friday',
  1
),
(
  'cyber-monday-2026',
  'Cyber Monday 2026 (20 %)',
  '{"de": "Cyber Monday: 20 % Rabatt auf alle eSIMs", "en": "Cyber Monday: 20% off all eSIMs", "fr": "Cyber Monday : -20% sur toutes les eSIM", "es": "Cyber Monday: 20% de descuento en todas las eSIM", "it": "Cyber Monday: 20% di sconto su tutte le eSIM", "nl": "Cyber Monday: 20% korting op alle eSIMs", "pl": "Cyber Monday: 20% zniżki na wszystkie eSIM", "pt": "Cyber Monday: 20% de desconto em todos os eSIM", "tr": "Cyber Monday: Tüm eSIMlerde %20 İndirim", "sv": "Cyber Monday: 20% rabatt på alla eSIM", "da": "Cyber Monday: 20% rabat på alle eSIM", "fi": "Cyber Monday: 20% alennus kaikista eSIMeistä", "cs": "Cyber Monday: 20% sleva na všechny eSIM", "ro": "Cyber Monday: 20% reducere la toate eSIM-urile", "hu": "Cyber Monday: 20% kedvezmény minden eSIM-re"}'::jsonb,
  '{"de": "Cyber Monday Deal: 20 % Rabatt auf alle eSIMs bis Mitternacht.", "en": "Cyber Monday Deal: 20% off all eSIMs until midnight."}'::jsonb,
  '{"de": "20 % RABATT", "en": "20% OFF"}'::jsonb,
  2000,
  'x9_down',
  false,
  'new_esim',
  false,
  false,
  false,
  '2026-11-29 23:00:00+00', -- 2026-11-30 00:00 Europe/Berlin
  '2026-11-30 23:00:00+00', -- 2026-12-01 00:00 Europe/Berlin
  20,
  'draft',
  'cyber_monday',
  1
)
ON CONFLICT (slug) DO NOTHING;
