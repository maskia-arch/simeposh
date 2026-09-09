/**
 * Next.js Server Lifecycle Instrumentation
 * Automatically boots server-side background services when the Node.js runtime starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutonomousCryptoWatcher } = await import('@/lib/crypto/watcher');
    startAutonomousCryptoWatcher(15000);

    const { startAutonomousFeedbackScheduler } = await import('@/lib/feedback/scheduler');
    startAutonomousFeedbackScheduler(30 * 60 * 1000); // Runs every 30m for 24h eligible feedback invites
  }
}
