import { cx } from "@/lib/format";

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0) {
    return (
      <span className="badge bg-ink-100/90 text-ink-500 backdrop-blur-sm dark:bg-ink-800/90 dark:text-ink-300">
        <span className="h-1.5 w-1.5 rounded-full bg-ink-400" />
        Out of stock
      </span>
    );
  }
  const low = stock <= 2;
  return (
    <span
      className={cx(
        "badge backdrop-blur-sm",
        low
          ? "bg-amber-50/90 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300"
          : "bg-emerald-50/90 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
      )}
    >
      <span
        className={cx(
          "h-1.5 w-1.5 rounded-full",
          low ? "bg-amber-500" : "bg-emerald-500",
        )}
      />
      {low ? `Only ${stock} left` : "In stock"}
    </span>
  );
}
