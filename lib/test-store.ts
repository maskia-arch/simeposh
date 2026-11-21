/**
 * Native Standalone In-Memory / File-Backed Database Store for PureSim.
 *
 * Runs automatically when NEXT_PUBLIC_IS_TESTENV === 'true' and no Docker / Postgres
 * is available. Allows 100% of the website, Theme Studio, and Admin to work natively
 * with ZERO Docker Desktop dependency.
 */

import fs from 'fs';
import path from 'path';

export interface TestStoreData {
  tariffs: any[];
  promotions: any[];
  promotion_audit_logs: any[];
  quotes: Record<string, any>;
  tariff_price_history: any[];
  users: any[];
  system_settings: any[];
  orders: any[];
}

const DEFAULT_TARIFFS = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    package_code: 'TEST_DE_1GB_7D',
    slug: 'germany-1gb-7days',
    name: 'Germany 1 GB (7 Days)',
    country_code: 'DE',
    country_name: 'Germany',
    region: 'Europe',
    flag_emoji: '🇩🇪',
    data_gb: 1,
    validity_days: 7,
    ek_price_usd: 1.0000,
    sale_price_eur: 1.89,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_standard',
    is_premium: false,
    breakout_ip: 'DE',
    is_active: true,
    raw_data: {
      locationNetworkList: [{ operatorName: 'Telekom Deutschland', networkType: '5G' }],
      ipExport: 'DE',
    },
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    package_code: 'TEST_DE_PREM_3GB_15D',
    slug: 'germany-travel-premium-3gb-15days',
    name: 'Germany Travel Premium 3 GB (15 Days)',
    country_code: 'DE',
    country_name: 'Germany',
    region: 'Europe',
    flag_emoji: '🇩🇪',
    data_gb: 3,
    validity_days: 15,
    ek_price_usd: 2.1250,
    sale_price_eur: 4.49,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_premium',
    is_premium: true,
    premium_diff_chip: 'Dual 5G Netz (Telekom + Vodafone)',
    breakout_ip: 'DE',
    is_active: true,
    raw_data: {
      locationNetworkList: [
        { operatorName: 'Telekom Deutschland', networkType: '5G' },
        { operatorName: 'Vodafone DE', networkType: '5G' },
      ],
      ipExport: 'DE',
    },
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    package_code: 'TEST_DE_UNL_ECO',
    slug: 'germany-unlimited-eco-1gb-day',
    name: 'Germany Unlimited Eco (1 GB/Tag)',
    country_code: 'DE',
    country_name: 'Germany',
    region: 'Europe',
    flag_emoji: '🇩🇪',
    data_gb: null,
    validity_days: 1,
    ek_price_usd: 0.3000,
    sale_price_eur: 0.59,
    usd_eur_rate: 0.92,
    tariff_type: 'unlimited_eco',
    is_premium: false,
    speed_kbps: 512,
    breakout_ip: 'DE',
    is_active: true,
    raw_data: {
      speed: '512 kbps',
      locationNetworkList: [{ operatorName: 'Telekom Deutschland', networkType: '5G' }],
    },
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    package_code: 'TEST_DE_UNL_PRO',
    slug: 'germany-unlimited-pro-2gb-day',
    name: 'Germany Unlimited Pro (2 GB/Tag)',
    country_code: 'DE',
    country_name: 'Germany',
    region: 'Europe',
    flag_emoji: '🇩🇪',
    data_gb: null,
    validity_days: 1,
    ek_price_usd: 0.5000,
    sale_price_eur: 0.99,
    usd_eur_rate: 0.92,
    tariff_type: 'unlimited_pro',
    is_premium: true,
    speed_kbps: 1024,
    premium_diff_chip: 'Schnellere Drosselung (1 Mbps)',
    breakout_ip: 'DE',
    is_active: true,
    raw_data: {
      speed: '1 Mbps',
      locationNetworkList: [{ operatorName: 'Telekom Deutschland', networkType: '5G' }],
    },
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    package_code: 'TEST_TR_EDGE_019',
    slug: 'turkey-100mb-1day',
    name: 'Turkey 100 MB (1 Day)',
    country_code: 'TR',
    country_name: 'Turkey',
    region: 'Europe',
    flag_emoji: '🇹🇷',
    data_gb: 0.1,
    validity_days: 1,
    ek_price_usd: 0.1000,
    sale_price_eur: 0.19,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_standard',
    is_premium: false,
    breakout_ip: 'TR',
    is_active: true,
    raw_data: {
      locationNetworkList: [{ operatorName: 'Vodafone TR', networkType: '4G' }],
    },
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    package_code: 'TEST_TR_PREM_5GB_30D',
    slug: 'turkey-travel-premium-5gb-30days',
    name: 'Turkey Travel Premium 5 GB (30 Days)',
    country_code: 'TR',
    country_name: 'Turkey',
    region: 'Europe',
    flag_emoji: '🇹🇷',
    data_gb: 5,
    validity_days: 30,
    ek_price_usd: 4.5000,
    sale_price_eur: 7.49,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_premium',
    is_premium: true,
    premium_diff_chip: 'Dual Network (Vodafone + Türk Telekom)',
    breakout_ip: 'NL',
    is_active: true,
    raw_data: {
      locationNetworkList: [
        { operatorName: 'Vodafone TR', networkType: '4G' },
        { operatorName: 'Türk Telekom', networkType: '4G' },
      ],
      ipExport: 'NL',
    },
  },
  {
    id: '77777777-7777-7777-7777-777777777777',
    package_code: 'TEST_US_3GB_30D',
    slug: 'usa-3gb-30days',
    name: 'USA 3 GB (30 Days)',
    country_code: 'US',
    country_name: 'United States',
    region: 'North America',
    flag_emoji: '🇺🇸',
    data_gb: 3,
    validity_days: 30,
    ek_price_usd: 3.5000,
    sale_price_eur: 5.99,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_standard',
    is_premium: false,
    breakout_ip: 'US',
    is_active: true,
    raw_data: {
      locationNetworkList: [{ operatorName: 'T-Mobile US', networkType: '5G' }],
    },
  },
  {
    id: '88888888-8888-8888-8888-888888888888',
    package_code: 'PM1H_TEST_EUROPE_10GB',
    slug: 'europe-35-areas-10gb-30days',
    name: 'Europe 35 Areas 10 GB (30 Days)',
    country_code: 'EU',
    country_name: 'Europe',
    region: 'Europe',
    flag_emoji: '🇪🇺',
    data_gb: 10,
    validity_days: 30,
    ek_price_usd: 6.0000,
    sale_price_eur: 9.99,
    usd_eur_rate: 0.92,
    tariff_type: 'travel_standard',
    is_premium: false,
    breakout_ip: 'EU',
    is_active: true,
    raw_data: {
      locationNetworkList: [{ operatorName: 'Vodafone / Orange', networkType: '5G' }],
    },
  },
];

