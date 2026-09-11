import { query } from '@/lib/db';

export const MAX_DAILY_EMAILS = 200;
export const MAX_MONTHLY_EMAILS = 3000;
export const TRANSACTIONAL_BUFFER = 10; // Reserve for critical eSIM delivery & top-ups

export interface QuotaStatus {
  dailySent: number;
  dailyRemaining: number;
  monthlySent: number;
  monthlyRemaining: number;
  isDailyLimitReached: boolean;
  isMonthlyLimitReached: boolean;
  canSendTransactional: boolean;
  canSendMarketing: boolean;
  lastResetAt: Date;
  nextResetAt: Date;
}

/**
 * Computes the most recent 03:00 German time (Europe/Berlin) reset timestamp,
 * and the upcoming 03:00 reset timestamp.
 */
export function get0300ResetWindow(now: Date = new Date()): { lastReset: Date; nextReset: Date } {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts = formatter.formatToParts(now);
  const getPart = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  const hour = getPart('hour');

  const isAfterTodayReset = hour >= 3;

  let lastResetDateStr: string;
  let nextResetDateStr: string;

  if (isAfterTodayReset) {
    lastResetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T03:00:00`;
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomParts = formatter.formatToParts(tomorrow);
    const getTomPart = (type: string) => parseInt(tomParts.find((p) => p.type === type)?.value || '0', 10);
    nextResetDateStr = `${getTomPart('year')}-${String(getTomPart('month')).padStart(2, '0')}-${String(getTomPart('day')).padStart(2, '0')}T03:00:00`;
  } else {
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yestParts = formatter.formatToParts(yesterday);
    const getYestPart = (type: string) => parseInt(yestParts.find((p) => p.type === type)?.value || '0', 10);
    lastResetDateStr = `${getYestPart('year')}-${String(getYestPart('month')).padStart(2, '0')}-${String(getYestPart('day')).padStart(2, '0')}T03:00:00`;
    nextResetDateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T03:00:00`;
  }

  const parseBerlinTime = (isoString: string) => {
    const testDate = new Date(`${isoString}Z`);
    const tzName = new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Berlin', timeZoneName: 'short' })
      .formatToParts(testDate)
      .find((p) => p.type === 'timeZoneName')?.value;
    const isDst = tzName === 'CEST' || tzName === 'GMT+2';
    const offset = isDst ? '+02:00' : '+01:00';
    return new Date(`${isoString}${offset}`);
  };

  return {
    lastReset: parseBerlinTime(lastResetDateStr),
    nextReset: parseBerlinTime(nextResetDateStr),
  };
}

/**
 * Returns the start of the current month in UTC.
 */
export function getStartOfCurrentMonth(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
}

/**
 * Evaluates current Resend Free Tier quota usage across daily (200) and monthly (3000) caps.
 */
export async function getEmailQuotaStatus(now: Date = new Date()): Promise<QuotaStatus> {
  const { lastReset, nextReset } = get0300ResetWindow(now);
  const startOfMonth = getStartOfCurrentMonth(now);

  const { rows } = await query(
    `SELECT 
       count(*) FILTER (WHERE sent_at >= $1) AS daily_sent,
       count(*) FILTER (WHERE sent_at >= $2) AS monthly_sent
     FROM public.sent_emails
     WHERE status = 'sent'`,
    [lastReset.toISOString(), startOfMonth.toISOString()]
  );

  const dailySent = parseInt(rows[0]?.daily_sent || '0', 10);
  const monthlySent = parseInt(rows[0]?.monthly_sent || '0', 10);

  const dailyRemaining = Math.max(0, MAX_DAILY_EMAILS - dailySent);
  const monthlyRemaining = Math.max(0, MAX_MONTHLY_EMAILS - monthlySent);

  const isDailyLimitReached = dailyRemaining <= 0;
  const isMonthlyLimitReached = monthlyRemaining <= 0;

  // Transactional emails (eSIM delivery, TopUp) can be sent as long as we haven't hit the hard limit of 200 or 3000
  const canSendTransactional = !isDailyLimitReached && !isMonthlyLimitReached;

  // Marketing / feedback emails must leave a safety buffer so real purchases never get blocked
  const canSendMarketing =
    dailyRemaining > TRANSACTIONAL_BUFFER &&
    monthlyRemaining > TRANSACTIONAL_BUFFER;

  return {
    dailySent,
    dailyRemaining,
    monthlySent,
    monthlyRemaining,
    isDailyLimitReached,
    isMonthlyLimitReached,
    canSendTransactional,
    canSendMarketing,
    lastResetAt: lastReset,
    nextResetAt: nextReset,
  };
}
