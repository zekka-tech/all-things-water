import { useState, useMemo, useEffect } from "react";
import { Seo } from "@/components/Seo";
import { products } from "@/data/products";
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
  Settings,
  Lock,
  X,
  Plus,
  Minus,
  Eye,
  EyeOff,
  ClipboardList,
  PackageOpen,
  RefreshCw,
} from "lucide-react";

// ── Constants ──
const ADMIN_PASSWORD = "atw-admin-2024";
const STORAGE_AUTH = "atw.admin.auth";
const STORAGE_STOCK = "atw.admin.stock";
const STORAGE_VISIBILITY = "atw.admin.visibility";
const STORAGE_PRODUCTS = "atw.admin.products";

// ── Types ──
interface OrderItem {
  productName: string;
  quantity: number;
  price: number;
}

interface MockOrder {
  ref: string;
  date: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  status: "pending" | "processing" | "completed";
}

type Tab = "products" | "orders" | "stock";

// ── LocalStorage helpers ──
function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveJson(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

// ── Mock Orders ──
const MOCK_ORDERS: MockOrder[] = [
  {
    ref: "ATW-2024-001",
    date: "2024-06-01T10:30:00",
    customerName: "Thabo Molefe",
    items: [
      { productName: "Hot & Cold Water Cooler YLR-805LB", quantity: 1, price: 2645 },
      { productName: "18.9L Water Dispenser Bottle", quantity: 2, price: 150 },
    ],
    total: 2945,
    status: "completed",
  },
  {
    ref: "ATW-2024-002",
    date: "2024-06-02T14:15:00",
    customerName: "Priya Naidoo",
    items: [
      { productName: "Aquafria Sparkling 500ml", quantity: 3, price: 120 },
      { productName: "Aquafria Still 500ml", quantity: 2, price: 120 },
    ],
    total: 600,
    status: "completed",
  },
  {
    ref: "ATW-2024-003",
    date: "2024-06-03T09:00:00",
    customerName: "James van der Merwe",
    items: [
      { productName: "Counter Top Water Cooler YLR 95TB", quantity: 1, price: 1800 },
    ],
    total: 1800,
    status: "processing",
  },
  {
    ref: "ATW-2024-004",
    date: "2024-06-03T11:45:00",
    customerName: "Lerato Khumalo",
    items: [
      { productName: "Monate Water 500ml", quantity: 4, price: 175 },
      { productName: "Caps for 5-Gallon Bottle", quantity: 10, price: 10 },
    ],
    total: 800,
    status: "processing",
  },
  {
    ref: "ATW-2024-005",
    date: "2024-06-04T08:30:00",
    customerName: "David Nkosi",
    items: [{ productName: "Voss Original 800ml", quantity: 1, price: 1500 }],
    total: 1500,
    status: "pending",
  },
  {
    ref: "ATW-2024-006",
    date: "2024-06-04T16:00:00",
    customerName: "Sarah Williams",
    items: [
      { productName: "Aquafria Sparkling 500ml", quantity: 2, price: 120 },
      { productName: "Monate Water 500ml", quantity: 1, price: 175 },
      { productName: "Caps for 5-Gallon Bottle", quantity: 5, price: 10 },
    ],
    total: 465,
    status: "pending",
  },
  {
    ref: "ATW-2024-007",
    date: "2024-06-05T12:00:00",
    customerName: "Michael Dlamini",
    items: [
      { productName: "Hot & Cold Water Cooler YLR-805LB", quantity: 1, price: 2645 },
      { productName: "18.9L Water Dispenser Bottle", quantity: 3, price: 150 },
    ],
    total: 3095,
    status: "completed",
  },
];

// ── Status badge helpers ──
function stockStatus(stock: number): { label: string; color: string } {
  if (stock === 0) return { label: "Out of stock", color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" };
  if (stock <= 3) return { label: "Low stock", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" };
  return { label: "In stock", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" };
}

function orderStatusBadge(status: MockOrder["status"]) {
  const map = {
    pending: { label: "Pending", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    processing: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
  };
  return map[status];
}

// ── Password Gate ──
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_AUTH, "true");
      onUnlock();
    } else {
      setError(true);
      setInput("");
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="card w-full max-w-sm p-8 text-center animate-scale-in">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-300">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="mt-4 font-display text-xl font-bold text-ink-900 dark:text-white">
          Admin Access
        </h2>
        <p className="mt-1.5 text-sm text-ink-500 dark:text-ink-400">
          Enter the admin password to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false); }}
            placeholder="Password"
            className={cx(
              "input text-center",
              error && "border-red-400 focus:border-red-400 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900",
            )}
            autoFocus
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">Incorrect password. Please try again.</p>
          )}
          <button type="submit" className="btn-primary w-full">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Stat Card ──
