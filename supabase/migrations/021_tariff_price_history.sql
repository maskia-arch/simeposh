-- 021 – Tariff Price History and Trigger

-- 1. Create table for price history
CREATE TABLE IF NOT EXISTS public.tariff_price_history (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tariff_id       UUID NOT NULL REFERENCES public.tariffs(id) ON DELETE CASCADE,
  package_code    TEXT NOT NULL,
  price_eur       NUMERIC(10,2) NOT NULL,
  recorded_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Indexes for optimization
CREATE INDEX IF NOT EXISTS idx_price_history_tariff_id ON public.tariff_price_history(tariff_id);
CREATE INDEX IF NOT EXISTS idx_price_history_recorded_at ON public.tariff_price_history(recorded_at);

-- 3. Row Level Security
ALTER TABLE public.tariff_price_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to tariff_price_history" ON public.tariff_price_history;
CREATE POLICY "Allow public read access to tariff_price_history"
  ON public.tariff_price_history
  FOR SELECT
  TO public
  USING (true);

-- 4. Trigger to automatically log price changes
CREATE OR REPLACE FUNCTION log_tariff_price_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.tariff_price_history (tariff_id, package_code, price_eur, recorded_at)
    VALUES (NEW.id, NEW.package_code, NEW.sale_price_eur, NOW());
  ELSIF (TG_OP = 'UPDATE' AND OLD.sale_price_eur IS DISTINCT FROM NEW.sale_price_eur) THEN
    INSERT INTO public.tariff_price_history (tariff_id, package_code, price_eur, recorded_at)
    VALUES (NEW.id, NEW.package_code, NEW.sale_price_eur, NOW());
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_tariff_price_change ON public.tariffs;
CREATE TRIGGER trg_log_tariff_price_change
  AFTER INSERT OR UPDATE ON public.tariffs
  FOR EACH ROW
  EXECUTE FUNCTION log_tariff_price_change();

-- 5. Populate initial history for all existing tariffs if they don't have records
INSERT INTO public.tariff_price_history (tariff_id, package_code, price_eur, recorded_at)
SELECT id, package_code, sale_price_eur, COALESCE(updated_at, created_at, NOW())
FROM public.tariffs t
WHERE NOT EXISTS (
  SELECT 1 FROM public.tariff_price_history h WHERE h.tariff_id = t.id
);
