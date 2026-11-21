/**
 * Time utility for PureSim.
 *
 * In production:
 * Always returns the real server time via new Date().
 * Time travel code paths are strictly excluded and inactive.
 *
 * In test environment (NEXT_PUBLIC_IS_TESTENV === 'true'):
 * Allows simulating dates (before start, exact start, switch, exact end, after end)
 * set ONLY via the internal testenv endpoint /api/testenv/time.
 * Strictly ignores any query parameters or HTTP request headers.
 */

let testTimeOffsetMs = 0;

export function getNow(): Date {
  if (process.env.NEXT_PUBLIC_IS_TESTENV === 'true' && testTimeOffsetMs !== 0) {
    return new Date(Date.now() + testTimeOffsetMs);
  }
  return new Date();
}

export function getNowIso(): string {
  return getNow().toISOString();
}

export function setTestTimeOffset(offsetMs: number) {
  if (process.env.NEXT_PUBLIC_IS_TESTENV !== 'true') {
    throw new Error('Time travel is forbidden outside testenv');
  }
  testTimeOffsetMs = offsetMs;
}

export function setTestTimeTarget(targetIsoOrNull: string | null) {
  if (process.env.NEXT_PUBLIC_IS_TESTENV !== 'true') {
    throw new Error('Time travel is forbidden outside testenv');
  }
  if (!targetIsoOrNull) {
    testTimeOffsetMs = 0;
    return;
  }
  const targetMs = new Date(targetIsoOrNull).getTime();
  if (isNaN(targetMs)) {
    throw new Error('Invalid date format for time travel target');
  }
  testTimeOffsetMs = targetMs - Date.now();
}

export function getTestTimeStatus() {
  const isTest = process.env.NEXT_PUBLIC_IS_TESTENV === 'true';
  return {
    is_testenv: isTest,
    offset_ms: isTest ? testTimeOffsetMs : 0,
    current_time: getNow().toISOString(),
    real_time: new Date().toISOString(),
  };
}
