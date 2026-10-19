import { fetchDiscountRules } from '@/lib/esimaccess/client';
import { createServiceClient } from '@/lib/supabase/server';

export interface NormalizedPeriodRule {
  minDays: number;
  maxDays: number;
  payRatio: number;
}

export interface PlausibilityResult {
  valid: boolean;
  reason?: string;
  normalizedRules?: NormalizedPeriodRule[];
}

/**
 * Validates the discount rules according to Section B1:
 * - periodRules is an array
 * - sorted ascending by minDays
 * - gapless and without overlaps (starts at 1, each rule begins at prev.maxDays + 1)
 * - minDays >= 1
 * - 0 < payRatio <= 1
 */
export function validatePeriodRules(rawRules: any[]): PlausibilityResult {
  if (!Array.isArray(rawRules) || rawRules.length === 0) {
    return { valid: false, reason: 'periodRules is not a non-empty array' };
  }

  const normalized: NormalizedPeriodRule[] = [];
  for (const r of rawRules) {
    const minDays = Number(r.minDays ?? r.periodNumMin);
    const maxDays = Number(r.maxDays ?? r.periodNumMax);
    const payRatio = Number(r.payRatio);

    if (isNaN(minDays) || isNaN(maxDays) || isNaN(payRatio)) {
      return { valid: false, reason: 'Invalid numeric value in rule' };
    }
    if (minDays < 1) {
      return { valid: false, reason: `minDays must be >= 1, received ${minDays}` };
    }
    if (maxDays < minDays) {
      return { valid: false, reason: `maxDays (${maxDays}) cannot be less than minDays (${minDays})` };
    }
    if (payRatio <= 0 || payRatio > 1) {
      return { valid: false, reason: `payRatio must be > 0 and <= 1, received ${payRatio}` };
    }

    normalized.push({ minDays, maxDays, payRatio });
  }

  // Sort ascending by minDays
  normalized.sort((a, b) => a.minDays - b.minDays);

  // Check gapless and no overlap
  for (let i = 0; i < normalized.length; i++) {
    if (i === 0) {
      if (normalized[i].minDays !== 1) {
        return { valid: false, reason: `First period must start at 1, starts at ${normalized[i].minDays}` };
      }
    } else {
      const prev = normalized[i - 1];
      const curr = normalized[i];
      if (curr.minDays !== prev.maxDays + 1) {
        return {
          valid: false,
          reason: `Gap or overlap detected between period ${prev.minDays}-${prev.maxDays} and ${curr.minDays}-${curr.maxDays}`,
        };
      }
    }
  }

  return { valid: true, normalizedRules: normalized };
}

/**
 * Synchronizes discount rules from eSIM Access for given codes.
 * Re-validates plausibility and performs safe atomic upsert.
 */
export async function syncDiscountRules(codes: string[]): Promise<{
  synced: number;
  skipped: number;
  errors: string[];
}> {
  const supabase = createServiceClient();
  let synced = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const code of codes) {
    const cleanCode = (code || '').trim();
    if (!cleanCode) continue;

    try {
      const res = await fetchDiscountRules(cleanCode);
      const list = res?.obj?.list ?? (res as any)?.obj?.discountRuleList ?? [];
      const ruleItem = list.find((r: any) => r.discountRuleCode === cleanCode) ?? list[0];

      if (!ruleItem) {
        console.warn(`[syncDiscountRules] Provider returned no discount rule for code: ${cleanCode}`);
        skipped++;
        continue;
      }

      const periodRules = ruleItem.periodRuleList ?? ruleItem.periodRules ?? [];
      const validation = validatePeriodRules(periodRules);

      if (!validation.valid || !validation.normalizedRules) {
        console.warn(
          `[syncDiscountRules] Plausibility check failed for rule ${cleanCode}: ${validation.reason}. Keeping existing DB rule.`
        );
        errors.push(`Plausibility failed for ${cleanCode}: ${validation.reason}`);
        skipped++;
        continue;
      }

      const validFromStr = ruleItem.validPeriod?.startTime ?? ruleItem.validFrom ?? null;
      const validToStr = ruleItem.validPeriod?.endTime ?? ruleItem.validTo ?? null;

      const validFrom = validFromStr ? new Date(validFromStr).toISOString() : null;
      const validTo = validToStr ? new Date(validToStr).toISOString() : null;

      const { error: upsertErr } = await supabase
        .from('discount_rules')
        .upsert(
          {
            discount_rule_code: cleanCode,
            reward_type: ruleItem.rewardType ?? null,
            period_rules: JSON.stringify(validation.normalizedRules) as any,
            valid_from: validFrom,
            valid_to: validTo,
            synced_at: new Date().toISOString(),
          },
          { onConflict: 'discount_rule_code' }
        );

      if (upsertErr) {
        console.error(`[syncDiscountRules] DB upsert failed for rule ${cleanCode}:`, upsertErr.message);
        errors.push(`DB error for ${cleanCode}: ${upsertErr.message}`);
        skipped++;
      } else {
        console.log(`[syncDiscountRules] Successfully synced discount rule: ${cleanCode} (${validation.normalizedRules.length} tiers)`);
        synced++;
      }
    } catch (err: any) {
      console.warn(`[syncDiscountRules] Request failed for code ${cleanCode}:`, err?.message || err);
      errors.push(`Fetch error for ${cleanCode}: ${err?.message || err}`);
      skipped++;
    }
  }

  return { synced, skipped, errors };
}
