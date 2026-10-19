import { query as runQuery } from '@/lib/db';
import { fetchTopUpPackages, EsimAccessPackage } from '@/lib/esimaccess/client';
import { createServiceClient } from '@/lib/supabase/server';

export interface TopUpEligibility {
  allowed: boolean;
  reason: 'ok' | 'limit_reached' | 'not_supported';
  used: number;
  remaining: number;
  mode: 'data_and_validity' | 'validity_only' | 'none';
}

/**
 * Single source of truth for eSIM reloadability and top-up eligibility.
 *
 * Rules:
 * - active_type === 3 (or raw_data.activeType === 3) -> NOT reloadable
 * - support_top_up_type NOT IN (2, 3) (or raw_data.supportTopUpType NOT IN (2, 3)) -> NOT reloadable
 * - topup_count >= 9 -> LIMIT REACHED (allowed = false)
 * - Otherwise allowed = true (mode: validity_only for supportTopUpType 3, data_and_validity for 2)
 */
export function getTopUpEligibility(
  esim: { topup_count?: number | null; iccid?: string } | null | undefined,
  plan: {
    active_type?: number | null;
    support_top_up_type?: number | null;
    raw_data?: any;
    is_top_up_eligible?: boolean | null;
  } | null | undefined
): TopUpEligibility {
  const activeType =
    plan?.active_type ??
    (plan?.raw_data?.activeType != null ? Number(plan.raw_data.activeType) : 2);

  const supportTopUpType =
    plan?.support_top_up_type ??
    (plan?.raw_data?.supportTopUpType != null
      ? Number(plan.raw_data.supportTopUpType)
      : plan?.is_top_up_eligible === true
      ? 2
      : 1);

  const used = Math.max(0, Math.min(9, esim?.topup_count ?? 0));
  const remaining = Math.max(0, 9 - used);

  // Check plan support
  const isSupported = activeType !== 3 && (supportTopUpType === 2 || supportTopUpType === 3);

  if (!isSupported) {
    return {
      allowed: false,
      reason: 'not_supported',
      used,
      remaining,
      mode: 'none',
    };
  }

  // Check top-up limit (max 9)
  if (used >= 9) {
    return {
      allowed: false,
      reason: 'limit_reached',
      used: 9,
      remaining: 0,
      mode: supportTopUpType === 3 ? 'validity_only' : 'data_and_validity',
    };
  }

  return {
    allowed: true,
    reason: 'ok',
    used,
    remaining,
    mode: supportTopUpType === 3 ? 'validity_only' : 'data_and_validity',
  };
}

/**
 * Fetch or initialize the topup_count for an ICCID from the esims table.
 */
export async function getEsimRecord(iccid: string): Promise<{ iccid: string; topup_count: number } | null> {
  if (!iccid) return null;
  try {
    const res = await runQuery('SELECT iccid, topup_count FROM public.esims WHERE iccid = $1', [iccid]);
    if (res.rows && res.rows.length > 0) {
      return { iccid: res.rows[0].iccid, topup_count: Number(res.rows[0].topup_count) };
    }

    // If not in esims table yet, check orders
    const countRes = await runQuery(`
      SELECT COUNT(*)::int AS cnt
      FROM public.orders
      WHERE order_type = 'top_up' AND status = 'completed' AND COALESCE(top_up_iccid, iccid) = $1
    `, [iccid]);
    const initialCount = Math.min(9, Number(countRes.rows?.[0]?.cnt ?? 0));

    // Insert into esims
    const insRes = await runQuery(`
      INSERT INTO public.esims (iccid, topup_count)
      VALUES ($1, $2)
      ON CONFLICT (iccid) DO UPDATE SET updated_at = NOW()
      RETURNING iccid, topup_count
    `, [iccid, initialCount]);

    return { iccid: insRes.rows[0].iccid, topup_count: Number(insRes.rows[0].topup_count) };
  } catch (err) {
    console.error(`[lib/topup] Error fetching eSIM record for ${iccid}:`, err);
    return { iccid, topup_count: 0 };
  }
}

