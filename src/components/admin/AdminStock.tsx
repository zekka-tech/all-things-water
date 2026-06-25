import { OptimizedImage } from "@/components/OptimizedImage";
import { cx } from "@/lib/format";
import type { Product } from "@/types";
import { Save, RefreshCw, Minus, Plus } from "lucide-react";
import { stockStatus } from "./utils";

export default function AdminStock({
  products: productList,
  stockDraft,
  hasChanges,
  onAdjust,
  onSetDirect,
  onSave,
  onReset,
}: {
  products: Product[];
  stockDraft: Record<string, number>;
  hasChanges: boolean;
  onAdjust: (id: string, delta: number) => void;
  onSetDirect: (id: string, value: number) => void;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      {/* Action bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          Adjust stock levels and click <strong>Save changes</strong> when done. Changes are stored locally.
        </p>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <button type="button" onClick={onReset} className="btn-ghost text-sm">
              <RefreshCw className="h-4 w-4" /> Reset
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={!hasChanges}
            className="btn-primary text-sm"
          >
            <Save className="h-4 w-4" /> Save changes
          </button>
        </div>
      </div>

      {/* Stock list */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-800/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Product</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400 sm:table-cell">Original</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-ink-500 dark:text-ink-400">Adjustment</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">New Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {productList.map((p) => {
                const current = stockDraft[p.id] ?? p.stock;
                const isChanged = current !== p.stock;
                const status = stockStatus(current);

                return (
                  <tr
                    key={p.id}
                    className={cx(
                      "transition-colors hover:bg-ink-50/50 dark:hover:bg-ink-800/20",
                      isChanged && "bg-amber-50/30 dark:bg-amber-500/5",
                    )}
                  >
                    {/* Product */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <OptimizedImage
                          src={p.image}
                          alt={p.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-contain bg-ink-50 dark:bg-ink-800"
                        />
                        <div className="min-w-0">
                          <span className="block truncate font-medium text-ink-900 dark:text-white">
                            {p.name}
                          </span>
                          <span className={cx("badge mt-0.5", status.color)}>{status.label}</span>
                        </div>
                      </div>
                    </td>

                    {/* Original stock */}
                    <td className="hidden px-4 py-3 text-right tabular-nums text-ink-400 dark:text-ink-500 sm:table-cell">
                      {p.stock}
                    </td>

                    {/* Adjustment controls */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => onAdjust(p.id, -1)}
                          disabled={current <= 0}
                          className="btn-ghost h-8 w-8 rounded-lg p-0 disabled:opacity-30"
                          title="Decrease"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <input
                          type="number"
                          min="0"
                          value={current}
                          onChange={(e) => onSetDirect(p.id, Number(e.target.value))}
                          className="input w-20 py-1.5 px-2 text-center text-sm tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => onAdjust(p.id, 1)}
                          className="btn-ghost h-8 w-8 rounded-lg p-0"
                          title="Increase"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </td>

                    {/* New stock indicator */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      <span className={cx(
                        "font-bold",
                        isChanged
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-ink-900 dark:text-white",
                      )}>
                        {current}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
