/**
 * Sellauth API client (server-side only) — api.sellauth.com/v1
 *
 * IMPORTANT pricing note:
 *   Sellauth's checkout cart only accepts { productId, variantId, quantity } —
 *   it has NO per-item custom price field, and prices live on product variants.
 *   To charge an arbitrary, server-computed amount (FX-based tariff prices and
 *   custom day-pass configurations) we create an on-demand, UNLISTED product
 *   with a single variant priced at the exact amount, then check out against it.
 *
 *   Delivery is handled entirely by us (esimaccess) after the webhook fires, so
 *   the Sellauth product uses deliverables_type "service" (no serials/files).
 *
 * All credentials are loaded strictly from process.env.
 */
import type {
  SellauthCartLine,
  SellauthCheckoutResult,
  SellauthPricedProduct,
} from './types';

const API_BASE = 'https://api.sellauth.com/v1';

function getConfig() {
  const apiKey = process.env.SELLAUTH_API_KEY;
  const shopId = process.env.SELLAUTH_SHOP_ID;
  if (!apiKey || !shopId) {
    throw new Error(
      'Missing Sellauth configuration. Set SELLAUTH_API_KEY and SELLAUTH_SHOP_ID.'
    );
  }
  return { apiKey, shopId };
}

async function sellauthFetch<T = unknown>(
  path:   string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?:  Record<string, unknown>,
): Promise<T> {
  const { apiKey, shopId } = getConfig();
  const res = await fetch(`${API_BASE}/shops/${shopId}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
    body:   body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Sellauth ${method} ${path} → ${res.status}: ${text}`);
  }

  // Tolerate empty bodies (e.g. 204 No Content on DELETE).
  const text = await res.text();
  if (!text) return {} as T;
  try {
    return JSON.parse(text) as T;
  } catch {
    return {} as T;
  }
}

/**
 * Create an on-demand, UNLISTED "eSIM" product with a single variant priced at
 * the given EUR amount and a post-purchase redirect to our order page.
 *
 * NOTE: SellAuth has no endpoint to add a single variant to an existing product
 * (variants can only be set at product-create or via a full, race-prone product
 * update). So each checkout gets its own hidden "eSIM" product — functionally
 * identical for the buyer and safe under concurrency.
 *
 * Returns the numeric productId + variantId for checkout.
 */
export async function createPricedProduct(opts: {
  /** Variant label shown on the invoice, e.g. "Germany · 5GB · 30 Tage". */
  variantName: string;
  priceEur:    number;
  /** Where SellAuth redirects the buyer after successful payment. */
  redirectUrl?: string;
}): Promise<SellauthPricedProduct> {
  const variant: Record<string, unknown> = {
    name:  opts.variantName.slice(0, 120),
    price: opts.priceEur.toFixed(2),
    stock: 1_000_000,
  };
  // SellAuth requires redirect URLs to be HTTPS — skip on http/localhost (dev).
  if (opts.redirectUrl && opts.redirectUrl.startsWith('https://')) {
    variant.redirect_url = opts.redirectUrl;
  }

  const json = await sellauthFetch<Record<string, unknown>>('/products', 'POST', {
    type:              'variant',
    name:              'eSIM',
    currency:          'EUR',
    visibility:        'unlisted',
    deliverables_type: 'service',
    product_addons:    [],
    product_upsells:   [],
    variants:          [variant],
  });

  // Response shape varies slightly: { product: {...} } | { data: {...} } | {...}
  const product = (json.product ?? json.data ?? json) as Record<string, unknown>;
  const productId = Number(product.id);
  const variants  = (product.variants ?? []) as Array<Record<string, unknown>>;
  const variantId = Number(variants[0]?.id);

  if (!productId || !variantId) {
    throw new Error(`Sellauth product create: missing ids in ${JSON.stringify(json)}`);
  }
  return { productId, variantId };
}

/**
 * Create a checkout for one or more cart lines.
 * Returns the invoice id + the URL to redirect the buyer to.
 */
export async function createCheckoutSession(opts: {
  cart:  SellauthCartLine[];
  email: string;
}): Promise<SellauthCheckoutResult> {
  const json = await sellauthFetch<Record<string, unknown>>('/checkout', 'POST', {
    cart: opts.cart.map((c) => ({
      productId: c.productId,
      variantId: c.variantId,
      quantity:  c.quantity,
    })),
    email: opts.email,
  });

  // Prefer the hosted invoice page (lets the buyer pick a payment method),
  // fall back to a direct gateway URL.
  const url = String(json.invoice_url ?? json.url ?? '');
  const invoiceId = String(json.invoice_id ?? json.invoiceId ?? '');

  if (!url || !invoiceId) {
    throw new Error(`Sellauth checkout: missing url/invoice_id in ${JSON.stringify(json)}`);
  }
  return { invoiceId, url };
}

/**
 * Delete an on-demand product (and its variant) after the order is fulfilled,
 * so temporary "eSIM" products don't pile up. Best-effort: never throws.
 */
export async function deleteProduct(productId: number | string): Promise<boolean> {
  const id = Number(productId);
  if (!id) return false;
  try {
    await sellauthFetch(`/products/${id}`, 'DELETE');
    return true;
  } catch (err) {
    console.error('[sellauth] product delete failed:', id, err);
    return false;
  }
}

/**
 * Convenience: create a priced product for a single amount and immediately
 * return a checkout session for it (quantity 1, or as specified).
 */
export async function createSingleCheckout(opts: {
  variantName: string;
  priceEur:    number;
  email:       string;
  quantity?:   number;
  redirectUrl?: string;
}): Promise<SellauthCheckoutResult & { productId: number; variantId: number }> {
  const { productId, variantId } = await createPricedProduct({
    variantName: opts.variantName,
    priceEur:    opts.priceEur,
    redirectUrl: opts.redirectUrl,
  });
  const checkout = await createCheckoutSession({
    cart:  [{ productId, variantId, quantity: opts.quantity ?? 1 }],
    email: opts.email,
  });
  return { ...checkout, productId, variantId };
}
