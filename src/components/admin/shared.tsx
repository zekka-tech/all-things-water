import type { ElementType } from "react";

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
