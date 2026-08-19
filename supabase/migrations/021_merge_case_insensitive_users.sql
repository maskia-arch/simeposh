-- Migration: 021_merge_case_insensitive_users.sql
-- 1. Deduplicate public.users where emails differ only by case (e.g. Willkommenbrabus@gmail.com vs willkommenbrabus@gmail.com)
DO $$
DECLARE
  r RECORD;
  primary_id UUID;
  dup_id UUID;
BEGIN
  -- Find duplicate emails in public.users ignoring case
  FOR r IN (
    SELECT LOWER(TRIM(email)) AS email_clean, array_agg(id ORDER BY created_at ASC) AS user_ids
    FROM public.users
    GROUP BY LOWER(TRIM(email))
    HAVING count(*) > 1
  ) LOOP
    primary_id := r.user_ids[1];
    
    -- Reassign all related foreign keys to primary_id
    FOR i IN 2..array_length(r.user_ids, 1) LOOP
      dup_id := r.user_ids[i];
      UPDATE public.orders SET user_id = primary_id WHERE user_id = dup_id;
      UPDATE public.esim_cash_accounts SET user_id = primary_id WHERE user_id = dup_id;
      UPDATE public.esim_cash_transactions SET user_id = primary_id WHERE user_id = dup_id;
      UPDATE public.support_tickets SET user_id = primary_id WHERE user_id = dup_id;
      UPDATE public.verification_tokens SET user_id = primary_id WHERE user_id = dup_id;
      
      -- Delete the duplicate user row
      DELETE FROM public.users WHERE id = dup_id;
    END LOOP;
  END LOOP;
END $$;

-- 2. Deduplicate public.esim_cash_accounts where emails differ only by case
DO $$
DECLARE
  r RECORD;
  primary_acc_id UUID;
  total_balance NUMERIC;
  total_spend NUMERIC;
  max_queue INT;
  dup_acc_id UUID;
BEGIN
  FOR r IN (
    SELECT LOWER(TRIM(email)) AS email_clean, array_agg(id ORDER BY created_at ASC) AS acc_ids
    FROM public.esim_cash_accounts
    GROUP BY LOWER(TRIM(email))
    HAVING count(*) > 1
  ) LOOP
    primary_acc_id := r.acc_ids[1];
    
    SELECT COALESCE(SUM(balance_eur), 0), COALESCE(SUM(total_spend_eur), 0), COALESCE(MAX(extra_cashback_queue), 0)
    INTO total_balance, total_spend, max_queue
    FROM public.esim_cash_accounts
    WHERE id = ANY(r.acc_ids);
    
    UPDATE public.esim_cash_accounts
    SET balance_eur = total_balance,
        total_spend_eur = total_spend,
        extra_cashback_queue = max_queue,
        email = r.email_clean
    WHERE id = primary_acc_id;
    
    -- Delete duplicate accounts
    FOR i IN 2..array_length(r.acc_ids, 1) LOOP
      dup_acc_id := r.acc_ids[i];
      DELETE FROM public.esim_cash_accounts WHERE id = dup_acc_id;
    END LOOP;
  END LOOP;
END $$;

-- 3. Normalize all existing email strings in all database tables to lowercase
UPDATE public.users SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));
UPDATE public.orders SET customer_email = LOWER(TRIM(customer_email)) WHERE customer_email != LOWER(TRIM(customer_email));
UPDATE public.crypto_sessions SET customer_email = LOWER(TRIM(customer_email)) WHERE customer_email != LOWER(TRIM(customer_email));
UPDATE public.esim_cash_accounts SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));
UPDATE public.esim_cash_transactions SET email = LOWER(TRIM(email)) WHERE email != LOWER(TRIM(email));
UPDATE public.support_tickets SET customer_email = LOWER(TRIM(customer_email)) WHERE customer_email != LOWER(TRIM(customer_email));
UPDATE public.support_messages SET sender_email = LOWER(TRIM(sender_email)) WHERE sender_email != LOWER(TRIM(sender_email));
UPDATE public.verification_tokens SET new_email = LOWER(TRIM(new_email)) WHERE new_email IS NOT NULL AND new_email != LOWER(TRIM(new_email));
UPDATE public.sent_emails SET recipient_email = LOWER(TRIM(recipient_email)) WHERE recipient_email != LOWER(TRIM(recipient_email));

-- 4. Re-link any orphaned guest orders to the customer's registered user_id
UPDATE public.orders o
SET user_id = u.id
FROM public.users u
WHERE o.user_id IS NULL AND LOWER(TRIM(o.customer_email)) = LOWER(TRIM(u.email));

-- 5. Re-link any guest eSIM cash accounts to the registered user_id
UPDATE public.esim_cash_accounts a
SET user_id = u.id
FROM public.users u
WHERE a.user_id IS NULL AND LOWER(TRIM(a.email)) = LOWER(TRIM(u.email));

-- 6. Trigger Function to automatically force lowercase and trim on all future inserts and updates
CREATE OR REPLACE FUNCTION public.normalize_email_column()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    IF TG_TABLE_NAME IN ('orders', 'crypto_sessions', 'support_tickets') THEN
      IF NEW.customer_email IS NOT NULL THEN
        NEW.customer_email := LOWER(TRIM(NEW.customer_email));
      END IF;
    ELSIF TG_TABLE_NAME = 'support_messages' THEN
      IF NEW.sender_email IS NOT NULL THEN
        NEW.sender_email := LOWER(TRIM(NEW.sender_email));
      END IF;
    ELSIF TG_TABLE_NAME = 'verification_tokens' THEN
      IF NEW.new_email IS NOT NULL THEN
        NEW.new_email := LOWER(TRIM(NEW.new_email));
      END IF;
    ELSIF TG_TABLE_NAME = 'sent_emails' THEN
      IF NEW.recipient_email IS NOT NULL THEN
        NEW.recipient_email := LOWER(TRIM(NEW.recipient_email));
      END IF;
    ELSE
      IF NEW.email IS NOT NULL THEN
        NEW.email := LOWER(TRIM(NEW.email));
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach triggers to all tables
DROP TRIGGER IF EXISTS trg_normalize_email_users ON public.users;
CREATE TRIGGER trg_normalize_email_users
  BEFORE INSERT OR UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_orders ON public.orders;
CREATE TRIGGER trg_normalize_email_orders
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_crypto_sessions ON public.crypto_sessions;
CREATE TRIGGER trg_normalize_email_crypto_sessions
  BEFORE INSERT OR UPDATE ON public.crypto_sessions
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_esim_cash_accounts ON public.esim_cash_accounts;
CREATE TRIGGER trg_normalize_email_esim_cash_accounts
  BEFORE INSERT OR UPDATE ON public.esim_cash_accounts
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_esim_cash_transactions ON public.esim_cash_transactions;
CREATE TRIGGER trg_normalize_email_esim_cash_transactions
  BEFORE INSERT OR UPDATE ON public.esim_cash_transactions
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_support_tickets ON public.support_tickets;
CREATE TRIGGER trg_normalize_email_support_tickets
  BEFORE INSERT OR UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();

DROP TRIGGER IF EXISTS trg_normalize_email_sent_emails ON public.sent_emails;
CREATE TRIGGER trg_normalize_email_sent_emails
  BEFORE INSERT OR UPDATE ON public.sent_emails
  FOR EACH ROW EXECUTE FUNCTION public.normalize_email_column();
