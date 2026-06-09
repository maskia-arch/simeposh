/**
 * TypeScript types mirroring the Supabase schema.
 * These are hand-written to avoid needing the Supabase CLI locally.
 * For production you can replace this with the auto-generated types:
 *   npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/supabase/types.ts
 */

export type OrderStatus    = 'pending' | 'paid' | 'provisioning' | 'completed' | 'failed' | 'refunded';
export type OrderType      = 'new_esim' | 'top_up';
export type TariffType     = 'travel' | 'unlimited_eco' | 'unlimited_pro';
export type ProposalStatus = 'pending' | 'approved' | 'rejected';

export interface Database {
  public: {
    Tables: {

      // ── users ───────────────────────────────────────────────────────
      users: {
        Row: {
          id:         string;
          email:      string;
          full_name:  string | null;
          phone:      string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id:         string;
          email:      string;
          full_name?: string | null;
          phone?:     string | null;
        };
        Update: {
          full_name?: string | null;
          phone?:     string | null;
        };
        Relationships: [];
      };

      // ── tariffs ─────────────────────────────────────────────────────
      tariffs: {
        Row: {
          id:                 string;
          package_code:       string;
          slug:               string;
          name:               string;
          description:        string | null;
          country_code:       string;
          country_name:       string;
          region:             string | null;
          flag_emoji:         string | null;
          data_gb:            number | null;
          validity_days:      number;
          ek_price_usd:       number;
          sale_price_eur:     number;
          usd_eur_rate:       number;
          is_active:          boolean;
          is_top_up_eligible: boolean;
          tariff_type:        TariffType;
          speed_kbps:         number | null;
          label:              string | null;
          location_codes:     string[] | null;
          raw_data:           Record<string, unknown> | null;
          last_synced_at:     string;
          created_at:         string;
          updated_at:         string;
        };
        Insert: {
          package_code:       string;
          slug:               string;
          name:               string;
          description?:       string | null;
          country_code:       string;
          country_name:       string;
          region?:            string | null;
          flag_emoji?:        string | null;
          data_gb?:           number | null;
          validity_days:      number;
          ek_price_usd:       number;
          sale_price_eur:     number;
          usd_eur_rate:       number;
          is_active?:         boolean;
          is_top_up_eligible?: boolean;
          tariff_type?:       TariffType;
          speed_kbps?:        number | null;
          label?:             string | null;
          location_codes?:    string[] | null;
          raw_data?:          Record<string, unknown> | null;
          last_synced_at?:    string;
        };
        Update: {
          package_code?:      string;
          slug?:              string;
          name?:              string;
          description?:       string | null;
          country_code?:      string;
          country_name?:      string;
          region?:            string | null;
          flag_emoji?:        string | null;
          data_gb?:           number | null;
          validity_days?:     number;
          ek_price_usd?:      number;
          sale_price_eur?:    number;
          usd_eur_rate?:      number;
          is_active?:         boolean;
          is_top_up_eligible?: boolean;
          tariff_type?:       TariffType;
          speed_kbps?:        number | null;
          label?:             string | null;
          location_codes?:    string[] | null;
          raw_data?:          Record<string, unknown> | null;
          last_synced_at?:    string;
        };
        Relationships: [];
      };

      // ── orders ──────────────────────────────────────────────────────
      orders: {
        Row: {
          id:                   string;
          user_id:              string | null;
          tariff_id:            string;
          order_type:           OrderType;
          status:               OrderStatus;
          customer_email:       string;
          customer_name:        string | null;
          amount_eur:           number;
          usd_eur_rate:         number;
          sellauth_order_id:    string | null;
          sellauth_product_id:  string | null;
          sellauth_invoice_id:  string | null;
          payment_confirmed_at: string | null;
          iccid:                string | null;
          qr_code_url:          string | null;
          qr_code_base64:       string | null;
          activation_code:      string | null;
          smdp_address:         string | null;
          apn:                  string | null;
          top_up_iccid:         string | null;
          period_num:           number | null;
          sellauth_product_ref: string | null;
          short_url:            string | null;
          checkout_ref:         string | null;
          esim_status:          string | null;
          esim_status_at:       string | null;
          error_message:        string | null;
          referred_by_code:     string | null;
          cashback_earned_eur:  number | null;
          cashback_applied_eur: number | null;
          created_at:           string;
          updated_at:           string;
        };
        Insert: {
          user_id?:             string | null;
          tariff_id:            string;
          order_type?:          OrderType;
          status?:              OrderStatus;
          customer_email:       string;
          customer_name?:       string | null;
          amount_eur:           number;
          usd_eur_rate:         number;
          sellauth_order_id?:   string | null;
          sellauth_product_id?: string | null;
          sellauth_invoice_id?: string | null;
          payment_confirmed_at?: string | null;
          iccid?:               string | null;
          qr_code_url?:         string | null;
          qr_code_base64?:      string | null;
          activation_code?:     string | null;
          smdp_address?:        string | null;
          apn?:                 string | null;
          top_up_iccid?:        string | null;
          period_num?:          number | null;
          sellauth_product_ref?: string | null;
          short_url?:           string | null;
          checkout_ref?:        string | null;
          esim_status?:         string | null;
          esim_status_at?:      string | null;
          error_message?:       string | null;
          referred_by_code?:     string | null;
          cashback_earned_eur?:  number | null;
          cashback_applied_eur?: number | null;
        };
        Update: {
          user_id?:             string | null;
          tariff_id?:           string;
          order_type?:          OrderType;
          status?:              OrderStatus;
          customer_email?:      string;
          customer_name?:       string | null;
          amount_eur?:          number;
          usd_eur_rate?:        number;
          sellauth_order_id?:   string | null;
          sellauth_product_id?: string | null;
          sellauth_invoice_id?: string | null;
          payment_confirmed_at?: string | null;
          iccid?:               string | null;
          qr_code_url?:         string | null;
          qr_code_base64?:      string | null;
          activation_code?:     string | null;
          smdp_address?:        string | null;
          apn?:                 string | null;
          top_up_iccid?:        string | null;
          period_num?:          number | null;
          sellauth_product_ref?: string | null;
          short_url?:           string | null;
          checkout_ref?:        string | null;
          esim_status?:         string | null;
          esim_status_at?:      string | null;
          error_message?:       string | null;
          referred_by_code?:     string | null;
          cashback_earned_eur?:  number | null;
          cashback_applied_eur?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'orders_tariff_id_fkey';
            columns: ['tariff_id'];
            isOneToOne: false;
            referencedRelation: 'tariffs';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'orders_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'users';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── system_settings ─────────────────────────────────────────────
      system_settings: {
        Row: {
          key:         string;
          value:       string;
          description: string | null;
          updated_at:  string;
        };
        Insert: {
          key:          string;
          value:        string;
          description?: string | null;
        };
        Update: {
          value?:       string;
          description?: string | null;
        };
        Relationships: [];
      };

      // ── sync_logs ────────────────────────────────────────────────────
      sync_logs: {
        Row: {
          id:             string;
          sync_id:        string;
          status:         string;
          total_packages: number | null;
          upserted:       number | null;
          errors:         number | null;
          usd_eur_rate:   number | null;
          price_changes:  number | null;
          duration_ms:    number | null;
          error_message:  string | null;
          created_at:     string;
          completed_at:   string | null;
        };
        Insert: {
          sync_id:         string;
          status?:         string;
          total_packages?: number | null;
          upserted?:       number | null;
          errors?:         number | null;
          usd_eur_rate?:   number | null;
          price_changes?:  number | null;
          duration_ms?:    number | null;
          error_message?:  string | null;
          completed_at?:   string | null;
        };
        Update: {
          status?:         string;
          total_packages?: number | null;
          upserted?:       number | null;
          errors?:         number | null;
          usd_eur_rate?:   number | null;
          price_changes?:  number | null;
          duration_ms?:    number | null;
          error_message?:  string | null;
          completed_at?:   string | null;
        };
        Relationships: [];
      };

      // ── tariff_price_proposals ──────────────────────────────────────
      tariff_price_proposals: {
        Row: {
          id:            string;
          sync_id:       string;
          tariff_id:     string;
          package_code:  string;
          old_price_eur: number;
          new_price_eur: number;
          change_pct:    number;
          status:        ProposalStatus;
          label:         string | null;
          reviewed_at:   string | null;
          created_at:    string;
        };
        Insert: {
          sync_id:       string;
          tariff_id:     string;
          package_code:  string;
          old_price_eur: number;
          new_price_eur: number;
          change_pct:    number;
          status?:       ProposalStatus;
          label?:        string | null;
          reviewed_at?:  string | null;
        };
        Update: {
          status?:      ProposalStatus;
          label?:       string | null;
          reviewed_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'tariff_price_proposals_tariff_id_fkey';
            columns: ['tariff_id'];
            isOneToOne: false;
            referencedRelation: 'tariffs';
            referencedColumns: ['id'];
          },
        ];
      };

      // ── crypto_coins ────────────────────────────────────────────────
      crypto_coins: {
        Row: {
          code: string; name: string; enabled: boolean;
          surcharge_pct: number; surcharge_fixed_eur: number;
          confirmations: number; decimals: number;
          coingecko_id: string; uri_scheme: string; chain: string;
          sort_order: number; updated_at: string;
        };
        Insert: {
          code: string; name: string; enabled?: boolean;
          surcharge_pct?: number; surcharge_fixed_eur?: number;
          confirmations?: number; decimals?: number;
          coingecko_id: string; uri_scheme: string; chain: string;
          sort_order?: number;
        };
        Update: {
          name?: string; enabled?: boolean;
          surcharge_pct?: number; surcharge_fixed_eur?: number;
          confirmations?: number; decimals?: number;
          coingecko_id?: string; uri_scheme?: string; chain?: string;
          sort_order?: number;
        };
        Relationships: [];
      };

      // ── crypto_sessions ─────────────────────────────────────────────
      crypto_sessions: {
        Row: {
          id: string; order_ids: string[]; customer_email: string;
          coin: string; wallet_address: string;
          base_eur: number; amount_eur: number;
          surcharge_pct: number; surcharge_fixed_eur: number;
          rate_eur: number; slot_id: number; crypto_amount: number;
          confirmations_required: number; confirmations: number;
          status: string; tx_hash: string | null;
          created_at: string; expires_at: string; paid_at: string | null;
        };
        Insert: {
          order_ids: string[]; customer_email: string;
          coin: string; wallet_address: string;
          base_eur: number; amount_eur: number;
          surcharge_pct?: number; surcharge_fixed_eur?: number;
          rate_eur: number; slot_id: number; crypto_amount: number;
          confirmations_required?: number; confirmations?: number;
          status?: string; tx_hash?: string | null;
          expires_at: string; paid_at?: string | null;
        };
        Update: {
          status?: string; tx_hash?: string | null;
          confirmations?: number; paid_at?: string | null;
        };
        Relationships: [];
      };

      // ── esim_cash_accounts ──────────────────────────────────────────
      esim_cash_accounts: {
        Row: {
          id: string;
          email: string;
          user_id: string | null;
          balance_eur: number;
          total_spend_eur: number;
          affiliate_code: string;
          referred_by_code: string | null;
          extra_cashback_queue: number;
          sent_email_3: boolean;
          sent_email_5: boolean;
          sent_email_10: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          balance_eur?: number;
          total_spend_eur?: number;
          affiliate_code: string;
          referred_by_code?: string | null;
          extra_cashback_queue?: number;
          sent_email_3?: boolean;
          sent_email_5?: boolean;
          sent_email_10?: boolean;
        };
        Update: {
          user_id?: string | null;
          balance_eur?: number;
          total_spend_eur?: number;
          affiliate_code?: string;
          referred_by_code?: string | null;
          extra_cashback_queue?: number;
          sent_email_3?: boolean;
          sent_email_5?: boolean;
          sent_email_10?: boolean;
        };
        Relationships: [];
      };

      // ── esim_cash_transactions ──────────────────────────────────────
      esim_cash_transactions: {
        Row: {
          id: string;
          email: string;
          user_id: string | null;
          amount: number;
          type: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          user_id?: string | null;
          amount: number;
          type: string;
          description?: string | null;
        };
        Update: {
          email?: string;
          user_id?: string | null;
          amount?: number;
          type?: string;
          description?: string | null;
        };
        Relationships: [];
      };

    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      order_status: OrderStatus;
      order_type:   OrderType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
