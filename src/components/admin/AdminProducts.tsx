import { OptimizedImage } from "@/components/OptimizedImage";
import { categoryLabel } from "@/data/categories";
import { formatZAR, cx } from "@/lib/format";
import type { Product } from "@/types";
import {
  Package,
  ShoppingBag,
  TrendingUp,
  AlertTriangle,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
} from "lucide-react";
import { StatCard, stockStatus } from "./shared";

export default function AdminProducts({
  products: productList,
  visibility,
  editingId,
  editDraft,
  stats,
  onToggleVisibility,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditDraftChange,
}: {
  products: Product[];
  visibility: Record<string, boolean>;
  editingId: string | null;
  editDraft: Partial<Product>;
  stats: { totalProducts: number; totalStock: number; totalValue: number; outOfStock: number };
  onToggleVisibility: (id: string) => void;
  onStartEdit: (p: Product) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onEditDraftChange: (d: Partial<Product>) => void;
}) {
  return (
    <div>
      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Total products"
          value={String(stats.totalProducts)}
          accent="bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400"
        />
        <StatCard
          icon={ShoppingBag}
          label="Total stock units"
          value={String(stats.totalStock)}
          accent="bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
        />
        <StatCard
          icon={TrendingUp}
          label="Inventory value"
          value={formatZAR(stats.totalValue)}
          accent="bg-indigo-100 text-indigo-600 dark:bg-indigo-500/15 dark:text-indigo-400"
        />
        <StatCard
          icon={AlertTriangle}
          label="Out of stock"
          value={String(stats.outOfStock)}
          accent="bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
        />
      </div>

      {/* Products table */}
      <div className="card mt-6 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-800/30">
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Product</th>
                <th className="hidden px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 md:table-cell">Category</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">Price</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400 sm:table-cell">Cost</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">Stock</th>
                <th className="hidden px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400 sm:table-cell">Margin</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-ink-500 dark:text-ink-400">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
              {productList.map((p) => {
                const isEditing = editingId === p.id;
                const status = stockStatus(p.stock);
                const margin = p.price - p.cost;
                const isVisible = visibility[p.id] !== false; // default visible

                return (
                  <tr
                    key={p.id}
                    className={cx(
                      "transition-colors hover:bg-ink-50/50 dark:hover:bg-ink-800/20",
                      isEditing && "bg-brand-50/40 dark:bg-brand-500/5",
                    )}
                  >
                    {/* Product name + image */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <OptimizedImage
                          src={p.image}
                          alt={p.name}
                          className="h-10 w-10 shrink-0 rounded-lg object-contain bg-ink-50 dark:bg-ink-800"
                        />
                        <div className="min-w-0">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editDraft.name ?? p.name}
                              onChange={(e) => onEditDraftChange({ ...editDraft, name: e.target.value })}
                              className="input py-1.5 px-2 text-sm"
                            />
                          ) : (
                            <span className="block truncate font-medium text-ink-900 dark:text-white">
                              {p.name}
                            </span>
                          )}
                          <span className="text-xs text-ink-400 dark:text-ink-500">{p.unit}</span>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="hidden px-4 py-3 text-ink-500 dark:text-ink-400 md:table-cell">
                      {categoryLabel(p.category)}
                    </td>

                    {/* Price */}
                    <td className="px-4 py-3 text-right tabular-nums">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editDraft.price ?? p.price}
                          onChange={(e) => onEditDraftChange({ ...editDraft, price: Number(e.target.value) })}
                          className="input w-24 py-1.5 px-2 text-sm text-right"
                        />
                      ) : (
                        <span className="font-medium text-ink-900 dark:text-white">{formatZAR(p.price)}</span>
                      )}
                    </td>

                    {/* Cost */}
                    <td className="hidden px-4 py-3 text-right tabular-nums text-ink-500 dark:text-ink-400 sm:table-cell">
                      {isEditing ? (
                        <input
                          type="number"
                          value={editDraft.cost ?? p.cost}
                          onChange={(e) => onEditDraftChange({ ...editDraft, cost: Number(e.target.value) })}
                          className="input w-24 py-1.5 px-2 text-sm text-right"
                        />
                      ) : (
                        formatZAR(p.cost)
                      )}
                    </td>

                    {/* Stock */}
                    <td className="px-4 py-3 text-right tabular-nums font-medium text-ink-900 dark:text-white">
                      {p.stock}
                    </td>

                    {/* Margin */}
                    <td className="hidden px-4 py-3 text-right tabular-nums sm:table-cell">
                      <span className={cx(
                        "font-medium",
                        margin > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
                      )}>
                        {formatZAR(margin)}
                      </span>
                    </td>

                    {/* Status badge */}
                    <td className="px-4 py-3 text-center">
                      <span className={cx("badge", status.color)}>{status.label}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Toggle visibility */}
                        <button
                          type="button"
                          onClick={() => onToggleVisibility(p.id)}
                          className="btn-ghost h-8 w-8 rounded-lg p-0"
                          title={isVisible ? "Hide product" : "Show product"}
                        >
                          {isVisible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4 text-ink-400" />
                          )}
                        </button>

                        {/* Edit / Save */}
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onSaveEdit(p.id)}
                              className="btn-ghost h-8 w-8 rounded-lg p-0 text-emerald-600 dark:text-emerald-400"
                              title="Save"
                            >
                              <Save className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={onCancelEdit}
                              className="btn-ghost h-8 w-8 rounded-lg p-0 text-red-500 dark:text-red-400"
                              title="Cancel"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => onStartEdit(p)}
                            className="btn-ghost h-8 w-8 rounded-lg p-0"
                            title="Edit product"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
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
