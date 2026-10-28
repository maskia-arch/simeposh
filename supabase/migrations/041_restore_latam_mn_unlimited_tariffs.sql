-- Migration 041: Restore LATAM and Mongolia Unlimited Tariffs and separate Laos from Latin America
-- Fix 4 zu Run 8

-- 1. Ensure clean separation between Laos (LA) and Latin America (LATAM)
UPDATE public.tariffs
SET country_code = 'LATAM', country_name = 'Latin America', region = 'Latin America'
WHERE is_active = true AND name ILIKE '%south america%';

UPDATE public.tariffs
SET country_code = 'LA', country_name = 'Laos', region = NULL
WHERE is_active = true AND name ILIKE '%laos%';

-- 2. Restore 9 Unlimited Eco package codes
UPDATE public.tariffs
SET tariff_type = 'unlimited_eco'
WHERE package_code IN (
  -- Latin America Eco (5)
  'PCXZ5ZM73', 'PD12HV4AT', 'P9H8NWNF1', 'PTC1DBU84', 'PDHKH26P5',
  -- Mongolia Eco (4)
  'PJD54GJ6M', 'PYH26SCCM', 'P0SD4UGB3', 'PDC3EBD75'
);

-- 3. Restore 9 Unlimited Pro package codes
UPDATE public.tariffs
SET tariff_type = 'unlimited_pro'
WHERE package_code IN (
  -- Latin America Pro (6)
  'PWPT8K43N', 'PLE4ZS9J5', 'PNHW685KM', 'P0A46BUCE', 'P98UXDP4Z', 'P1UD5K2YN',
  -- Mongolia Pro (3)
  'PG97V8HQJ', 'P86S4YNBP', 'PF2HP0HV4'
);
