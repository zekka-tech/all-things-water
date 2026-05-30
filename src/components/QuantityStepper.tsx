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
    <div className="inline-flex items-center rounded-xl border border-ink-200 dark:border-ink-700">
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Decrease quantity"
        className={`${pad} grid place-items-center rounded-l-xl text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800`}
      >
        <Minus className="h-4 w-4" />
      </button>
      <span
        className="min-w-10 select-none text-center text-sm font-semibold tabular-nums"
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Increase quantity"
        className={`${pad} grid place-items-center rounded-r-xl text-ink-600 hover:bg-ink-100 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-800`}
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
}
