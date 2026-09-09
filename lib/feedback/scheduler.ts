/**
 * Autonomous Feedback Background Scheduler
 *
 * Runs continuously in the Next.js Node.js server process (24/7).
 * Periodically checks for customers whose orders were completed >= 48 hours ago
 * and who have not yet submitted a review or received an invitation.
 * Dispatches automated, verified feedback invitation emails in batches.
 */
import { processFeedbackInvites } from '@/lib/feedback/invites';

let isSchedulerRunning = false;
let schedulerInterval: NodeJS.Timeout | null = null;

export function startAutonomousFeedbackScheduler(intervalMs: number = 30 * 60 * 1000): void {
  // Prevent duplicate scheduler instances within the same server process
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((globalThis as any).__autonomousFeedbackSchedulerActive) {
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__autonomousFeedbackSchedulerActive = true;

  console.log(`[Autonomous Feedback Scheduler] Starting background invitation worker (interval: ${intervalMs / 1000}s)...`);

  const runTick = async () => {
    if (isSchedulerRunning) return;
    isSchedulerRunning = true;
    try {
      // Process up to 50 eligible customer invitations per cycle
      const result = await processFeedbackInvites(50);
      if (result.sentCount > 0) {
        console.log(`[Autonomous Feedback Scheduler] Cycle completed: ${result.sentCount} invitation(s) sent (${result.failedCount} failed).`);
      }
    } catch (err: any) {
      console.warn('[Autonomous Feedback Scheduler] Cycle notice:', err?.message || err);
    } finally {
      isSchedulerRunning = false;
    }
  };

  // Run first cycle 45 seconds after server startup
  setTimeout(() => {
    runTick().catch(() => {});
  }, 45 * 1000);

  schedulerInterval = setInterval(runTick, intervalMs);

  if (schedulerInterval && typeof schedulerInterval.unref === 'function') {
    schedulerInterval.unref();
  }
}
