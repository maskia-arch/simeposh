-- Migration 030: Update is_top_up_eligible based on eSIMAccess supportTopUpType
-- eSIMAccess standard:
-- supportTopUpType = 1 -> NOT reloadable
-- supportTopUpType = 2 or 3 -> Reloadable

UPDATE public.tariffs
SET is_top_up_eligible = TRUE
WHERE (raw_data->>'supportTopUpType')::int IN (2, 3);

UPDATE public.tariffs
SET is_top_up_eligible = FALSE
WHERE (raw_data->>'supportTopUpType')::int NOT IN (2, 3) 
   OR raw_data->>'supportTopUpType' IS NULL;
