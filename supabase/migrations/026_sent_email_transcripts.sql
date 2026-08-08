-- 026_sent_email_transcripts.sql
-- Create table for storing sent email transcripts for audit & customer support tracking

CREATE TABLE IF NOT EXISTS public.sent_emails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(255) NOT NULL,
  subject VARCHAR(500) NOT NULL,
  email_type VARCHAR(100) NOT NULL DEFAULT 'custom',
  body_html TEXT NOT NULL,
  body_text TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  status VARCHAR(50) NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast customer email lookup and sorting
CREATE INDEX IF NOT EXISTS idx_sent_emails_recipient ON public.sent_emails(recipient_email);
CREATE INDEX IF NOT EXISTS idx_sent_emails_sent_at ON public.sent_emails(sent_at DESC);
