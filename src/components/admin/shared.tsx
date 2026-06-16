import type { ElementType } from "react";

// ── Shared Admin Utilities ──

export function stockStatus(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: "Out of stock", color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" };
  if (stock <= 3) return { label: "Low stock", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" };
  return { label: "In stock", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" };
}

export function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
        <p className="font-display text-xl font-bold text-ink-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}
