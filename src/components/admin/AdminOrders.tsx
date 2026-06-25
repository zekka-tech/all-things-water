import { useState, useEffect, useCallback } from "react";
import { formatZAR, cx } from "@/lib/format";
import { ClipboardList, RefreshCw, Loader2, XCircle, ChevronRight } from "lucide-react";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/adminAuth";
import { captureException } from "@/lib/sentry";

interface OrderItem {
  product_name: string;
  quantity: number;
  product_price: number;
}

interface Order {
  id: string;
  order_ref: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  delivery_method: string;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
  delivery_notes: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

const STATUS_FLOW: Record<string, string[]> = {
  paid: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  pending_payment: ["processing", "cancelled"],
  cancelled: [],
  expired: [],
};

function statusBadge(status: string) {
  const map: Record<string, { label: string; color: string }> = {
    pending_payment: { label: "Pending payment", color: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" },
    paid: { label: "Paid", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    processing: { label: "Processing", color: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400" },
    shipped: { label: "Shipped", color: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
    delivered: { label: "Delivered", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400" },
    cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400" },
    expired: { label: "Expired", color: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400" },
  };
  return map[status] ?? { label: status, color: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400" };
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
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
      const res = await fetch(`${env.supabaseUrl}/functions/v1/admin-orders`, {
        headers: {
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error(`Failed to fetch orders (${res.status})`);
      }
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      setError("Could not load orders. Please refresh.");
      captureException(err instanceof Error ? err : new Error(String(err)), { action: "adminFetchOrders" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId);
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${env.supabaseUrl}/functions/v1/order-status`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: env.supabaseAnonKey,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ orderId, status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to update (${res.status})`);
      }
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), { action: "adminUpdateStatus" });
      setError("Failed to update order status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
      </div>
    );
  }

  if (error && orders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
        <XCircle className="h-8 w-8 text-red-500" />
        <p className="text-sm text-ink-500 dark:text-ink-400">{error}</p>
        <button type="button" onClick={fetchOrders} className="btn-outline px-4 py-2 text-sm">
          <RefreshCw className="h-4 w-4" /> Try again
        </button>
      </div>
    );
  }

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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-500 dark:text-ink-400">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
        <button type="button" onClick={fetchOrders} className="btn-ghost px-3 py-1.5 text-sm" disabled={loading}>
          <RefreshCw className={cx("h-4 w-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-800 dark:bg-amber-500/10">
          <p className="text-sm text-amber-700 dark:text-amber-400">{error}</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((order) => {
          const badge = statusBadge(order.status);
          const isExpanded = expandedId === order.id;
          const nextStatuses = STATUS_FLOW[order.status] || [];
          const date = new Date(order.created_at).toLocaleDateString("en-ZA", {
            day: "numeric", month: "short", year: "numeric",
          });
          const itemSummary = order.order_items
            .map((i) => `${i.quantity}\u00d7 ${i.product_name}`)
            .join(", ");

          return (
            <div key={order.id} className="card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpandedId(isExpanded ? null : order.id)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left"
              >
                <span className="font-mono text-xs font-semibold text-brand-600 dark:text-brand-400">
                  {order.order_ref}
                </span>
                <span className="hidden text-xs text-ink-500 dark:text-ink-400 sm:block">{date}</span>
                <span className="flex-1 truncate text-sm font-medium text-ink-900 dark:text-white">
                  {order.customer_name}
                </span>
                <span className="hidden max-w-[200px] truncate text-xs text-ink-500 dark:text-ink-400 lg:block">
                  {itemSummary}
                </span>
                <span className="tabular-nums text-sm font-medium text-ink-900 dark:text-white">
                  {formatZAR(order.total)}
                </span>
                <span className={cx("badge", badge.color)}>{badge.label}</span>
                <ChevronRight className={cx("h-4 w-4 shrink-0 text-ink-400 transition-transform", isExpanded && "rotate-90")} />
              </button>

              {isExpanded && (
                <div className="border-t border-ink-100 px-4 py-4 dark:border-ink-800">
                  <div className="grid gap-4 sm:grid-cols-2">
                    {/* Items */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-500 dark:text-ink-400">Items</h4>
                      <ul className="mt-2 space-y-1 text-sm">
                        {order.order_items.map((item, idx) => (
                          <li key={idx} className="flex justify-between text-ink-700 dark:text-ink-200">
                            <span>{item.quantity}{"\u00d7"} {item.product_name}</span>
                            <span className="tabular-nums">{formatZAR(item.product_price * item.quantity)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Customer + delivery */}
                    <div>
                      <h4 className="text-xs font-semibold text-ink-500 dark:text-ink-400">Customer</h4>
                      <dl className="mt-2 space-y-1 text-sm text-ink-600 dark:text-ink-300">
                        <div className="flex justify-between"><dt>Email</dt><dd>{order.customer_email}</dd></div>
                        {order.customer_phone && <div className="flex justify-between"><dt>Phone</dt><dd>{order.customer_phone}</dd></div>}
                        {order.delivery_method === "delivery" && (
                          <>
                            <div className="flex justify-between"><dt>Address</dt><dd className="text-right">{order.delivery_address}</dd></div>
                            <div className="flex justify-between"><dt>City</dt><dd>{order.delivery_city}</dd></div>
                            <div className="flex justify-between"><dt>Postal</dt><dd>{order.delivery_postal_code}</dd></div>
                          </>
                        )}
                        <div className="flex justify-between"><dt>Method</dt><dd className="capitalize">{order.delivery_method}</dd></div>
                      </dl>
                    </div>
                  </div>

                  {/* Status actions */}
                  {nextStatuses.length > 0 && (
                    <div className="mt-4 border-t border-ink-100 pt-4 dark:border-ink-800">
                      <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">Update status</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {nextStatuses.map((s) => {
                          const sBadge = statusBadge(s);
                          return (
                            <button
                              key={s}
                              type="button"
                              disabled={updatingId === order.id}
                              onClick={() => updateStatus(order.id, s)}
                              className={cx(
                                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50",
                                sBadge.color,
                              )}
                            >
                              {updatingId === order.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                `Mark as ${sBadge.label}`
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}