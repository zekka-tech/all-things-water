export const DELIVERY_THRESHOLD = 500;
export const DELIVERY_FEE = 75;

export function calculateDelivery(
  subtotal: number,
  method: "delivery" | "collection",
): number {
  if (method === "collection") return 0;
  return subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
}

export function isDeliverablePostalCode(
  code: string,
): { deliverable: boolean; zone: "metro" | "borderline" | "out-of-range" | "invalid" } {
  if (!/^\d{4}$/.test(code)) return { deliverable: false, zone: "invalid" };
  const prefix = parseInt(code.slice(0, 4), 10);
  if ((prefix >= 1 && prefix <= 299) || (prefix >= 1400 && prefix <= 2199)) {
    return { deliverable: true, zone: "metro" };
  }
  if (prefix >= 300 && prefix <= 1399) {
    return { deliverable: true, zone: "borderline" };
  }
  return { deliverable: false, zone: "out-of-range" };
}

export function getDeliveryEstimate(postalCode: string): string {
  const { zone } = isDeliverablePostalCode(postalCode);
  if (zone === "metro") return "2\u20134 business days";
  if (zone === "borderline") return "3\u20137 business days";
  return "Delivery time varies \u2014 contact us for details";
}
