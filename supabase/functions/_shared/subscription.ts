/**
 * Shared, side-effect-free helpers for the subscription scheduler.
 *
 * Kept separate from `subscriptions-run/index.ts` (which calls `Deno.serve`
 * at module load) so the pure logic can be unit-tested in isolation.
 */

import type { Param } from "./payfast.ts";

/** Minimal shape of an order row needed to build a PayFast pay link. */
export interface PayLinkOrder {
  id: string;
  order_ref: string;
  total: number;
  customer_name: string;
  customer_email: string;
  checkout_token: string;
}

/** PayFast + site configuration required to build a signed pay link. */
export interface PayLinkConfig {
  merchantId: string;
  merchantKey: string;
  siteUrl: string;
  functionBaseUrl: string;
}

/**
 * Build the ordered PayFast parameters for a one-click subscription pay link.
 *
 * Mirrors `payments-payfast-initiate/index.ts` exactly so the signature is
 * computed over the same params, in the same order, that get submitted.
 */
export function buildSubscriptionPayParams(
  order: PayLinkOrder,
  config: PayLinkConfig,
  opts: { tokenize?: boolean } = {},
): Param[] {
  const encodedOrderRef = encodeURIComponent(order.order_ref);
  const encodedOrderId = encodeURIComponent(order.id);
  const encodedToken = encodeURIComponent(order.checkout_token);

  const params: Param[] = [
    ["merchant_id", config.merchantId],
    ["merchant_key", config.merchantKey],
    ["return_url", `${config.siteUrl}/checkout/return?orderRef=${encodedOrderRef}`],
    [
      "cancel_url",
      `${config.siteUrl}/checkout/cancel?orderId=${encodedOrderId}&token=${encodedToken}&orderRef=${encodedOrderRef}`,
    ],
    ["notify_url", `${config.functionBaseUrl}/functions/v1/payments-payfast-itn`],
    ["name_first", order.customer_name],
    ["email_address", order.customer_email],
    ["m_payment_id", order.id],
    ["amount", order.total.toFixed(2)],
    ["item_name", `All Things Water — Standing order #${order.order_ref}`],
  ];

  // Tokenizing checkout: PayFast returns a reusable card token on the ITN so
  // future cycles can be charged ad-hoc without the customer.
  if (opts.tokenize) {
    params.push(["subscription_type", "2"]);
  }

  return params;
}
