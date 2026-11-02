/**
 * In-memory IP rate limiter for order status lookups and order pages.
 * Limit: 30 requests per minute per IP.
 */

interface RateLimitRecord {
  timestamps: number[];
}

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30;

const ipMap = new Map<string, RateLimitRecord>();

// Clean up stale entries periodically without leaking timers
let lastPrune = Date.now();
function pruneStale(now: number) {
  if (now - lastPrune < 60 * 1000 && ipMap.size < 5000) return;
  lastPrune = now;
  ipMap.forEach((record, ip) => {
    record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);
    if (record.timestamps.length === 0) {
      ipMap.delete(ip);
    }
  });
}

export function checkOrderRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  pruneStale(now);
  const cleanIp = ip.split(',')[0].trim() || 'unknown';
  let record = ipMap.get(cleanIp);

  if (!record) {
    record = { timestamps: [] };
    ipMap.set(cleanIp, record);
  }

  // Remove timestamps older than window
  record.timestamps = record.timestamps.filter((ts) => now - ts < WINDOW_MS);

  if (record.timestamps.length >= MAX_REQUESTS) {
    const oldest = record.timestamps[0];
    const retryAfter = Math.max(1, Math.ceil((oldest + WINDOW_MS - now) / 1000));
    return { allowed: false, retryAfter };
  }

  record.timestamps.push(now);
  return { allowed: true };
}
