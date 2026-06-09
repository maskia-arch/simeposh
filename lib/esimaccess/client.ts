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

// ── Region definitions ────────────────────────────────────────

export interface RegionInfo {
  /** Virtual country code stored in DB (always 2 uppercase letters for flags, or GLOB/MULTI) */
  code: string;
  /** English display name */
  name: string;
  /** Member country codes (subset match is enough) */
  members: string[];
  /** Minimum member matches to qualify */
  minMatch: number;
}

export const REGIONS: RegionInfo[] = [
  {
    code: 'EU', name: 'Europe',
    members: ['AT','BE','BG','CH','CY','CZ','DE','DK','EE','ES','FI','FR','GB','GR',
               'HR','HU','IE','IS','IT','LI','LT','LU','LV','MT','NL','NO','PL','PT',
               'RO','SE','SI','SK','AL','BA','ME','MK','RS','TR','UA','MD','GE','AM','AZ'],
    minMatch: 5,
  },
  {
    code: 'AS', name: 'Asia',
    members: ['CN','JP','KR','TH','VN','SG','MY','ID','PH','IN','BD','LK','MM','KH',
               'LA','MN','KZ','UZ','TJ','KG','TM','NP','BT','MV','PK','AF'],
    minMatch: 4,
  },
  {
    code: 'ME', name: 'Middle East',
    members: ['AE','SA','QA','KW','BH','OM','JO','LB','IL','IQ','IR','YE','SY'],
    minMatch: 3,
  },
  {
    code: 'NA', name: 'North America',
    members: ['US','CA','MX'],
    minMatch: 2,
  },
  {
    code: 'LA', name: 'Latin America',
    members: ['BR','AR','CL','CO','PE','VE','EC','BO','PY','UY','CR','PA','GT','HN',
               'SV','NI','DO','CU','JM','TT','BB','GY','SR'],
    minMatch: 4,
  },
  {
    code: 'OC', name: 'Oceania',
    members: ['AU','NZ','FJ','PG','SB','VU','WS','TO','KI','FM','PW','MH','NR','TV'],
    minMatch: 2,
  },
  {
    code: 'AF', name: 'Africa',
    members: ['ZA','NG','KE','GH','TZ','ET','EG','MA','TN','DZ','SN','CI','CM',
               'UG','ZW','MZ','ZM','BW','RW','MG','AO','SD','LY'],
    minMatch: 4,
  },
  {
    code: 'SEA', name: 'Southeast Asia',
    members: ['SG','MY','TH','ID','PH','VN','MM','KH','LA','BN','TL'],
    minMatch: 4,
  },
];

/**
 * Detect which region a set of country codes belongs to.
 * Returns the best matching region, or null for single-country or no match.
 */
export function detectRegion(codes: string[]): RegionInfo | null {
  if (codes.length <= 1) return null;
  let best: RegionInfo | null = null;
  let bestScore = 0;
  for (const region of REGIONS) {
    const matches = codes.filter(c => region.members.includes(c)).length;
    const score = matches / Math.max(codes.length, region.members.length);
    if (matches >= region.minMatch && score > bestScore) {
      best = region;
      bestScore = score;
    }
  }
  return best;
}

