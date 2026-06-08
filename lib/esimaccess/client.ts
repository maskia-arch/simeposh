/**
 * esimaccess API client
 *
 * Base URL: https://api.esimaccess.com/api/v1/open
 * Auth:     POST header  RT-AccessCode: <accessCode>
 * Prices:   1/10 000 USD  →  divide by 10 000 to get USD dollars
 * Volume:   bytes         →  divide by 1 073 741 824 to get GB
 */
import type {
  EsimAccessListResponse,
  EsimAccessAllocateResponse,
  TopUpPackageListResponse,
  TopUpOrderResponse,
  EsimStatusResponse,
  EsimAccessPackage,
  TariffType,
} from './types';

// ── Config ───────────────────────────────────────────────────

function getConfig() {
  const apiUrl     = process.env.ESIMACCESS_API_URL;
  const accessCode = process.env.ESIMACCESS_ACCESS_CODE;
  if (!apiUrl || !accessCode) {
    throw new Error(
      'Missing esimaccess config: set ESIMACCESS_API_URL and ESIMACCESS_ACCESS_CODE'
    );
  }
  return { apiUrl, accessCode };
}

async function esimRequest<T>(
  endpoint: string,
  body: Record<string, unknown>
): Promise<T> {
  const { apiUrl, accessCode } = getConfig();
  const url = `${apiUrl}${endpoint}`;

  const res = await fetch(url, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'RT-AccessCode': accessCode,
    },
    body:   JSON.stringify(body),
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`esimaccess HTTP ${res.status} on ${endpoint}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Unit helpers ─────────────────────────────────────────────

/** Convert raw API price (1/10 000 USD units) to USD dollars */
export function priceToUsd(rawPrice: number): number {
  return rawPrice / 10_000;
}

/** Convert bytes to GB, rounded to 3 decimal places */
export function bytesToGb(bytes: number): number {
  if (!bytes || bytes === 0) return 0;
  return Math.round((bytes / 1_073_741_824) * 1000) / 1000;
}

/**
 * Extract volume in bytes from a package, handling both
 * the new `volume` field (bytes) and legacy `dataAmount` (MB).
 */
export function getVolumeBytes(pkg: EsimAccessPackage): number {
  if (typeof pkg.volume === 'number' && pkg.volume > 0) return pkg.volume;
  if (typeof pkg.dataAmount === 'number' && pkg.dataAmount > 0) {
    return pkg.dataAmount * 1_048_576; // MB → bytes
  }
  return 0;
}

/**
 * Detect which tariff category a package belongs to.
 *
 * Travel      – fixed data volume (volume > 0)
 * Unlimited Eco – unlimited with FUP throttle ≤ 512 kbps
 * Unlimited Pro – unlimited with FUP throttle ≥ 1 000 kbps (1 Mbps)
 */
export function detectTariffType(pkg: EsimAccessPackage): TariffType {
  const volumeBytes = getVolumeBytes(pkg);
  const isUnlimited =
    volumeBytes === 0 ||
    pkg.dataType === 2 ||
    (pkg.type ?? '').toUpperCase().includes('UNLIMITED') ||
    (pkg.name ?? '').toLowerCase().includes('unlimited') ||
    (pkg.name ?? '').toLowerCase().includes('daily') ||
    (pkg.name ?? '').toLowerCase().includes('day pass');

  if (!isUnlimited) return 'travel';

  // Parse throttle speed (may come as number kbps or string "512kbps" / "1Mbps")
  let speedKbps = 0;
  if (typeof pkg.speed === 'number') {
    speedKbps = pkg.speed;
  } else if (typeof pkg.speed === 'string') {
    const m = pkg.speed.match(/(\d+(?:\.\d+)?)\s*(k|m)?bps?/i);
    if (m) {
      const val  = parseFloat(m[1]);
      const unit = (m[2] ?? '').toLowerCase();
      speedKbps  = unit === 'm' ? val * 1000 : val;
    }
  }

  // Name-based heuristics as fallback
  const nameLower = (pkg.name ?? '').toLowerCase();
  if (speedKbps >= 1000 || nameLower.includes('pro') || nameLower.includes('1mbps')) {
    return 'unlimited_pro';
  }
  return 'unlimited_eco';
}

/**
 * Parse location codes from either the new `location` field
 * ("DE,FR,IT") or the legacy `locationCode` field ("DE").
 */
export function parseLocationCodes(pkg: EsimAccessPackage): string[] {
  if (pkg.location) {
    return pkg.location.split(',').map((c) => c.trim().toUpperCase()).filter(Boolean);
  }
  if (pkg.locationCode) return [pkg.locationCode.toUpperCase()];
  return [];
}

/** Derive a display country name from a package */
export function getCountryName(pkg: EsimAccessPackage): string {
  if (pkg.locationName) return pkg.locationName;
  const codes = parseLocationCodes(pkg);
  if (codes.length === 1) {
    try {
      return new Intl.DisplayNames(['en'], { type: 'region' }).of(codes[0]) ?? codes[0];
    } catch { return codes[0]; }
  }
  if (codes.length > 1) {
    // Detect well-known regions
    const eu = ['AT','BE','BG','CY','CZ','DE','DK','EE','ES','FI','FR','GR','HR','HU',
                 'IE','IT','LT','LU','LV','MT','NL','PL','PT','RO','SE','SI','SK'];
    const hasEu = codes.filter((c) => eu.includes(c)).length >= 5;
    if (hasEu) return 'Europe';
    if (codes.some(c => ['US','CA','MX'].includes(c)) && codes.length <= 4) return 'North America';
    if (codes.some(c => ['AU','NZ'].includes(c)) && codes.length <= 4) return 'Oceania';
    return `${codes.length} Countries`;
  }
  return pkg.name ?? 'Unknown';
}

/** Country flag emoji from ISO code */
export function getFlagEmoji(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  try {
    return code.toUpperCase().split('').map(c =>
      String.fromCodePoint(127397 + c.charCodeAt(0))
    ).join('');
  } catch { return '🌐'; }
}

// ── Package List (with full pagination) ──────────────────────

const PAGE_SIZE = 200; // max per request; adjust if API cap differs
const MAX_PAGES = 50;  // safety ceiling = 10 000 packages

/**
 * Fetch ONE page of packages from POST /package/list.
 * esimaccess uses pageNum (1-based) + pageSize for pagination.
 */
async function fetchPackagePage(
  extraFilters: Record<string, unknown>,
  pageNum: number
): Promise<EsimAccessListResponse> {
  return esimRequest<EsimAccessListResponse>('/package/list', {
    locationCode: '',
    type:         '',
    packageCode:  '',
    iccid:        '',
    slug:         '',
    pageNum,
    pageSize:     PAGE_SIZE,
    ...extraFilters,
  });
}

/**
 * Fetch ALL packages for a given filter set, handling pagination.
 * Loops through pages until no more results are returned.
 */
async function fetchAllPages(
  extraFilters: Record<string, unknown> = {}
): Promise<EsimAccessPackage[]> {
  const all: EsimAccessPackage[] = [];

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchPackagePage(extraFilters, page);
    if (!res.success || !res.obj) break;

    const list = res.obj.packageList ?? res.obj.packageInfoList ?? [];
    all.push(...list);

    // Stop if we received fewer items than page size (last page),
    // or if the API tells us the total page count explicitly.
    const totalPages = res.obj.totalPageNum ?? null;
    if (totalPages !== null && page >= totalPages) break;
    if (list.length < PAGE_SIZE) break;
  }

  return all;
}

/**
 * Fetch ALL travel (fixed-data) packages across all pages.
 */
export async function fetchTravelPackages(): Promise<EsimAccessPackage[]> {
  return fetchAllPages({});
}

/**
 * Fetch ALL unlimited/day-pass packages (Eco + Pro) across all pages.
 */
export async function fetchUnlimitedPackages(): Promise<EsimAccessPackage[]> {
  return fetchAllPages({ dataType: 2 });
}

/** Fetch both categories, merge and deduplicate by packageCode */
export async function fetchAllPackages(): Promise<EsimAccessListResponse> {
  const [travelResult, unlimitedResult] = await Promise.allSettled([
    fetchTravelPackages(),
    fetchUnlimitedPackages(),
  ]);

  const travelList    = travelResult.status    === 'fulfilled' ? travelResult.value    : [];
  const unlimitedList = unlimitedResult.status === 'fulfilled' ? unlimitedResult.value : [];

  console.log(`[esimaccess] fetched ${travelList.length} travel + ${unlimitedList.length} unlimited packages`);

  // Mark unlimited so detectTariffType works reliably
  const markedUnlimited = unlimitedList.map((p) => ({ ...p, dataType: 2 as const }));

  // Deduplicate (unlimited query can overlap travel)
  const seen   = new Set(travelList.map((p) => p.packageCode));
  const merged = [
    ...travelList,
    ...markedUnlimited.filter((p) => !seen.has(p.packageCode)),
  ];

  return {
    success:   true,
    errorCode: null,
    obj:       { packageList: merged },
  };
}

/** Helper: get operators from a package (handles both field names) */
export function getOperatorList(pkg: EsimAccessPackage): import('./types').OperatorInfo[] {
  return pkg.operatorList ?? pkg.networkList ?? [];
}

// ── eSIM Provisioning ─────────────────────────────────────────

export async function allocateEsim(
  packageCode: string,
  orderRef:    string
): Promise<EsimAccessAllocateResponse> {
  // Step 1: place order
  const orderRes = await esimRequest<{
    success:   boolean;
    errorCode: string;
    obj: {
      orderNo:   string;
      esimList?: Array<{
        iccid: string; lpaCode: string; smdpAddress: string;
        matchingId: string; qrCodeUrl: string; apn: string; msisdn: string;
      }>;
    };
  }>('/order/open', {
    packageInfoList: [{ packageCode, count: 1, price: 0 }],
    transactionId:   orderRef,
  });

  if (!orderRes.success) {
    throw new Error(`esimaccess order failed (${orderRes.errorCode}) for ${packageCode}`);
  }

  // Some versions return eSIM immediately
  const esimList = orderRes.obj?.esimList;
  if (esimList && esimList.length > 0) {
    return { success: true, errorCode: '0', obj: esimList[0] };
  }

  // Fallback: query by orderNo
  const queryRes = await esimRequest<EsimAccessAllocateResponse>(
    '/order/query',
    { orderNo: orderRes.obj.orderNo }
  );

  if (!queryRes.success) {
    throw new Error(`esimaccess query failed (${queryRes.errorCode})`);
  }
  return queryRes;
}

// ── Top-Up ───────────────────────────────────────────────────

export async function fetchTopUpPackages(iccid: string): Promise<TopUpPackageListResponse> {
  return esimRequest<TopUpPackageListResponse>('/package/list', {
    iccid,
    type:         'TOPUP',
    packageCode:  '',
    locationCode: '',
    slug:         '',
  });
}

export async function applyTopUp(
  iccid:       string,
  packageCode: string,
  orderRef:    string
): Promise<TopUpOrderResponse> {
  const res = await esimRequest<TopUpOrderResponse>('/esim/topup', {
    iccid,
    packageCode,
    transactionId: orderRef,
  });
  if (!res.success) {
    throw new Error(`esimaccess top-up failed (${res.errorCode}) for ICCID ${iccid}`);
  }
  return res;
}

// ── eSIM Status ───────────────────────────────────────────────

export async function getEsimStatus(iccid: string): Promise<EsimStatusResponse> {
  return esimRequest<EsimStatusResponse>('/esim/query', { iccid });
}
