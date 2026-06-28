/**
 * Pure types + presentation helpers for subscriptions (standing orders).
 *
 * Kept separate from the `<Subscriptions>` component so non-component exports
 * can be shared (e.g. by the product page) without tripping React Fast Refresh.
 */

export type Frequency = "weekly" | "fortnightly" | "monthly";
export type SubscriptionStatus = "active" | "paused" | "cancelled";

export interface SubscriptionRow {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  frequency: Frequency;
  status: SubscriptionStatus;
  next_delivery_date: string;
}

/** Router state shape used to deep-link the creator open (e.g. from a PDP). */
export interface NewSubscriptionIntent {
  productId: string;
  quantity?: number;
  frequency?: Frequency;
}

export const FREQUENCY_OPTIONS: { value: Frequency; label: string }[] = [
  { value: "weekly", label: "Every week" },
  { value: "fortnightly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
];

export function frequencyLabel(freq: Frequency): string {
  return FREQUENCY_OPTIONS.find((o) => o.value === freq)?.label ?? freq;
}

export function subscriptionStatusLabel(status: SubscriptionStatus): string {
  const labels: Record<SubscriptionStatus, string> = {
    active: "Active",
    paused: "Paused",
    cancelled: "Cancelled",
  };
  return labels[status] ?? status;
}

export function subscriptionStatusBadgeClass(status: SubscriptionStatus): string {
  const classes: Record<SubscriptionStatus, string> = {
    active: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    paused: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    cancelled: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
  };
  return classes[status] ?? "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400";
}
