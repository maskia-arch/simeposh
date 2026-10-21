-- Migration 036: Enforce RLS on user orders, tickets, and cash accounts
-- Ensures users can strictly read only their own data in Supabase

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth') THEN
    ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "orders_user_isolation" ON public.orders;
    CREATE POLICY "orders_user_isolation" ON public.orders
      FOR SELECT
      USING (auth.uid() = user_id);

    ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "tickets_user_isolation" ON public.support_tickets;
    CREATE POLICY "tickets_user_isolation" ON public.support_tickets
      FOR SELECT
      USING (auth.uid() = user_id);

    ALTER TABLE public.esim_cash_accounts ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "cash_account_user_isolation" ON public.esim_cash_accounts;
    CREATE POLICY "cash_account_user_isolation" ON public.esim_cash_accounts
      FOR SELECT
      USING (auth.jwt() ->> 'email' = email OR auth.uid()::text = user_id::text);
  ELSE
    RAISE NOTICE 'Skipping RLS policies: auth schema only exists on Supabase Cloud';
  END IF;
END $$;
