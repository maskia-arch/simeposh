-- ============================================================
-- eSIM Shop – Blog System Multilingual Translation Migration
-- ============================================================

-- Create post_translations table
CREATE TABLE IF NOT EXISTS public.post_translations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id           UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  locale            TEXT NOT NULL,
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL,
  excerpt           TEXT,
  content           TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT unique_post_locale UNIQUE (post_id, locale),
  CONSTRAINT unique_locale_slug UNIQUE (locale, slug)
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_post_translations_post_id ON public.post_translations(post_id);
CREATE INDEX IF NOT EXISTS idx_post_translations_locale ON public.post_translations(locale);
CREATE INDEX IF NOT EXISTS idx_post_translations_slug ON public.post_translations(slug);

-- Enable RLS
ALTER TABLE public.post_translations ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (view only translated posts of published posts)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='post_translations' AND policyname='post_translations_public_read') THEN
    CREATE POLICY "post_translations_public_read" ON public.post_translations FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.posts
          WHERE posts.id = post_translations.post_id
            AND posts.is_published = true
            AND posts.status = 'approved'
            AND (posts.published_at IS NULL OR posts.published_at <= NOW())
        )
      );
  END IF;
END $$;

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS trg_post_translations_updated_at ON public.post_translations;
CREATE TRIGGER trg_post_translations_updated_at
  BEFORE UPDATE ON public.post_translations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Insert default settings if they don't exist in system_settings
INSERT INTO public.system_settings (key, value, description)
VALUES 
  ('blog_grok_model', 'grok-4.3', 'Modell fuer e-SIM Trend Recherche (Grok)'),
  ('blog_deepseek_model', 'deepseek-v4-flash', 'Modell fuer e-SIM Artikel schreiben (DeepSeek)'),
  ('blog_translator_model', 'deepseek-v4-flash', 'Modell fuer e-SIM Blog Uebersetzungen (DeepSeek)')
ON CONFLICT (key) DO NOTHING;
