import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Package,
  LogIn,
  UserPlus,
  LogOut,
  Loader2,
  Mail,
  Lock,
  User as UserIcon,
  XCircle,
  RefreshCw,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { useAuth } from "@/context/useAuth";
import { supabase } from "@/lib/supabase";
import { formatZAR } from "@/lib/format";
import { captureException } from "@/lib/sentry";
import { cx } from "@/lib/format";

interface OrderRow {
  id: string;
  order_ref: string;
  status: string;
  total: number;
  created_at: string;
  delivery_method: string;
}

type Mode = "login" | "register";

export function Account() {
  const { user, loading, hasConfig, signIn, signUp, signOut, refresh } = useAuth();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!user || !supabase) {
      setOrders([]);
      return;
    }
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("id, order_ref, status, total, created_at, delivery_method")
        .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      setOrders(data as OrderRow[]);
    } catch (err) {
      setOrdersError("Could not load your orders. Please try again.");
      captureException(err instanceof Error ? err : new Error(String(err)), { action: "loadOrders" });
    } finally {
      setOrdersLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "login") {
        const res = await signIn(email.trim(), password);
        if (!res.ok) setError(res.error ?? "Sign in failed.");
      } else {
        if (!name.trim()) {
          setError("Please enter your name.");
          return;
        }
        if (password.length < 6) {
          setError("Password must be at least 6 characters.");
          return;
        }
        const res = await signUp(email.trim(), password, name.trim());
        if (!res.ok) {
          setError(res.error ?? "Sign up failed.");
        } else {
          setInfo("Check your email for a confirmation link to activate your account.");
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    setOrders([]);
    setMode("login");
    setEmail("");
    setPassword("");
    setName("");
  };

  // ── No Supabase config ──
  if (!hasConfig) {
    return (
      <>
        <Seo title="Account" noIndex />
        <div className="container-page py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            Accounts are unavailable
          </h1>
          <p className="mx-auto mt-3 max-w-md text-ink-500 dark:text-ink-400">
            Account features will be available once site configuration is completed.
          </p>
          <Link to="/shop" className="btn-primary mt-6 px-5 py-3">
            Browse products
          </Link>
        </div>
      </>
    );
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    );
  }

  // ── Signed-out: login / register ──
  if (!user) {
    return (
      <>
        <Seo title={mode === "login" ? "Sign in" : "Create account"} noIndex />
        <div className="container-page py-16">
          <div className="mx-auto max-w-md">
            <div className="card p-8">
              <h1 className="font-display text-2xl font-extrabold text-center text-ink-900 dark:text-white">
                {mode === "login" ? "Welcome back" : "Create your account"}
              </h1>
              <p className="mt-2 text-center text-sm text-ink-500 dark:text-ink-400">
                {mode === "login"
                  ? "Sign in to view your orders and manage subscriptions."
                  : "Join to track orders, save your details, and subscribe."}
              </p>

              {/* Mode toggle */}
              <div className="mt-6 grid grid-cols-2 gap-1 rounded-xl bg-ink-100 p-1 dark:bg-ink-800">
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(null); setInfo(null); }}
                  className={cx(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
                    mode === "login"
                      ? "bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-white"
                      : "text-ink-500 hover:text-ink-700 dark:text-ink-400",
                  )}
                >
                  <LogIn className="h-4 w-4" /> Sign in
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("register"); setError(null); setInfo(null); }}
                  className={cx(
                    "flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors",
                    mode === "register"
                      ? "bg-white text-ink-900 shadow-sm dark:bg-ink-900 dark:text-white"
                      : "text-ink-500 hover:text-ink-700 dark:text-ink-400",
                  )}
                >
                  <UserPlus className="h-4 w-4" /> Register
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                {mode === "register" && (
                  <div>
                    <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                      Full name
                    </label>
                    <div className="relative">
                      <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                      <input
                        id="name"
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="input pl-10"
                        required
                      />
                    </div>
                  </div>
                )}
                <div>
                  <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                    <input
                      id="password"
                      type="password"
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="input pl-10"
                      required
                    />
                  </div>
                </div>

                {error && (
                  <p className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" /> {error}
                  </p>
                )}
                {info && (
                  <p className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
                    {info}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full py-3 text-base"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" /> Please wait&hellip;
                    </span>
                  ) : mode === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
            </div>
          </div>
        </div>
      </>
    );
  }

  // ── Signed-in: dashboard ──
  return (
    <>
      <Seo title="My Account" noIndex />
      <div className="container-page py-12">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-extrabold text-ink-900 dark:text-white">
              My Account
            </h1>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { refresh(); loadOrders(); }}
              className="btn-outline px-4 py-2 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Refresh
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-outline px-4 py-2 text-sm"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>

        {/* Orders */}
        <section className="mt-10">
          <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900 dark:text-white">
            <Package className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Order history
          </h2>

          {ordersLoading ? (
            <div className="mt-6 flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : ordersError ? (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-500/10">
              <p className="text-sm text-red-700 dark:text-red-400">{ordersError}</p>
              <button type="button" onClick={loadOrders} className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400">
                Try again
              </button>
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50 px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-800/30">
              <p className="text-ink-500 dark:text-ink-400">You haven&rsquo;t placed any orders yet.</p>
              <Link to="/shop" className="btn-primary mt-4 inline-flex px-5 py-2.5 text-sm">
                Start shopping
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800">
              <table className="w-full text-left text-sm">
                <thead className="bg-ink-50 text-ink-600 dark:bg-ink-800/50 dark:text-ink-300">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Order</th>
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-100 dark:divide-ink-800">
                  {orders.map((o) => (
                    <tr key={o.id} className="hover:bg-ink-50/50 dark:hover:bg-ink-800/30">
                      <td className="px-4 py-3 font-medium text-ink-900 dark:text-white">
                        {o.order_ref}
                      </td>
                      <td className="px-4 py-3 text-ink-600 dark:text-ink-300">
                        {new Date(o.created_at).toLocaleDateString("en-ZA", {
                          year: "numeric", month: "short", day: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cx("badge", statusBadgeClass(o.status))}>
                          {statusLabel(o.status)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink-900 dark:text-white">
                        {formatZAR(o.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_payment: "Awaiting payment",
    paid: "Paid",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    expired: "Expired",
  };
  return labels[status] ?? status;
}

function statusBadgeClass(status: string): string {
  const classes: Record<string, string> = {
    pending_payment: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
    paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    processing: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
    shipped: "bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300",
    delivered: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
    cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
    expired: "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400",
  };
  return classes[status] ?? "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-400";
}