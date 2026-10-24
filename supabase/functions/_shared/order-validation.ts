/**
 * Pure validation for the `orders` endpoint and admin status changes.
 * No I/O, so it is fully unit-tested in order-validation.test.ts.
 */
import { clip, isValidEmail } from "./http.ts";
import { isDeliverablePostalCode } from "./delivery.ts";

export const MAX_LINE_ITEMS = 50;
export const MAX_QTY_PER_LINE = 1000;

export interface ValidOrderItem {
  productId: string;
  quantity: number;
}

export interface ValidOrderRequest {
  items: ValidOrderItem[];
  customer: { name: string; email: string; phone: string };
  delivery: {
    method: "delivery" | "collection";
    address: string;
    city: string;
    postalCode: string;
    notes: string;
  };
  whatsappOptin: boolean;
  deliverySlot?: string;
}

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; status: number; message: string; details?: unknown };

const fail = (message: string, details?: unknown, status = 400) =>
  ({ ok: false, status, message, details }) as const;

/**
 * Validate and normalise a raw order body. Duplicate product lines are merged
 * so a cart cannot sidestep per-line stock checks by splitting a quantity.
 */
export function validateOrderRequest(raw: unknown): ValidationResult<ValidOrderRequest> {
  if (!raw || typeof raw !== "object") return fail("Invalid request body");
  const body = raw as Record<string, unknown>;
  const customer = (body.customer ?? {}) as Record<string, unknown>;
  const delivery = (body.delivery ?? {}) as Record<string, unknown>;

  const name = clip(customer.name, 200);
  if (!name) return fail("Customer name is required");

  const email = typeof customer.email === "string" ? customer.email.trim() : "";
  if (!isValidEmail(email)) return fail("Valid customer email is required");

  const phone = clip(customer.phone, 30) ?? "";
  if (phone && !/^[+0-9 ()-]{6,30}$/.test(phone)) return fail("Phone number is invalid");

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return fail("At least one item is required");
  }
  if (body.items.length > MAX_LINE_ITEMS) return fail("Too many items in order");

  const merged = new Map<string, number>();
  for (const entry of body.items) {
    const item = (entry ?? {}) as Record<string, unknown>;
    const productId = typeof item.productId === "string" ? item.productId.trim() : "";
    const quantity = item.quantity;
    if (!productId || productId.length > 64) return fail("Invalid product id");
    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > MAX_QTY_PER_LINE
    ) {
      return fail(`Invalid quantity for ${productId}`, { productId });
    }
    merged.set(productId, (merged.get(productId) ?? 0) + quantity);
  }
  for (const [productId, quantity] of merged) {
    if (quantity > MAX_QTY_PER_LINE) return fail(`Invalid quantity for ${productId}`, { productId });
  }

  const method = delivery.method === "collection" ? "collection" : "delivery";
  if (delivery.method !== undefined && delivery.method !== "delivery" && delivery.method !== "collection") {
    return fail("Invalid delivery method");
  }

  const address = clip(delivery.address, 500) ?? "";
  const city = clip(delivery.city, 100) ?? "";
  const postalCode = clip(delivery.postalCode, 10) ?? "";
  const notes = clip(delivery.notes, 1000) ?? "";

  if (method === "delivery") {
    if (!address || !city) return fail("Delivery address and city are required");
    if (!postalCode) return fail("Delivery postal code is required");
    const zone = isDeliverablePostalCode(postalCode);
    if (!zone.deliverable) return fail("We cannot deliver to this postal code", zone);
  }

  return {
    ok: true,
    value: {
      items: [...merged].map(([productId, quantity]) => ({ productId, quantity })),
      customer: { name, email, phone },
      delivery: {
        method,
        address: method === "delivery" ? address : "",
        city: method === "delivery" ? city : "",
        postalCode: method === "delivery" ? postalCode : "",
        notes,
      },
      whatsappOptin: body.whatsappOptin === true,
      deliverySlot: method === "delivery" ? clip(body.deliverySlot, 100) : undefined,
    },
  };
}

export type OrderStatus =
  | "pending_payment"
  | "paid"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "expired";

/**
 * Allowed admin transitions. Forward-only, so stock is never dispatched twice
 * (shipped → processing → shipped would decrement warehouse on-hand again)
 * and terminal states stay terminal.
 */
const TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending_payment: ["cancelled"],
  paid: ["processing", "shipped", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
  expired: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = TRANSITIONS[from as OrderStatus];
  return Array.isArray(allowed) && allowed.includes(to as OrderStatus);
}

/** Order reference: ATW- + 10 uppercase hex chars (~1.1e12 space, no realistic collisions). */
export function newOrderRef(): string {
  return "ATW-" + crypto.randomUUID().replace(/-/g, "").slice(0, 10).toUpperCase();
}