/**
 * Checks if there is already an active, unexpired pending top-up crypto session for this ICCID.
 * Rule: "Pro ICCID darf höchstens eine offene, unbezahlte Top-up-Session existieren.
 * So können zwei parallele Zahlungen das Limit nicht überschreiten."
 */
export async function hasPendingTopUpSession(iccid: string): Promise<boolean> {
  if (!iccid) return false;
  try {
    const nowIso = new Date().toISOString();
    // Check orders with order_type = 'top_up' and status IN ('pending', 'paid', 'provisioning')
    // and matching top_up_iccid that belong to a pending crypto session
    const res = await runQuery(`
      SELECT s.id 
      FROM public.crypto_sessions s
      JOIN public.orders o ON o.id = ANY(s.order_ids)
      WHERE s.status = 'pending'
        AND (s.expires_at IS NULL OR s.expires_at > $1)
        AND o.order_type = 'top_up'
        AND COALESCE(o.top_up_iccid, o.iccid) = $2
      LIMIT 1
    `, [nowIso, iccid]);

    return (res.rows && res.rows.length > 0);
  } catch (err) {
    console.error(`[lib/topup] Error checking pending session for ${iccid}:`, err);
    return false;
  }
}

/**
 * Atomically increment topup_count after successful provider response.
 * Idempotency: only increments if this order hasn't already been fulfilled.
 */
export async function atomicIncrementTopUpCount(
  iccid: string,
  orderId?: string
): Promise<{ success: boolean; newCount: number }> {
  try {
    // Check if order already recorded/completed to ensure idempotency
    if (orderId) {
      const orderCheck = await runQuery('SELECT status FROM public.orders WHERE id = $1', [orderId]);
      if (orderCheck.rows?.[0]?.status === 'completed') {
        // Already completed, do not increment again (idempotent)
        const currentEsim = await runQuery('SELECT topup_count FROM public.esims WHERE iccid = $1', [iccid]);
        return { success: true, newCount: Number(currentEsim.rows?.[0]?.topup_count ?? 0) };
      }
    }

    // Ensure row exists
    await runQuery(`
      INSERT INTO public.esims (iccid, topup_count)
      VALUES ($1, 0)
      ON CONFLICT (iccid) DO NOTHING
    `, [iccid]);

    const res = await runQuery(`
      UPDATE public.esims 
      SET topup_count = topup_count + 1, updated_at = NOW() 
      WHERE iccid = $1 AND topup_count < 9 
      RETURNING topup_count
    `, [iccid]);

    if (!res.rows || res.rows.length === 0) {
      console.error(`[lib/topup] Atomic increment failed: ICCID ${iccid} has already reached topup_count 9`);
      return { success: false, newCount: 9 };
    }

    const newCount = Number(res.rows[0].topup_count);
    return { success: true, newCount };
  } catch (err) {
    console.error(`[lib/topup] Atomic increment error for ${iccid}:`, err);
    throw err;
  }
}

// In-memory cache for available topup packages (TTL = 3 minutes)
interface CacheEntry {
  packages: any[];
  timestamp: number;
}
const topUpPackageCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export async function fetchTopUpPackagesCached(
  iccid: string,
  originTariffSlug?: string
): Promise<any[]> {
  const cacheKey = `${iccid}:${originTariffSlug || ''}`;
  const hit = topUpPackageCache.get(cacheKey);
  if (hit && Date.now() - hit.timestamp < CACHE_TTL_MS) {
    return hit.packages;
  }

  const res = await fetchTopUpPackages(iccid, originTariffSlug);
  if (!res.success) {
    throw new Error(res.errorCode || 'topup_error_general');
  }

  const pkgs = res.obj?.packageList ?? [];
  topUpPackageCache.set(cacheKey, { packages: pkgs, timestamp: Date.now() });
  return pkgs;
}