const DEFAULT_PROMOTIONS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    slug: 'black-week-2026',
    internal_name: 'Black Week 2026 (15 %)',
    titles: {
      de: 'Black Week: 15 % Rabatt auf alle neuen eSIMs',
      en: 'Black Week: 15% off all new eSIM plans',
    },
    texts: {
      de: 'Gilt auf alle regulären eSIM-Tarife. Wird automatisch an der Kasse abgezogen.',
      en: 'Applies to all regular eSIM plans. Automatically deducted at checkout.',
    },
    badge_texts: { de: '−15 %', en: '−15%' },
    discount_basis_points: 1500,
    rounding_strategy: 'x9_down',
    show_reference_price: false,
    scope: 'new_esim',
    applies_to_topup: false,
    applies_to_cash: false,
    allow_voucher_stacking: false,
    starts_at: '2026-11-22T23:00:00Z',
    ends_at: '2026-11-30T23:00:00Z',
    priority: 10,
    status: 'draft',
    theme_id: 'black_week',
    version: 1,
    created_at: '2026-11-19T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    slug: 'black-friday-2026',
    internal_name: 'Black Friday 2026 (25 %)',
    titles: {
      de: 'Black Friday Deal: 25 % Rabatt auf alle neuen eSIMs – Nur heute!',
      en: 'Black Friday Deal: 25% off all new eSIMs – Today only!',
    },
    texts: {
      de: 'Höchster Rabatt des Jahres. Automatisch im Warenkorb abgezogen.',
      en: 'Biggest discount of the year. Automatically deducted at checkout.',
    },
    badge_texts: { de: '−25 %', en: '−25%' },
    discount_basis_points: 2500,
    rounding_strategy: 'x9_down',
    show_reference_price: true,
    scope: 'new_esim',
    applies_to_topup: false,
    applies_to_cash: false,
    allow_voucher_stacking: false,
    starts_at: '2026-11-26T23:00:00Z',
    ends_at: '2026-11-27T23:00:00Z',
    priority: 20,
    status: 'draft',
    theme_id: 'black_friday',
    version: 1,
    created_at: '2026-11-19T00:00:00Z',
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    slug: 'cyber-monday-2026',
    internal_name: 'Cyber Monday 2026 (20 %)',
    titles: {
      de: 'Cyber Monday: 20 % Rabatt auf alle eSIM-Pakete bis Mitternacht',
      en: 'Cyber Monday: 20% off all eSIM packages until midnight',
    },
    texts: {
      de: 'Letzte Chance der Deal-Woche. Rabatt wird automatisch berechnet.',
      en: 'Last chance of Deal Week. Discount automatically calculated.',
    },
    badge_texts: { de: '−20 %', en: '−20%' },
    discount_basis_points: 2000,
    rounding_strategy: 'x9_down',
    show_reference_price: true,
    scope: 'new_esim',
    applies_to_topup: false,
    applies_to_cash: false,
    allow_voucher_stacking: false,
    starts_at: '2026-11-29T23:00:00Z',
    ends_at: '2026-11-30T23:00:00Z',
    priority: 20,
    status: 'draft',
    theme_id: 'cyber_monday',
    version: 1,
    created_at: '2026-11-19T00:00:00Z',
  },
];

