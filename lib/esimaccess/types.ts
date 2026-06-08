// ─── esimaccess API Types (/api/v1/open/* endpoints) ─────────
// API base: https://api.esimaccess.com/api/v1/open
// Auth:     Header  RT-AccessCode: <accessCode>
// Prices:   integer in 1/10000 USD  (70000 = $7.00)
// Volume:   bytes  (1 073 741 824 = 1 GB)

export type TariffType = 'travel' | 'unlimited_eco' | 'unlimited_pro';

// ─── Package list ─────────────────────────────────────────────

export interface OperatorInfo {
  operatorName:  string;
  networkType?:  string;   // "2G" | "3G" | "4G" | "LTE" | "5G"
  countryCode?:  string;
}

/** One package as returned by POST /package/list */
export interface EsimAccessPackage {
  packageCode:    string;
  slug?:          string;
  name:           string;
  /** Price in 1/10 000 USD units. Divide by 10 000 to get USD. */
  price:          number;
  currencyCode:   string;       // "USD"
  /** Data volume in bytes. 0 = unlimited */
  volume:         number;
  /** Also "dataAmount" in some API versions (MB) – handled in client */
  dataAmount?:    number;
  duration:       number;
  durationUnit?:  string;       // "DAY"
  /** Comma-separated ISO-3166-1 alpha-2 country codes e.g. "DE,FR,IT" */
  location?:      string;
  /** Single-country code – older API field */
  locationCode?:  string;
  locationName?:  string;
  /** Throttle speed in kbps after FUP (unlimited plans only) */
  speed?:         number | string;
  /** "DATA" | "TOPUP" | "UNLIMITED" – may vary by API version */
  type?:          string;
  /** dataType: 0 = travel/data, 2 = unlimited/day-pass */
  dataType?:      number;
  description?:   string;
  retailPrice?:   number;
  smsStatus?:     number;
  unusedValidityDay?: number;
  supportTopUpType?: number;
  ipExport?:      boolean;
  /** List of mobile network operators providing coverage */
  operatorList?:  OperatorInfo[];
  /** Alternative field name used by some API versions */
  networkList?:   OperatorInfo[];
  /** Supporting network types summary e.g. "4G/LTE" */
  supportedNetworkTypes?: string;
}

export interface EsimAccessListResponse {
  success:    boolean;
  errorCode:  string | null;
  errorMsg?:  string | null;
  obj: {
    packageList?:     EsimAccessPackage[];
    packageInfoList?: EsimAccessPackage[];
    /** Total number of pages for paginated endpoints */
    totalPageNum?:    number;
    /** Total number of packages across all pages */
    totalCount?:      number;
    pageSize?:        number;
    pageNum?:         number;
  } | null;
}

// ─── Order / Provisioning ─────────────────────────────────────

export interface EsimDetail {
  iccid:       string;
  /** Full LPA string: LPA:1:<smdpAddress>$<matchingId> */
  lpaCode:     string;
  smdpAddress: string;
  matchingId:  string;
  qrCodeUrl:   string;
  apn:         string;
  msisdn:      string;
}

export interface EsimAccessAllocateResponse {
  success:   boolean;
  errorCode: string;
  obj:       EsimDetail;
}

// ─── Top-Up ───────────────────────────────────────────────────

export interface TopUpPackage {
  packageCode:  string;
  name:         string;
  price:        number;   // 1/10 000 USD
  volume:       number;   // bytes (0 = unlimited)
  dataAmount?:  number;   // MB – older field
  duration:     number;
  durationUnit?: string;
  location?:    string;
  locationCode?: string;
  description?: string;
  operatorList?: OperatorInfo[];
}

export interface TopUpPackageListResponse {
  success:   boolean;
  errorCode: string | null;
  obj: {
    packageList?: TopUpPackage[];
  } | null;
}

export interface TopUpOrderResponse {
  success:   boolean;
  errorCode: string;
  obj: { orderNo: string; };
}

// ─── eSIM Status ─────────────────────────────────────────────

export interface EsimStatusResponse {
  success:   boolean;
  errorCode: string;
  obj: {
    iccid:          string;
    status:         string;   // "IN_USE" | "NOT_ACTIVATED" | "EXPIRED"
    dataRemaining:  number;   // bytes
    dataTotal:      number;   // bytes
    expiredTime:    string;
    smdpStatus:     string;
  };
}