function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className={cx("grid h-11 w-11 shrink-0 place-items-center rounded-xl", accent)}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-xs font-medium text-ink-500 dark:text-ink-400">{label}</p>
        <p className="font-display text-xl font-bold text-ink-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

// ── Main Admin Component ──
export function Admin() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem(STORAGE_AUTH) === "true");
  const [tab, setTab] = useState<Tab>("products");

  // Stock overrides (merged with static data)
  const [stockOverrides, setStockOverrides] = useState<Record<string, number>>(() =>
    loadJson<Record<string, number>>(STORAGE_STOCK, {}),
  );

  // Visibility overrides
  const [visibility, setVisibility] = useState<Record<string, boolean>>(() =>
    loadJson<Record<string, boolean>>(STORAGE_VISIBILITY, {}),
  );

  // Product field overrides (name, price, cost)
  const [productOverrides, setProductOverrides] = useState<Record<string, Partial<Product>>>(() =>
    loadJson<Record<string, Partial<Product>>>(STORAGE_PRODUCTS, {}),
  );

  // Editing state for products tab
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Product>>({});

  // Stock tab: local adjustments (not yet saved)
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});

  // Merge static products with overrides
  const mergedProducts = useMemo(() => {
    return products.map((p) => ({
      ...p,
      ...productOverrides[p.id],
      stock: stockOverrides[p.id] ?? p.stock,
    }));
  }, [stockOverrides, productOverrides]);

  // Compute stats
  const stats = useMemo(() => {
    const totalProducts = mergedProducts.length;
    const totalStock = mergedProducts.reduce((sum, p) => sum + p.stock, 0);
    const totalValue = mergedProducts.reduce((sum, p) => sum + p.price * p.stock, 0);
    const outOfStock = mergedProducts.filter((p) => p.stock === 0).length;
    return { totalProducts, totalStock, totalValue, outOfStock };
  }, [mergedProducts]);

  // Init stock draft when switching to stock tab
  useEffect(() => {
    const initial: Record<string, number> = {};
    mergedProducts.forEach((p) => {
      initial[p.id] = p.stock;
    });
    setStockDraft(initial);
  }, [tab, mergedProducts]);

  // ── Handlers ──
  const handleLogout = () => {
    sessionStorage.removeItem(STORAGE_AUTH);
    setAuthed(false);
  };

  const handleToggleVisibility = (id: string) => {
    const next = { ...visibility, [id]: !visibility[id] };
    setVisibility(next);
    saveJson(STORAGE_VISIBILITY, next);
  };

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditDraft({
      name: product.name,
      price: product.price,
      cost: product.cost,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditDraft({});
  };

  const saveEditing = (id: string) => {
    const next = { ...productOverrides, [id]: { ...productOverrides[id], ...editDraft } };
    // Remove keys that match the original to keep storage clean
    const original = products.find((p) => p.id === id);
    if (original) {
      const cleaned: Partial<Product> = {};
      if (editDraft.name && editDraft.name !== original.name) cleaned.name = editDraft.name;
      if (editDraft.price !== undefined && editDraft.price !== original.price) cleaned.price = editDraft.price;
      if (editDraft.cost !== undefined && editDraft.cost !== original.cost) cleaned.cost = editDraft.cost;
      if (Object.keys(cleaned).length === 0) {
        delete next[id];
      } else {
        next[id] = cleaned;
      }
    }
    setProductOverrides(next);
    saveJson(STORAGE_PRODUCTS, next);
    setEditingId(null);
    setEditDraft({});
  };

  const adjustStock = (id: string, delta: number) => {
    setStockDraft((prev) => {
      const current = prev[id] ?? 0;
      return { ...prev, [id]: Math.max(0, current + delta) };
    });
  };

  const setStockDirect = (id: string, value: number) => {
    setStockDraft((prev) => ({ ...prev, [id]: Math.max(0, value) }));
  };

  const saveStockChanges = () => {
    // Only save values that differ from static data
    const clean: Record<string, number> = {};
    for (const p of products) {
      const draftVal = stockDraft[p.id];
      if (draftVal !== undefined && draftVal !== p.stock) {
        clean[p.id] = draftVal;
      }
    }
    setStockOverrides(clean);
    saveJson(STORAGE_STOCK, clean);
  };

  const resetStockChanges = () => {
    const initial: Record<string, number> = {};
    mergedProducts.forEach((p) => {
      initial[p.id] = p.stock;
    });
    setStockDraft(initial);
  };

  const hasStockChanges = useMemo(() => {
    return mergedProducts.some((p) => {
      const draftVal = stockDraft[p.id];
      return draftVal !== undefined && draftVal !== p.stock;
    });
  }, [mergedProducts, stockDraft]);

  if (!authed) {
    return (
      <>
        <Seo title="Admin" description="Admin dashboard for All Things Water." />
        <PasswordGate onUnlock={() => setAuthed(true)} />
      </>
    );
  }

  return (
    <>
      <Seo title="Admin" description="Admin dashboard for All Things Water." />

      <div className="container-page py-8 animate-fade-in">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-2xl font-extrabold tracking-tight text-ink-900 dark:text-white">
              Dashboard
            </h1>
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <Settings className="h-3 w-3" /> Admin
            </span>
          </div>
          <button type="button" onClick={handleLogout} className="btn-ghost text-sm">
            <Lock className="h-4 w-4" /> Lock
          </button>
        </div>

        {/* ── Tab Navigation ── */}
        <div className="mt-6 flex gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
          {([
            { key: "products" as Tab, icon: Package, label: "Products" },
            { key: "orders" as Tab, icon: ClipboardList, label: "Orders" },
            { key: "stock" as Tab, icon: PackageOpen, label: "Stock" },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white text-ink-900 shadow-sm dark:bg-ink-700 dark:text-white"
                  : "text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {/* ── Tab Content ── */}
        <div className="mt-6">
          {tab === "products" && (
            <ProductsTab
              products={mergedProducts}
              visibility={visibility}
              editingId={editingId}
              editDraft={editDraft}
              stats={stats}
              onToggleVisibility={handleToggleVisibility}
              onStartEdit={startEditing}
              onCancelEdit={cancelEditing}
              onSaveEdit={saveEditing}
              onEditDraftChange={setEditDraft}
            />
          )}

          {tab === "orders" && <OrdersTab />}

          {tab === "stock" && (
            <StockTab
              products={mergedProducts}
              stockDraft={stockDraft}
              hasChanges={hasStockChanges}
              onAdjust={adjustStock}
              onSetDirect={setStockDirect}
              onSave={saveStockChanges}
              onReset={resetStockChanges}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ── Products Tab ──
function ProductsTab({
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
                        <img
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

// ── Orders Tab ──
function OrdersTab() {
  // Check if there are any orders (from localStorage or mock data)
  const orders = useMemo(() => {
    // In a real app this would come from a backend — using mock data for now
    return MOCK_ORDERS;
  }, []);

  if (orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-16 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-100 text-ink-400 dark:bg-ink-800 dark:text-ink-500">
          <ClipboardList className="h-7 w-7" />
        </div>
        <h3 className="font-display font-semibold text-ink-700 dark:text-ink-200">No orders yet</h3>
        <p className="max-w-sm text-sm text-ink-500 dark:text-ink-400">
          Orders will appear here once your store starts receiving them.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink-200 bg-ink-50/50 dark:border-ink-800 dark:bg-ink-800/30">
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Reference</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 sm:table-cell">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400">Customer</th>
              <th className="hidden px-4 py-3 text-left text-xs font-semibold text-ink-500 dark:text-ink-400 lg:table-cell">Items</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-ink-500 dark:text-ink-400">Total</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-ink-500 dark:text-ink-400">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
            {orders.map((order) => {
              const status = orderStatusBadge(order.status);
              const date = new Date(order.date).toLocaleDateString("en-ZA", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });
              const itemSummary = order.items
                .map((i) => `${i.quantity}× ${i.productName}`)
                .join(", ");

              return (
                <tr
                  key={order.ref}
                  className="transition-colors hover:bg-ink-50/50 dark:hover:bg-ink-800/20"
                >
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                      {order.ref}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 text-ink-500 dark:text-ink-400 sm:table-cell">{date}</td>
                  <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">{order.customerName}</td>
                  <td className="hidden max-w-[200px] truncate px-4 py-3 text-ink-500 dark:text-ink-400 lg:table-cell">
                    {itemSummary}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-medium text-ink-900 dark:text-white">
                    {formatZAR(order.total)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={cx("badge", status.color)}>{status.label}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Stock Tab ──
function StockTab({
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
                        <img
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
