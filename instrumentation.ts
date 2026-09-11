/**
 * Next.js Server Lifecycle Instrumentation
 * Automatically boots server-side background services when the Node.js runtime starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startAutonomousCryptoWatcher } = await import('@/lib/crypto/watcher');
    startAutonomousCryptoWatcher(15000);
  }
}
