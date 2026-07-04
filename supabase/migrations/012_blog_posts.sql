-- ============================================================
-- eSIM Shop – Blog System Schema Migration
-- ============================================================

-- Create posts table
CREATE TABLE IF NOT EXISTS public.posts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title             TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  content           TEXT NOT NULL,
  excerpt           TEXT,
  category          TEXT NOT NULL CONSTRAINT check_category CHECK (category IN ('guide', 'news')),
  featured_image    TEXT,
  published_at      TIMESTAMPTZ,
  is_published      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_posts_slug ON public.posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_category ON public.posts(category);
CREATE INDEX IF NOT EXISTS idx_posts_is_published ON public.posts(is_published);

-- Enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy for public read access (view only published posts)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='posts' AND policyname='posts_public_read') THEN
    CREATE POLICY "posts_public_read" ON public.posts FOR SELECT
      USING (is_published = true AND (published_at IS NULL OR published_at <= NOW()));
  END IF;
END $$;

-- Trigger to automatically update updated_at timestamp
DROP TRIGGER IF EXISTS trg_posts_updated_at ON public.posts;
CREATE TRIGGER trg_posts_updated_at
  BEFORE UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
