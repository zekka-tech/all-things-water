export interface CheckoutSession {
  orderId: string;
  orderRef: string;
  checkoutToken: string;
}

const KEY = "atw.checkout.pending";

export function saveCheckoutSession(session: CheckoutSession): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(session));
  } catch { /* unavailable storage */ }
}

export function getCheckoutSession(
  orderRef: string | null,
): CheckoutSession | null {
  try {
    const session: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null");
    if (!session || typeof session !== "object") return null;
    const value = session as Record<string, unknown>;
    return value.orderRef === orderRef && typeof value.orderId === "string" &&
        typeof value.checkoutToken === "string"
      ? value as unknown as CheckoutSession
      : null;
  } catch {
    return null;
  }
}

export function clearCheckoutSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch { /* unavailable storage */ }
}
