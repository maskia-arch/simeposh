/**
 * Autonomous Crypto Background Watcher
 * 
 * Runs continuously in the Next.js Node.js server process (24/7).
 * Checks all active and recently expired crypto checkout sessions directly on-chain
 * without requiring the local pure-wallet or admin dashboard to be online.
 * Automatically marks sessions as paid, updates orders, and fulfills eSIM deliveries.
 */
import { createServiceClient } from '@/lib/supabase/server';
import { syncAllActiveCryptoSessions } from '@/app/api/crypto/session/[id]/route';
import { sweepFailedEmailDeliveries } from '@/lib/fulfillment';

let isWatcherRunning = false;
let watcherInterval: NodeJS.Timeout | null = null;

export function startAutonomousCryptoWatcher(intervalMs: number = 15000): void {
  // Prevent duplicate watchers within the same process
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).__autonomousCryptoWatcherActive) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__autonomousCryptoWatcherActive = true;

  console.log(`[Autonomous Crypto Watcher] Starting background polling service (interval: ${intervalMs}ms)...`);

  const runTick = async () => {
    if (isWatcherRunning) return;
    isWatcherRunning = true;
    try {
      const db = createServiceClient();
      const count = await syncAllActiveCryptoSessions(db);
      if (count > 0) {
        console.log(`[Autonomous Crypto Watcher] Checked ${count} active/recent sessions.`);
      }

      // Automatically retry any undelivered emails for completed orders
      await sweepFailedEmailDeliveries(db).catch(() => {});
    } catch (err) {
      console.warn('[Autonomous Crypto Watcher] Polling cycle notice:', (err as Error).message);
    } finally {
      isWatcherRunning = false;
    }
  };

  // Run initial tick immediately (delayed slightly to let app initialize)
  setTimeout(() => {
    runTick().catch(() => {});
  }, 3000);

  watcherInterval = setInterval(runTick, intervalMs);

  if (watcherInterval && typeof watcherInterval.unref === 'function') {
    watcherInterval.unref();
  }
}
