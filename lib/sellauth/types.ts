// ─── Sellauth Types (api.sellauth.com/v1) ───────────────────

/** One line item in a checkout cart. */
export interface SellauthCartLine {
  productId: number;
  variantId: number;
  quantity:  number;
}

/** Normalised result of creating a checkout. */
export interface SellauthCheckoutResult {
  invoiceId: string;   // Sellauth invoice id (we store as sellauth_order_id)
  url:       string;   // hosted checkout / payment URL to redirect the buyer to
}

/** Result of creating an on-demand priced product. */
export interface SellauthPricedProduct {
  productId: number;
  variantId: number;
}

export type SellauthWebhookEvent =
  | 'order.created'
  | 'order.paid'
  | 'order.refunded'
  | 'order.disputed';

export interface SellauthWebhookPayload {
  event:    SellauthWebhookEvent;
  order: {
    id:             string;
    invoice_id:     string;
    product_id:     string;
    email:          string;
    status:         string;
    total:          number;        // amount in EUR cents
    currency:       string;
    custom_fields?: Record<string, string>;
    created_at:     string;
    paid_at?:       string;
  };
}
