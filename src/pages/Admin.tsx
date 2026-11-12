import { useState, useMemo, useEffect } from "react";
import { Seo } from "@/components/Seo";
import AdminProducts from "@/components/admin/AdminProducts";
import AdminOrders from "@/components/admin/AdminOrders";
import AdminStock from "@/components/admin/AdminStock";
import AdminWarehouses from "@/components/admin/AdminWarehouses";
import { adminCatalogRequest, type CatalogUpdate } from "@/lib/adminCatalog";
import { productFromRow, type ProductRow } from "@/lib/catalog";
import { cx } from "@/lib/format";
import {
  signInAdmin,
  signOutAdmin,
  isCurrentUserAdmin,
  onAdminAuthChange,
} from "@/lib/adminAuth";
import type { Product } from "@/types";
import {
  Package,
  Settings,
  Lock,
  ClipboardList,
  PackageOpen,
  Warehouse,
} from "lucide-react";

type Tab = "products" | "orders" | "stock" | "warehouses";

// ── Login Gate (Supabase Auth) ──
function LoginGate({ onAuthed }: { onAuthed: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signInAdmin(email, password);
    if (!result.ok) {
      setError(result.error || "Sign-in failed. Check your credentials.");
      setPassword("");
      setLoading(false);
      return;
    }

    // Credentials are valid, but only allowlisted users may enter.
    const isAdmin = await isCurrentUserAdmin();
    if (!isAdmin) {
      await signOutAdmin();
      setError("This account does not have admin access.");
      setPassword("");
      setLoading(false);
      return;
    }

    onAuthed();
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
          Sign in with your admin account to continue.
        </p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            aria-label="Email"
            required
            placeholder="Email"
            autoComplete="username"
            className="input"
            autoFocus
          />
          <input
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(null); }}
            aria-label="Password"
            required
            placeholder="Password"
            autoComplete="current-password"
            className={cx(
              "input",
              error && "border-red-400 focus:border-red-400 focus:ring-red-200 dark:border-red-500 dark:focus:ring-red-900",
            )}
          />
          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main Admin Component ──
export function Admin() {
  const [status, setStatus] = useState<"loading" | "unauthed" | "authed">("loading");
  const [tab, setTab] = useState<Tab>("products");

  // Resolve auth state from the Supabase session + admin allowlist, and stay in
  // sync with sign-in/sign-out events (e.g. token expiry, logout in another tab).
  useEffect(() => {
    let active = true;
    const resolve = async () => {
      const isAdmin = await isCurrentUserAdmin().catch(() => false);
      if (active) setStatus(isAdmin ? "authed" : "unauthed");
    };
    resolve();
    const unsubscribe = onAdminAuthChange(resolve);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  const [catalogRows, setCatalogRows] = useState<ProductRow[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Partial<Product>>({});
  const [stockDraft, setStockDraft] = useState<Record<string, number>>({});

  useEffect(() => {
    if (status !== "authed") return;
    let active = true;
    void adminCatalogRequest<{ products: ProductRow[] }>({ action: "list" })
      .then(({ products }) => { if (active) { setCatalogRows(products); setCatalogError(null); } })
      .catch(() => { if (active) setCatalogError("Could not load the catalogue. Reload to try again."); });
    return () => { active = false; };
  }, [status]);

  const mergedProducts = useMemo(() => catalogRows.map((row) => productFromRow(row, false)), [catalogRows]);
  const visibility = Object.fromEntries(catalogRows.map((row) => [row.id, row.visible !== false]));
  const stats = useMemo(() => ({
    totalProducts: mergedProducts.length,
    totalStock: mergedProducts.reduce((sum, p) => sum + p.stock, 0),
    totalValue: mergedProducts.reduce((sum, p) => sum + p.price * p.stock, 0),
    outOfStock: mergedProducts.filter((p) => p.stock === 0).length,
  }), [mergedProducts]);

  const saveUpdates = async (updates: CatalogUpdate[]): Promise<boolean> => {
    if (saving) return false;
    setSaving(true);
    setCatalogError(null);
    try {
      await adminCatalogRequest({ updates });
      setCatalogRows((rows) => rows.map((row) => ({ ...row, ...updates.find((update) => update.id === row.id) })));
      return true;
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Could not save changes. Please retry.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const switchTab = (next: Tab) => { setTab(next); setStockDraft({}); };
  const handleLogout = () => { void signOutAdmin(); };
  const handleToggleVisibility = (id: string) => { void saveUpdates([{ id, visible: !visibility[id] }]); };
  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditDraft({ name: product.name, price: product.price, cost: product.cost });
  };
  const cancelEditing = () => { setEditingId(null); setEditDraft({}); };
  const saveEditing = async (id: string) => {
    if (await saveUpdates([{ id, name: editDraft.name, price: editDraft.price, cost: editDraft.cost }])) cancelEditing();
  };
  const adjustStock = (id: string, delta: number) => {
    const stock = mergedProducts.find((p) => p.id === id)?.stock ?? 0;
    setStockDraft((previous) => ({ ...previous, [id]: Math.max(0, (previous[id] ?? stock) + delta) }));
  };
  const setStockDirect = (id: string, value: number) => { setStockDraft((previous) => ({ ...previous, [id]: value })); };
  const saveStockChanges = async () => {
    const updates = mergedProducts.filter((p) => stockDraft[p.id] !== undefined && stockDraft[p.id] !== p.stock)
      .map((p) => ({ id: p.id, stock: stockDraft[p.id] }));
    if (updates.length && await saveUpdates(updates)) setStockDraft({});
  };
  const resetStockChanges = () => { setStockDraft({}); };
  const hasStockChanges = mergedProducts.some((p) => stockDraft[p.id] !== undefined && stockDraft[p.id] !== p.stock);

  if (status === "loading") {
    return (
      <>
        <Seo title="Admin" description="Admin dashboard for All Things Water." noIndex />
        <div className="flex min-h-[80vh] items-center justify-center">
          <span className="text-sm text-ink-500 dark:text-ink-400">Loading…</span>
        </div>
      </>
    );
  }

  if (status !== "authed") {
    return (
      <>
        <Seo title="Admin" description="Admin dashboard for All Things Water." noIndex />
        <LoginGate onAuthed={() => setStatus("authed")} />
      </>
    );
  }

  return (
    <>
      <Seo title="Admin" description="Admin dashboard for All Things Water." noIndex />

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
            { key: "warehouses" as Tab, icon: Warehouse, label: "Warehouses" },
          ]).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={cx(
                "flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                tab === t.key
                  ? "bg-white text-ink-900 shadow-xs dark:bg-ink-700 dark:text-white"
                  : "text-ink-500 hover:text-ink-700 dark:text-ink-400 dark:hover:text-ink-200",
              )}
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>

        {catalogError && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{catalogError}</p>}
        {saving && <p role="status" className="mt-4 text-sm">Saving changes…</p>}
        {/* ── Tab Content ── */}
        <fieldset disabled={saving} className="mt-6">
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

          {tab === "warehouses" && <AdminWarehouses />}
        </fieldset>
      </div>
    </>
  );
}
