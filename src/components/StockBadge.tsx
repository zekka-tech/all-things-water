import { cx } from "@/lib/format";

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="badge bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
        Out of stock
      </span>
    );
  }
  const low = stock <= 2;
  return (
    <span
      className={cx(
        "badge",
        low
          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"
          : "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
      )}
    >
      {low ? `Only ${stock} left` : "In stock"}
    </span>
  );
}
