import { Minus, Plus } from "lucide-react";

interface Props {
  value: number;
  min?: number;
  max: number;
  onChange: (next: number) => void;
  size?: "sm" | "md";
}

export function QuantityStepper({ value, min = 1, max, onChange, size = "md" }: Props) {
  const dec = () => onChange(Math.max(min, value - 1));
  const inc = () => onChange(Math.min(max, value + 1));
  const pad = size === "sm" ? "h-8 w-8" : "h-10 w-10";

  return (
    <div className="inline-flex items-center rounded-xl border border-ink-200 bg-white dark:border-ink-700 dark:bg-ink-900">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${pad} grid place-items-center rounded-l-xl text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800`}
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span
        className="min-w-10 select-none text-center text-sm font-semibold tabular-nums text-ink-900 dark:text-ink-100"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`${pad} grid place-items-center rounded-r-xl text-ink-600 transition-colors hover:bg-ink-50 disabled:cursor-not-allowed disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800`}
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
