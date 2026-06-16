import { useState, useMemo, useEffect } from "react";
import { Seo } from "@/components/Seo";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminStock from "@/components/admin/AdminStock";
import { products } from "@/data/products";
import { cx } from "@/lib/format";
import { env } from "@/lib/env";
import { logAuditEvent, syncToSupabase } from "@/lib/adminAudit";
import type { Product } from "@/types";
import {
  Package,
  Settings,
  Lock,
  ClipboardList,
  PackageOpen,
} from "lucide-react";

// ── Constants ──
const STORAGE_AUTH = "atw.admin.auth";
const STORAGE_STOCK = "atw.admin.stock";
const STORAGE_VISIBILITY = "atw.admin.visibility";
const STORAGE_PRODUCTS = "atw.admin.products";

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

// ── Password Gate ──
function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input === env.adminPassword) {
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

    const product = products.find((p) => p.id === id);
    if (product) {
      logAuditEvent({
        action: "visibility_toggled",
        productId: id,
        productName: product.name,
        changes: { visible: next[id] },
      });
    }
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

    const product = products.find((p) => p.id === id);
    if (product) {
      const changes: Record<string, unknown> = {};
      if (editDraft.name && editDraft.name !== product.name) changes.name = editDraft.name;
      if (editDraft.price !== undefined && editDraft.price !== product.price) changes.price = editDraft.price;
      if (editDraft.cost !== undefined && editDraft.cost !== product.cost) changes.cost = editDraft.cost;
      if (Object.keys(changes).length > 0) {
        logAuditEvent({
          action: "product_updated",
          productId: id,
          productName: editDraft.name || product.name,
          changes,
        });
      }
    }

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

    const updates: Record<string, number> = {};
    const events: Parameters<typeof logAuditEvent>[0][] = [];
    for (const p of products) {
      const draftVal = stockDraft[p.id];
      if (draftVal !== undefined && draftVal !== p.stock) {
        updates[p.id] = draftVal;
        events.push({
          action: "stock_adjusted",
          productId: p.id,
          productName: p.name,
          changes: { from: p.stock, to: draftVal },
        });
        logAuditEvent(events[events.length - 1]);
      }
    }
    if (Object.keys(updates).length > 0) {
      syncToSupabase(updates, events).catch(() => {});
    }
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
            <AdminProducts
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

          {tab === "orders" && <AdminOrders />}

          {tab === "stock" && (
            <AdminStock
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