/** Full English country name from an ISO alpha-2 code (falls back to the code). */
export function isoCountryName(code: string): string {
  if (!code || code.length !== 2) return code;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/**
 * Derive a clean, customer-friendly display name from a package.
 *
 * Single country      → "Germany"
 * Recognised region   → "Europe", "Asia", "Middle East", …
 * Large multi-country  → "Global"            (>= 40 countries)
 * Small multi-country  → "Germany & Austria" / "Germany, Austria +3"
 *
 * Never returns ugly placeholders like "2 Countries" / "30 Länder".
 */
export function getCountryName(pkg: EsimAccessPackage): string {
  const codes = parseLocationCodes(pkg);

  // ── Single country ──────────────────────────────────────────
  if (codes.length === 1) {
    return pkg.locationName?.trim() || isoCountryName(codes[0]);
  }

  // ── Multi-country ───────────────────────────────────────────
  if (codes.length > 1) {
    // 1) Prefer a recognised region (Europe / Asia / …)
    const region = detectRegion(codes);
    if (region) return region.name;

    // 2) A clean human name from the API (not a comma-separated code dump)
    const apiName = pkg.locationName?.trim();
    if (apiName && !apiName.includes(',') && !/^\d/.test(apiName) && apiName.length < 40) {
      return apiName;
    }

    // 3) Very large bundle → Global
    if (codes.length >= 40) return 'Global';

    // 4) Otherwise build a readable short list of real country names
    const names = codes.slice(0, 2).map(isoCountryName);
    if (codes.length === 2) return names.join(' & ');
    return `${names.join(', ')} +${codes.length - 2}`;
  }

  return pkg.name ?? 'Unknown';
}

/** Virtual region code for multi-country packages */
export function getRegionCode(codes: string[]): string {
  if (codes.length === 0) return 'XX';
  if (codes.length === 1) return codes[0];
  const region = detectRegion(codes);
  return region?.code ?? 'GLOB';
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

// ── Package List (with robust de-duplicating pagination) ─────

const PAGE_SIZE = 200; // requested page size
const MAX_PAGES = 60;  // hard safety ceiling

/**
 * Fetch ONE page of packages from POST /package/list.
 * NOTE: The esimaccess /package/list endpoint in practice IGNORES pageNum
 * and returns the FULL catalogue on every call. The de-duplicating loop in
 * fetchAllPages handles this correctly (it stops as soon as a page adds no
 * new packageCodes), while still supporting real pagination if the API ever
 * starts honouring pageNum.
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
 * Fetch ALL packages for a given filter set.
 *
 * De-duplicates by packageCode across pages. This is critical because the
 * esimaccess API returns the entire catalogue on every paginated request
 * (ignoring pageNum) — without de-dup we previously stored the same ~2 800
 * packages 50 times (= "140 000" phantom rows that collapsed back to 2 800
 * on upsert).
 *
 * Stop conditions (any one ends the loop):
 *   1. API reports totalPageNum and we've reached it.
 *   2. A page returns 0 packages.
 *   3. A page adds NO new packageCodes → the API isn't paginating / we've
 *      seen the whole catalogue.
 */
async function fetchAllPages(
  extraFilters: Record<string, unknown> = {}
): Promise<EsimAccessPackage[]> {
  const byCode = new Map<string, EsimAccessPackage>();

  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await fetchPackagePage(extraFilters, page);
    if (!res.success || !res.obj) break;

    const list = res.obj.packageList ?? res.obj.packageInfoList ?? [];
    if (list.length === 0) break;

    const sizeBefore = byCode.size;
    for (const pkg of list) {
      if (pkg?.packageCode) byCode.set(pkg.packageCode, pkg);
    }
    const added = byCode.size - sizeBefore;

    const totalPages = res.obj.totalPageNum ?? null;
    if (totalPages !== null && page >= totalPages) break;
    // The decisive guard: page added nothing new → API returned a duplicate
    // full list (or we've exhausted the catalogue). Stop immediately.
    if (added === 0) break;
    // Genuine pagination would return a short final page.
    if (totalPages === null && list.length < PAGE_SIZE) break;
  }

  return Array.from(byCode.values());
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

  if (travelResult.status === 'rejected') {
    console.error('[esimaccess] travel fetch failed:', travelResult.reason);
  }
  if (unlimitedResult.status === 'rejected') {
    console.error('[esimaccess] unlimited fetch failed:', unlimitedResult.reason);
  }

  // Merge + de-duplicate by packageCode (single source of truth).
  // Travel first, then unlimited overrides only NEW codes (marked dataType:2).
  const byCode = new Map<string, EsimAccessPackage>();
  for (const p of travelList) {
    if (p?.packageCode) byCode.set(p.packageCode, p);
  }
  let unlimitedNew = 0;
  for (const p of unlimitedList) {
    if (!p?.packageCode) continue;
    if (!byCode.has(p.packageCode)) {
      byCode.set(p.packageCode, { ...p, dataType: 2 as const });
      unlimitedNew++;
    }
  }

  const merged = Array.from(byCode.values());

  console.log(
    `[esimaccess] distinct packages: ${merged.length} ` +
    `(travel=${travelList.length}, unlimited=${unlimitedList.length}, unlimited-new=${unlimitedNew})`
  );

  return {
    success:   true,
    errorCode: null,
    obj:       { packageList: merged },
  };
}

/** Helper: get operators from a package (handles all esimaccess shapes) */
export function getOperatorList(pkg: EsimAccessPackage): import('./types').OperatorInfo[] {
  if (pkg.operatorList?.length) return pkg.operatorList;
  if (pkg.networkList?.length)  return pkg.networkList;
  // Newer API nests operators per location under locationNetworkList
  const nested = (pkg.locationNetworkList ?? []).flatMap((l) => l.operatorList ?? []);
  return nested;
}

// ── eSIM Provisioning ─────────────────────────────────────────

export async function allocateEsim(
  packageCode: string,
  orderRef:    string,
  opts?: {
    /** Day-pass duration in days → esimaccess `periodNum`. */
    periodNum?: number;
    /** Total esimaccess price in 1/10 000 USD units (per-day raw × periodNum). */
    priceRaw?:  number;
    /** Number of identical eSIMs (default 1). */
    count?:     number;
  }
): Promise<EsimAccessAllocateResponse> {
  const count = opts?.count ?? 1;

  // Build the package line. For day-pass plans esimaccess requires `periodNum`
  // and a `price` of (per-day price × periodNum). Travel plans accept price 0.
  const item: Record<string, unknown> = {
    packageCode,
    count,
    price: opts?.priceRaw && opts.priceRaw > 0 ? Math.round(opts.priceRaw) : 0,
  };
  if (opts?.periodNum && opts.periodNum > 0) {
    item.periodNum = opts.periodNum;
  }

  // Step 1: place order
  const orderRes = await esimRequest<{
    success:   boolean;
    errorCode: string;
    obj: {
      orderNo:   string;
      esimList?: Array<{
        iccid: string; lpaCode: string; smdpAddress: string;
        matchingId: string; qrCodeUrl: string; apn: string; msisdn: string;
        shortUrl?: string; ac?: string;
      }>;
    };
  }>('/order/open', {
    packageInfoList: [item],
    transactionId:   orderRef,
    amount:          item.price,   // total amount must match the sum of prices
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

/** Normalised lifecycle state shown to customers. */
export type EsimLifecycle = 'new' | 'in_use' | 'used' | 'unknown';

/** Map any esimaccess status string to our 3-state lifecycle. */
export function normalizeEsimStatus(raw: string | null | undefined): EsimLifecycle {
  const s = (raw ?? '').toUpperCase();
  if (!s) return 'unknown';
  if (/(USED_?UP|DEPLET|EXPIR|FINISH|USED_?EXPIRED|REVOKE|DELETE)/.test(s)) return 'used';
  if (/(IN_?USE|ACTIVE|ENABLED|ONBOARD)/.test(s))                           return 'in_use';
  if (/(NOT_?ACTIVE|NEW|READY|GOT_?RESOURCE|RELEASED|INSTALL|NOT_?ACTIVATED|ENABLE_?READY)/.test(s)) return 'new';
  return 'unknown';
}

/**
 * Query the current lifecycle status of a single eSIM by ICCID.
 * Defensive against the various esimaccess response shapes; never throws.
 */
export async function queryEsimLifecycle(iccid: string): Promise<EsimLifecycle> {
  try {
    const res = await esimRequest<{
      success?: boolean;
      obj?: {
        status?: string;
        esimStatus?: string;
        smdpStatus?: string;
        esimList?: Array<{ esimStatus?: string; smdpStatus?: string; status?: string }>;
      } | null;
    }>('/esim/query', { iccid });

    const obj = res.obj;
    const raw =
      obj?.esimList?.[0]?.esimStatus ??
      obj?.esimList?.[0]?.status ??
      obj?.esimStatus ??
      obj?.status ??
      obj?.esimList?.[0]?.smdpStatus ??
      obj?.smdpStatus ??
      null;

    return normalizeEsimStatus(raw);
  } catch (err) {
    console.error('[esimaccess] status query failed for', iccid, err);
    return 'unknown';
  }
}
