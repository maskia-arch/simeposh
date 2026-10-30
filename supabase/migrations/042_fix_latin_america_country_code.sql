-- Migration 042: Fix Latin America country_code to LATAM to prevent collision with Laos (LA)
-- Assigns unique region code 'LATAM' to all Latin America regional tariffs.

UPDATE tariffs
SET country_code = 'LATAM',
    country_name = 'Latin America',
    region = 'Latin America'
WHERE country_name = 'Latin America'
   OR (country_code = 'LA' AND (
        name ILIKE '%South America%'
     OR name ILIKE '%Latin America%'
     OR package_code IN (
        'CKH487', 'CKH488', 'CKH489', 'CKH490', 'CKH854', 'P6FNJUAP4', 'PHT2G3Z0P',
        'PHE62LA4R', 'PZTX2T09P', 'P0AU9B5BX', 'PV57LJ9ZZ', 'PN4K3WNW2', 'PDGY5S0C2',
        'PTPYXA823', 'PCXZ5ZM73', 'PD12HV4AT', 'P9H8NWNF1', 'PTC1DBU84', 'PDHKH26P5',
        'PWPT8K43N', 'PLE4ZS9J5', 'PNHW685KM', 'P0A46BUCE', 'P98UXDP4Z', 'P1UD5K2YN'
     )
   ));