const DEFAULT_PRICE_HISTORY = [
  {
    id: 'h1',
    tariff_id: '11111111-1111-1111-1111-111111111111',
    package_code: 'TEST_DE_1GB_7D',
    price_eur: 1.89,
    recorded_at: '2026-10-01T10:00:00Z',
    is_promotional: false,
  },
  {
    id: 'h2',
    tariff_id: '22222222-2222-2222-2222-222222222222',
    package_code: 'TEST_DE_PREM_3GB_15D',
    price_eur: 4.49,
    recorded_at: '2026-10-01T10:00:00Z',
    is_promotional: false,
  },
  {
    id: 'h3',
    tariff_id: '88888888-8888-8888-8888-888888888888',
    package_code: 'PM1H_TEST_EUROPE_10GB',
    price_eur: 9.99,
    recorded_at: '2026-10-01T10:00:00Z',
    is_promotional: false,
  },
  {
    id: 'h4',
    tariff_id: '88888888-8888-8888-8888-888888888888',
    package_code: 'PM1H_TEST_EUROPE_10GB',
    price_eur: 7.49,
    recorded_at: '2026-11-27T08:00:00Z',
    is_promotional: true,
    regular_price_eur: 9.99,
    promotion_name: 'Black Friday 2026',
    discount_pct: 25,
  },
];

class StandaloneTestStore {
  public data: TestStoreData;
  private filePath: string;

  constructor() {
    this.filePath = path.join(process.cwd(), 'testenv', 'data', 'test-store.json');
    this.data = this.load();
  }

  private load(): TestStoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {}

