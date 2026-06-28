import { useState, useEffect, useCallback } from "react";
import { Warehouse, RefreshCw, Loader2, Check } from "lucide-react";
import { cx } from "@/lib/format";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/adminAuth";
import { captureException } from "@/lib/sentry";
import { products } from "@/data/products";

interface WarehouseRow {
  id: string;
  code: string;
  name: string;
  province: string | null;
  serves_regions: string[];
  priority: number;
  active: boolean;
}

interface StockRow {
  product_id: string;
  warehouse_id: string;
  on_hand: number;
}

export default function AdminWarehouses() {
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [stock, setStock] = useState<StockRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setError("Supabase is not configured.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const token = await getAccessToken();
      if (!token) {
        setError("Not authenticated.");
        return;
      }
      const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-warehouses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "list" }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      const data = await res.json();
      setWarehouses(data.warehouses || []);
      setStock(data.stock || []);
    } catch (err) {
      setError("Could not load warehouses. Please refresh.");
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "adminFetchWarehouses",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onHandFor = (productId: string, warehouseId: string): number =>
    stock.find((s) => s.product_id === productId && s.warehouse_id === warehouseId)?.on_hand ?? 0;

  const setStockValue = async (productId: string, warehouseId: string, onHand: number) => {
    const key = `${productId}:${warehouseId}`;
    setSavingKey(key);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-warehouses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "setStock", productId, warehouseId, onHand }),
      });
      if (!res.ok) throw new Error(`Failed (${res.status})`);
      setStock((prev) => {
        const idx = prev.findIndex(
          (s) => s.product_id === productId && s.warehouse_id === warehouseId,
        );
        const next = [...prev];
        if (idx >= 0) next[idx] = { ...next[idx], on_hand: onHand };
        else next.push({ product_id: productId, warehouse_id: warehouseId, on_hand: onHand });
        return next;
      });
    } catch (err) {
      setError("Could not save stock. Please retry.");
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "adminSetWarehouseStock",
      });
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
          <Warehouse className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          Warehouses &amp; stock
        </h2>
        <button type="button" onClick={load} className="btn-outline px-3 py-1.5 text-sm">
          <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : warehouses.length === 0 ? (
        <p className="text-sm text-ink-500 dark:text-ink-400">No warehouses configured.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ink-200 text-left text-xs uppercase tracking-wide text-ink-400 dark:border-ink-800">
                <th className="py-2 pr-4">Product</th>
                {warehouses.map((w) => (
                  <th key={w.id} className="px-2 py-2 text-center">
                    {w.code}
                    {!w.active && <span className="ml-1 text-ink-400">(off)</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className="border-b border-ink-100 dark:border-ink-800/60">
                  <td className="py-2 pr-4 font-medium text-ink-800 dark:text-ink-100">{p.name}</td>
                  {warehouses.map((w) => {
                    const key = `${p.id}:${w.id}`;
                    return (
                      <td key={w.id} className="px-2 py-2 text-center">
                        <span className="inline-flex items-center gap-1">
                          <input
                            type="number"
                            min={0}
                            defaultValue={onHandFor(p.id, w.id)}
                            onBlur={(e) => {
                              const v = Math.max(0, Number(e.target.value) || 0);
                              if (v !== onHandFor(p.id, w.id)) setStockValue(p.id, w.id, v);
                            }}
                            className="input w-20 px-2 py-1 text-center text-sm"
                          />
                          {savingKey === key && <Check className="h-3.5 w-3.5 text-emerald-500" />}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
