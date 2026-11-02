-- Migration 043: Order setup_token automation, backfill, and non-colliding region codes for Africa and Middle East

-- 1. Automate setup_token on orders via trigger for ALL order creation and fulfillment paths
CREATE OR REPLACE FUNCTION public.set_order_setup_token()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.setup_token IS NULL OR NEW.setup_token = '' THEN
    NEW.setup_token := md5(random()::text || COALESCE(NEW.id::text, '') || clock_timestamp()::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orders_setup_token ON public.orders;
CREATE TRIGGER trg_orders_setup_token
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.set_order_setup_token();

-- 2. Backfill existing orders where setup_token is missing
UPDATE public.orders
SET setup_token = md5(random()::text || id::text || clock_timestamp()::text)
WHERE setup_token IS NULL OR setup_token = '';

-- 3. Region code for Africa: assign unique region code 'AFRICA' so it never collides with ISO 'AF' (Afghanistan)
UPDATE public.tariffs
SET country_code = 'AFRICA',
    region = 'Africa'
WHERE (country_code = 'AF' OR country_name ILIKE '%Africa%')
  AND country_name NOT ILIKE '%Central African%'
  AND country_name NOT ILIKE '%South Africa%'
  AND country_name NOT ILIKE '%Afghanistan%';

-- 4. Region code for Middle East: assign unique region code 'MIDDLE_EAST' so it never collides with ISO 'ME' (Montenegro)
UPDATE public.tariffs
SET country_code = 'MIDDLE_EAST',
    region = 'Middle East'
WHERE (country_code = 'ME' OR country_name ILIKE '%Middle East%' OR country_name ILIKE '%Gulf%' OR country_name ILIKE '%GCC%')
  AND country_name NOT ILIKE '%Montenegro%';
