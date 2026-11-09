/**
 * Next.js Server Lifecycle Instrumentation
 * Automatically boots server-side background services when the Node.js runtime starts.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length < 32) {
      console.error('FATAL: JWT_SECRET environment variable is missing, empty, or shorter than 32 characters. Server cannot start.');
      process.exit(1);
    }
    const { startAutonomousCryptoWatcher } = await import('@/lib/crypto/watcher');
    startAutonomousCryptoWatcher(15000);
  }
}