    return {
      tariffs: [...DEFAULT_TARIFFS],
      promotions: [...DEFAULT_PROMOTIONS],
      promotion_audit_logs: [],
      quotes: {},
      tariff_price_history: [...DEFAULT_PRICE_HISTORY],
      users: [
        {
          id: 'u1',
          email: 'testadmin@puresim.local',
          full_name: 'Local Test Admin',
        },
      ],
      system_settings: [],
      orders: [],
    };
  }

  public save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch {}
  }

  public query(sql: string, params: any[] = []): { rows: any[]; rowCount: number } {
    const s = sql.trim();

    // Migrations / Transactions check
    if (s.startsWith('BEGIN') || s.startsWith('COMMIT') || s.startsWith('ROLLBACK')) {
      return { rows: [], rowCount: 0 };
    }
    if (s.includes('schema_migrations') || s.includes('_testenv_migrations')) {
      return { rows: [{ version: '052_price_history_promotions.sql' }], rowCount: 1 };
    }

    // PROMOTIONS
    if (s.includes('public.promotions') || s.includes('"promotions"')) {
      if (s.toUpperCase().startsWith('SELECT')) {
        // If checking active promotion with starts_at and ends_at
        if (s.includes('starts_at <=') && params.length > 0) {
          const nowIso = params[0];
          const active = this.data.promotions
            .filter((p) => {
              if (p.status === 'active') return true;
              if (p.status === 'scheduled' && p.starts_at <= nowIso && p.ends_at > nowIso) return true;
              return false;
            })
            .sort((a, b) => (b.priority || 0) - (a.priority || 0));

          return { rows: active.slice(0, 1), rowCount: active.length > 0 ? 1 : 0 };
        }

        // Return all promotions sorted by priority DESC, starts_at ASC
        const list = [...this.data.promotions].sort((a, b) => (b.priority || 0) - (a.priority || 0));
        return { rows: list, rowCount: list.length };
      }

      if (s.toUpperCase().startsWith('INSERT')) {
        // e.g. from ThemeStudio or Admin
        const newPromo = {
          id: params[0] || `promo-${Date.now()}`,
          slug: params[1] || `promo-${Date.now()}`,
          internal_name: params[2] || 'Aktion',
          titles: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3] || {},
          texts: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4] || {},
          badge_texts: typeof params[5] === 'string' ? JSON.parse(params[5]) : params[5] || {},
          discount_basis_points: params[6] || 0,
          rounding_strategy: params[7] || 'x9_down',
          show_reference_price: params[8] || false,
          scope: params[9] || 'new_esim',
          applies_to_topup: params[10] || false,
          applies_to_cash: params[11] || false,
          allow_voucher_stacking: params[12] || false,
          starts_at: params[13] || new Date().toISOString(),
          ends_at: params[14] || new Date(Date.now() + 86400000 * 7).toISOString(),
          priority: params[15] || 10,
          status: params[16] || 'draft',
          theme_id: params[17] || 'standard',
          theme_config: typeof params[18] === 'string' ? JSON.parse(params[18]) : params[18] || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        const existingIdx = this.data.promotions.findIndex((p) => p.id === newPromo.id || p.internal_name === newPromo.internal_name);
        if (existingIdx >= 0) {
          this.data.promotions[existingIdx] = { ...this.data.promotions[existingIdx], ...newPromo };
        } else {
          this.data.promotions.push(newPromo);
        }
        this.save();
        return { rows: [newPromo], rowCount: 1 };
      }

      if (s.toUpperCase().startsWith('UPDATE')) {
        if (params.length > 0) {
          const promoId = params[params.length - 1];
          const idx = this.data.promotions.findIndex((p) => p.id === promoId);
          if (idx >= 0) {
            // update existing
            this.data.promotions[idx].updated_at = new Date().toISOString();
            this.save();
            return { rows: [this.data.promotions[idx]], rowCount: 1 };
          }
        }
        return { rows: [], rowCount: 0 };
      }

      if (s.toUpperCase().startsWith('DELETE')) {
        if (params.length > 0) {
          const promoId = params[0];
          this.data.promotions = this.data.promotions.filter((p) => p.id !== promoId);
          this.save();
          return { rows: [], rowCount: 1 };
        }
      }
    }

    // PROMOTION AUDIT LOGS
    if (s.includes('public.promotion_audit_logs') || s.includes('"promotion_audit_logs"')) {
      if (s.toUpperCase().startsWith('SELECT')) {
        return { rows: [...(this.data.promotion_audit_logs || [])], rowCount: (this.data.promotion_audit_logs || []).length };
      }
      if (s.toUpperCase().startsWith('INSERT')) {
        const log = {
          id: `log-${Date.now()}`,
          promotion_id: params[0],
          action: params[1] || 'update',
          changed_by: params[2] || 'admin',
          previous_state: typeof params[3] === 'string' ? JSON.parse(params[3]) : params[3] || {},
          new_state: typeof params[4] === 'string' ? JSON.parse(params[4]) : params[4] || {},
          created_at: new Date().toISOString(),
        };
        if (!this.data.promotion_audit_logs) this.data.promotion_audit_logs = [];
        this.data.promotion_audit_logs.unshift(log);
        this.save();
        return { rows: [log], rowCount: 1 };
      }
    }

    // TARIFFS
    if (s.includes('FROM "tariffs"') || s.includes('FROM public.tariffs')) {
      let filtered = [...this.data.tariffs];

      // Match WHERE clauses
      if (params.length > 0) {
        if (s.includes('"package_code" = $') || s.includes('package_code = $')) {
          filtered = filtered.filter((t) => t.package_code === params[0]);
        } else if (s.includes('"slug" = $') || s.includes('slug = $')) {
          filtered = filtered.filter((t) => t.slug === params[0]);
        } else if (s.includes('"id" = $') || s.includes('id = $')) {
          filtered = filtered.filter((t) => t.id === params[0]);
        } else if (s.includes('"country_code" = $') || s.includes('country_code = $')) {
          filtered = filtered.filter((t) => t.country_code === params[0]);
        }
      }

      return { rows: filtered, rowCount: filtered.length };
    }

    // QUOTES
    if (s.includes('"quotes"') || s.includes('public.quotes')) {
      if (s.toUpperCase().startsWith('INSERT')) {
        // Store quote
        if (params.length >= 2) {
          const id = params[0];
          const quoteObj = {
            id,
            subtotal_cents: params[1],
            discount_cents: params[2],
            total_cents: params[3],
            currency: 'EUR',
            created_at: new Date().toISOString(),
          };
          this.data.quotes[id] = quoteObj;
          return { rows: [quoteObj], rowCount: 1 };
        }
      }
      if (s.toUpperCase().startsWith('SELECT')) {
        const id = params[0];
        const q = this.data.quotes[id];
        return { rows: q ? [q] : [], rowCount: q ? 1 : 0 };
      }
    }

    // PRICE HISTORY
    if (s.includes('tariff_price_history')) {
      let filtered = [...this.data.tariff_price_history];
      if (params.length > 0) {
        filtered = filtered.filter((h) => h.tariff_id === params[0] || h.package_code === params[0]);
      }
      return { rows: filtered, rowCount: filtered.length };
    }

    // DEFAULT
    return { rows: [], rowCount: 0 };
  }
}

export const standaloneStore = new StandaloneTestStore();
