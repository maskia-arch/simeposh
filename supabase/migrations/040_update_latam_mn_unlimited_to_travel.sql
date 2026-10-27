-- Migration 040: Update Latin America and Mongolia daily packages from unlimited to travel
-- Ensures neither destination offers Unlimited Builder, removing dead unlimited links and sitemap entries.
UPDATE tariffs
SET tariff_type = 'travel'
WHERE country_code IN ('LATAM', 'MN')
  AND tariff_type LIKE 'unlimited%';
