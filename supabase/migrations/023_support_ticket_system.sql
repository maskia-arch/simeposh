-- ============================================================
-- PureSim – Support Ticket System Schema (023_support_ticket_system.sql)
-- Idempotent schema migration for customer support tickets and messages
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.support_ticket_seq START WITH 10001;

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_number  TEXT NOT NULL UNIQUE DEFAULT ('TK-' || nextval('public.support_ticket_seq')::text),
  user_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  customer_email TEXT NOT NULL,
  customer_name  TEXT,
  subject        TEXT NOT NULL,
  category       TEXT NOT NULL DEFAULT 'general',
  status         TEXT NOT NULL DEFAULT 'open',
  priority       TEXT NOT NULL DEFAULT 'medium',
  invoice_id     TEXT,
  iccid          TEXT,
  order_id       UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id        UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sender_type      TEXT NOT NULL DEFAULT 'customer',
  sender_email     TEXT NOT NULL,
  sender_name      TEXT,
  message          TEXT NOT NULL,
  is_internal_note BOOLEAN NOT NULL DEFAULT FALSE,
  attachments      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for lightning-fast queries
CREATE INDEX IF NOT EXISTS idx_support_tickets_email      ON public.support_tickets(customer_email);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status     ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_ticket_num ON public.support_tickets(ticket_number);
CREATE INDEX IF NOT EXISTS idx_support_tickets_iccid      ON public.support_tickets(iccid);
CREATE INDEX IF NOT EXISTS idx_support_tickets_invoice    ON public.support_tickets(invoice_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id  ON public.ticket_messages(ticket_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
