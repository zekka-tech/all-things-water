/**
 * Delivery logic — thresholds, fees, postal-code zone validation,
 * and deposit/collection information.
 */
import { env } from "@/lib/env";

export const DELIVERY_THRESHOLD = 500;
export const DELIVERY_FEE = 75;

export const DEPOT_ADDRESS = env.companyAddress || "123 Water St, Johannesburg, 2000";

export type DeliveryMethod = "delivery" | "collection";

/** Calculate the delivery fee for a given subtotal and method. */
export function calculateDelivery(
  subtotal: number,
  method: DeliveryMethod,
): number {
  if (method === "collection") return 0;
  return subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export type ZoneStatus = "metro" | "borderline" | "out-of-range" | "invalid";

export interface PostalCodeResult {
  deliverable: boolean;
  zone: ZoneStatus;
}

/**
 * Validate a South African postal code against known delivery zones.
 *
 * The business operates out of Johannesburg and primarily serves Gauteng.
 * Postal codes are mapped as:
 *   metro        – Gauteng (0001–0299, 1400–2199)
 *   borderline   – Nearby provinces (0300–1399)
 *   out-of-range – All other SA codes
 *   invalid      – Not a 4-digit numeric code
 */
export function isDeliverablePostalCode(code: string): PostalCodeResult {
  const cleaned = code.replace(/\D/g, "");

  // Must be exactly 4 digits
  if (!/^\d{4}$/.test(cleaned)) {
    return { deliverable: false, zone: "invalid" };
  }

  const num = parseInt(cleaned, 10);

  // Gauteng core delivery zone
  if ((num >= 1 && num <= 299) || (num >= 1400 && num <= 2199)) {
    return { deliverable: true, zone: "metro" };
  }

  // Nearby provinces — potentially serviceable
  if (num >= 300 && num <= 1399) {
    return { deliverable: true, zone: "borderline" };
  }

  // Out of range
  return { deliverable: false, zone: "out-of-range" };
}

/**
 * Human-readable delivery estimate based on postal-code zone.
 */
export function getDeliveryEstimate(postalCode: string): string {
  const { zone } = isDeliverablePostalCode(postalCode);
  switch (zone) {
    case "metro":
      return "2–4 business days";
    case "borderline":
      return "3–7 business days";
    default:
      return "Unavailable";
  }
}
