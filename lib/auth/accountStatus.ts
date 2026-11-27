import { query as defaultQuery } from '@/lib/db';
import { isSpecialAdminAccount } from './isAdmin';

export type AccountStatus = 'active' | 'soft_locked' | 'hard_locked';

export interface EffectiveAccountState {
  status: AccountStatus;
  isHardLocked: boolean;
  isSoftLocked: boolean;
  cashFrozen: boolean;
  lockReason: string | null;
  lockedUntil: string | null;
  isDeleted: boolean;
  isVerified: boolean;
  resolvedEmail: string | null;
}

const RANK: Record<AccountStatus, number> = {
  active: 0,
  soft_locked: 1,
  hard_locked: 2,
};

function evaluateRowStatus(row: {
  account_status?: string | null;
  locked_until?: string | Date | null;
} | null | undefined): AccountStatus {
  if (!row) return 'active';
  const raw = String(row.account_status || 'active').trim();
  if (raw !== 'soft_locked' && raw !== 'hard_locked') return 'active';
  if (row.locked_until) {
    const untilMs = new Date(row.locked_until).getTime();
    if (Number.isFinite(untilMs) && untilMs <= Date.now()) {
      return 'active';
    }
  }
  return raw;
}

/**
 * Evaluates effective account restriction state across `public.users` and `public.customer_restrictions`.
 * Most restrictive active state wins (hard_locked > soft_locked > active).
 * Never surfaces `admin_notes` and never locks the configured admin account.
 */
export async function getEffectiveAccountStatus(
  opts: { userId?: string | null; email?: string | null },
  queryFn: (text: string, params?: any[]) => Promise<{ rows: any[] }> = defaultQuery
): Promise<EffectiveAccountState> {
  const cleanEmail = opts.email ? String(opts.email).trim().toLowerCase() : null;
  const cleanUserId = opts.userId ? String(opts.userId).trim() : null;

  if (cleanEmail && isSpecialAdminAccount(cleanEmail)) {
    return {
      status: 'active',
      isHardLocked: false,
      isSoftLocked: false,
      cashFrozen: false,
      lockReason: null,
      lockedUntil: null,
      isDeleted: false,
      isVerified: true,
      resolvedEmail: cleanEmail,
    };
  }

  let userRow: any = null;
  if (cleanUserId) {
    const uRes = await queryFn(
      `SELECT id, email, deleted_at, is_verified, account_status, lock_reason, locked_until, cash_frozen
       FROM public.users
       WHERE id = $1
       LIMIT 1`,
      [cleanUserId]
    );
    userRow = uRes.rows[0] || null;
  } else if (cleanEmail) {
    const uRes = await queryFn(
      `SELECT id, email, deleted_at, is_verified, account_status, lock_reason, locked_until, cash_frozen
       FROM public.users
       WHERE LOWER(TRIM(email)) = $1
       LIMIT 1`,
      [cleanEmail]
    );
    userRow = uRes.rows[0] || null;
  }

  const resolvedEmail = (userRow?.email ? String(userRow.email).trim().toLowerCase() : cleanEmail) || null;

  if (resolvedEmail && isSpecialAdminAccount(resolvedEmail)) {
    return {
      status: 'active',
      isHardLocked: false,
      isSoftLocked: false,
      cashFrozen: false,
      lockReason: null,
      lockedUntil: null,
      isDeleted: false,
      isVerified: Boolean(userRow?.is_verified),
      resolvedEmail,
    };
  }

  let restrictionRow: any = null;
  if (resolvedEmail) {
    try {
      const rRes = await queryFn(
        `SELECT email, account_status, lock_reason, locked_until, cash_frozen
         FROM public.customer_restrictions
         WHERE LOWER(TRIM(email)) = $1
         LIMIT 1`,
        [resolvedEmail]
      );
      restrictionRow = rRes.rows[0] || null;
    } catch {
      // Safe fallback if table isn't initialized yet
    }
  }

  const userStatus = evaluateRowStatus(userRow);
  const restrStatus = evaluateRowStatus(restrictionRow);
  const status: AccountStatus = RANK[restrStatus] >= RANK[userStatus] ? restrStatus : userStatus;

  const isDeleted = Boolean(userRow?.deleted_at);
  const isHardLocked = status === 'hard_locked' || isDeleted;
  const isSoftLocked = !isHardLocked && status === 'soft_locked';
  const cashFrozen = Boolean(userRow?.cash_frozen || restrictionRow?.cash_frozen || status !== 'active');

  const sourceForMeta = RANK[restrStatus] >= RANK[userStatus] && restrStatus !== 'active' ? restrictionRow : userRow;
  const lockReason = status !== 'active' ? (sourceForMeta?.lock_reason || restrictionRow?.lock_reason || userRow?.lock_reason || null) : null;
  const lockedUntilRaw = status !== 'active' ? (sourceForMeta?.locked_until || null) : null;
  const lockedUntil = lockedUntilRaw ? new Date(lockedUntilRaw).toISOString() : null;

  return {
    status,
    isHardLocked,
    isSoftLocked,
    cashFrozen,
    lockReason,
    lockedUntil,
    isDeleted,
    isVerified: Boolean(userRow?.is_verified),
    resolvedEmail,
  };
}

export function getAccountLockMessage(
  state: Pick<EffectiveAccountState, 'isHardLocked' | 'isSoftLocked' | 'cashFrozen'>,
  locale = 'de'
): string {
  const isDe = String(locale || 'de').toLowerCase().startsWith('de');
  if (state.isHardLocked) {
    return isDe
      ? 'Dein Kundenkonto wurde gesperrt. Bitte wende dich an unseren Support.'
      : 'Your account has been suspended. Please contact support.';
  }
  if (state.isSoftLocked) {
    return isDe
      ? 'Dein Konto ist derzeit für neue Käufe und Kontoänderungen eingeschränkt. Bereits gekaufte eSIMs bleiben in deinem Konto einsehbar.'
      : 'Your account is currently restricted from making new purchases or account changes. Previously purchased eSIMs remain accessible in your dashboard.';
  }
  if (state.cashFrozen) {
    return isDe
      ? 'Dein eSIM Cash Guthaben ist derzeit eingefroren. Bitte kontaktiere unseren Support.'
      : 'Your eSIM Cash balance is currently frozen. Please contact support.';
  }
  return '';
}
