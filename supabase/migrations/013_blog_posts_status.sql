-- ============================================================
-- eSIM Shop – Blog System status Column Migration
-- ============================================================

-- Add status column to posts table
ALTER TABLE public.posts 
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'approved' 
  CONSTRAINT check_status CHECK (status IN ('review', 'approved', 'rejected'));

-- Update the public select policy to ensure only approved & published posts can be read
DROP POLICY IF EXISTS "posts_public_read" ON public.posts;
CREATE POLICY "posts_public_read" ON public.posts FOR SELECT
  USING (is_published = true AND status = 'approved' AND (published_at IS NULL OR published_at <= NOW()));
