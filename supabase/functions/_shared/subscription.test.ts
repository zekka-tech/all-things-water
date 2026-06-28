import { assertEquals } from "jsr:@std/assert";
import { buildSubscriptionPayParams } from "./subscription.ts";
import { buildSignedQuery, getParam } from "./payfast.ts";

const order = {
  id: "11111111-2222-3333-4444-555555555555",
  order_ref: "ATW-ABC123",
  total: 599,
  customer_name: "Thandi",
  customer_email: "thandi@example.com",
  checkout_token: "token-xyz",
};

const config = {
  merchantId: "10000100",
  merchantKey: "abcdef123456",
  siteUrl: "https://allthingswater.co.za",
  functionBaseUrl: "https://proj.supabase.co",
};

Deno.test("buildSubscriptionPayParams emits params in PayFast order", () => {
  const params = buildSubscriptionPayParams(order, config);
  assertEquals(
    params.map(([k]) => k),
    [
      "merchant_id",
      "merchant_key",
      "return_url",
      "cancel_url",
      "notify_url",
      "name_first",
      "email_address",
      "m_payment_id",
      "amount",
      "item_name",
    ],
  );
});

Deno.test("buildSubscriptionPayParams formats amount to 2 decimals", () => {
  const params = buildSubscriptionPayParams(order, config);
  assertEquals(getParam(params, "amount"), "599.00");
});

Deno.test("buildSubscriptionPayParams uses order id as m_payment_id", () => {
  const params = buildSubscriptionPayParams(order, config);
  assertEquals(getParam(params, "m_payment_id"), order.id);
});

Deno.test("buildSubscriptionPayParams references the ITN notify endpoint", () => {
  const params = buildSubscriptionPayParams(order, config);
  assertEquals(
    getParam(params, "notify_url"),
    "https://proj.supabase.co/functions/v1/payments-payfast-itn",
  );
});

Deno.test("params produce a stable signed query", () => {
  const params = buildSubscriptionPayParams(order, config);
  const query = buildSignedQuery(params, "passphrase");
  // Signature is appended last and is a 32-char MD5 hex digest.
  const sig = query.split("signature=")[1];
  assertEquals(sig.length, 32);
  assertEquals(/^[0-9a-f]{32}$/.test(sig), true);
});
