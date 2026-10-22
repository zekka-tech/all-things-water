import { assert, assertEquals, assertFalse, assertMatch } from "jsr:@std/assert";
import { canTransition, newOrderRef, validateOrderRequest } from "./order-validation.ts";

const base = () => ({
  items: [{ productId: "p1", quantity: 2 }],
  customer: { name: "Thandi", email: "t@example.co.za", phone: "082 123 4567" },
  delivery: { method: "delivery", address: "1 Main Rd", city: "Johannesburg", postalCode: "2000" },
});

Deno.test("accepts a well-formed delivery order", () => {
  const r = validateOrderRequest(base());
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.value.items, [{ productId: "p1", quantity: 2 }]);
    assertEquals(r.value.delivery.method, "delivery");
    assertEquals(r.value.whatsappOptin, false);
  }
});

Deno.test("rejects negative, zero, fractional, huge and non-numeric quantities", () => {
  for (const quantity of [-9, 0, 1.5, 1001, "2", null, Number.NaN]) {
    const body = base();
    (body.items[0] as Record<string, unknown>).quantity = quantity;
    assertFalse(validateOrderRequest(body).ok, `quantity ${quantity} should fail`);
  }
});

Deno.test("merges duplicate lines and enforces the per-line cap on the sum", () => {
  const body = base();
  body.items = [{ productId: "p1", quantity: 2 }, { productId: "p1", quantity: 3 }];
  const r = validateOrderRequest(body);
  assert(r.ok);
  if (r.ok) assertEquals(r.value.items, [{ productId: "p1", quantity: 5 }]);

  body.items = [{ productId: "p1", quantity: 600 }, { productId: "p1", quantity: 600 }];
  assertFalse(validateOrderRequest(body).ok);
});

Deno.test("rejects too many lines, bad email and undeliverable postcodes", () => {
  const many = base();
  many.items = Array.from({ length: 51 }, (_, i) => ({ productId: `p${i}`, quantity: 1 }));
  assertFalse(validateOrderRequest(many).ok);

  const email = base();
  email.customer.email = "nope";
  assertFalse(validateOrderRequest(email).ok);

  const postal = base();
  postal.delivery.postalCode = "9999";
  assertFalse(validateOrderRequest(postal).ok);

  const method = base();
  method.delivery.method = "drone";
  assertFalse(validateOrderRequest(method).ok);
});

Deno.test("collection orders drop address fields and need no postcode", () => {
  const body = base();
  body.delivery = { method: "collection", address: "x", city: "y", postalCode: "" };
  const r = validateOrderRequest(body);
  assert(r.ok);
  if (r.ok) {
    assertEquals(r.value.delivery.address, "");
    assertEquals(r.value.deliverySlot, undefined);
  }
});

Deno.test("clips over-long free text", () => {
  const body = base() as Record<string, unknown>;
  (body.customer as Record<string, unknown>).name = "n".repeat(500);
  const r = validateOrderRequest(body);
  assert(r.ok);
  if (r.ok) assertEquals(r.value.customer.name.length, 200);
});

Deno.test("status transitions are forward-only", () => {
  assert(canTransition("paid", "processing"));
  assert(canTransition("processing", "shipped"));
  assert(canTransition("shipped", "delivered"));
  assert(canTransition("pending_payment", "cancelled"));
  assertFalse(canTransition("pending_payment", "shipped"));
  assertFalse(canTransition("shipped", "processing")); // would double-dispatch stock
  assertFalse(canTransition("delivered", "cancelled"));
  assertFalse(canTransition("cancelled", "processing"));
  assertFalse(canTransition("bogus", "paid"));
});

Deno.test("order refs are long enough to avoid collisions", () => {
  assertMatch(newOrderRef(), /^ATW-[0-9A-F]{10}$/);
});
