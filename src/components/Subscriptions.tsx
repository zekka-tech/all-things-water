import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  Repeat,
  Loader2,
  Pause,
  Play,
  XCircle,
  Plus,
  CalendarClock,
} from "lucide-react";
import { useAuth } from "@/context/useAuth";
import { supabase } from "@/lib/supabase";
import { products } from "@/data/products";
import { cx, formatZAR } from "@/lib/format";
import { captureException } from "@/lib/sentry";
import {
  FREQUENCY_OPTIONS,
  frequencyLabel,
  subscriptionStatusBadgeClass,
  subscriptionStatusLabel,
  type Frequency,
  type NewSubscriptionIntent,
  type SubscriptionRow,
  type SubscriptionStatus,
} from "@/lib/subscriptions";

interface DeliveryPrefill {
  customer_name: string;
  customer_phone: string | null;
  delivery_address: string | null;
  delivery_city: string | null;
  delivery_postal_code: string | null;
}

const SELLABLE = products.filter((p) => p.stock > 0);

export function Subscriptions() {
  const { user } = useAuth();
  const location = useLocation();
  const [subs, setSubs] = useState<SubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [productId, setProductId] = useState(SELLABLE[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [frequency, setFrequency] = useState<Frequency>("monthly");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user || !supabase) {
      setSubs([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from("subscriptions")
        .select(
          "id, product_id, product_name, quantity, unit_price, frequency, status, next_delivery_date",
        )
        .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .order("next_delivery_date", { ascending: true });
      if (err) throw err;
      setSubs((data ?? []) as SubscriptionRow[]);
    } catch (err) {
      setError("Could not load your subscriptions. Please try again.");
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "loadSubscriptions",
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Prefill delivery details from the most recent order, if any.
  const loadPrefill = useCallback(async () => {
    if (!user || !supabase) return;
    setName(user.email.split("@")[0] ?? "");
    try {
      const { data } = await supabase
        .from("orders")
        .select(
          "customer_name, customer_phone, delivery_address, delivery_city, delivery_postal_code",
        )
        .or(`user_id.eq.${user.id},customer_email.eq.${user.email}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data) {
        const o = data as DeliveryPrefill;
        setName(o.customer_name || "");
        setPhone(o.customer_phone ?? "");
        setAddress(o.delivery_address ?? "");
        setCity(o.delivery_city ?? "");
        setPostalCode(o.delivery_postal_code ?? "");
      }
    } catch {
      /* prefill is best-effort */
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: string, status: SubscriptionStatus) => {
    if (!supabase) return;
    setBusyId(id);
    try {
      const { error: err } = await supabase
        .from("subscriptions")
        .update({ status })
        .eq("id", id);
      if (err) throw err;
      setSubs((prev) =>
        prev.map((s) => (s.id === id ? { ...s, status } : s)),
      );
    } catch (err) {
      setError("Could not update that subscription. Please try again.");
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "updateSubscription",
      });
    } finally {
      setBusyId(null);
    }
  };

  const openCreator = useCallback(() => {
    setFormError(null);
    setCreating(true);
    loadPrefill();
  }, [loadPrefill]);

  // Deep-link support: a PDP "Subscribe & save" button navigates here with an
  // intent in router state. Pre-open the creator with the chosen product.
  useEffect(() => {
    const intent = (location.state as { newSubscription?: NewSubscriptionIntent } | null)
      ?.newSubscription;
    if (!intent || !user) return;
    if (SELLABLE.some((p) => p.id === intent.productId)) {
      setProductId(intent.productId);
    }
    if (intent.quantity) setQuantity(Math.max(1, intent.quantity));
    if (intent.frequency) setFrequency(intent.frequency);
    openCreator();
  }, [location.state, user, openCreator]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!user || !supabase) return;

    const product = products.find((p) => p.id === productId);
    if (!product) {
      setFormError("Please choose a product.");
      return;
    }
    if (quantity < 1) {
      setFormError("Quantity must be at least 1.");
      return;
    }
    if (!name.trim()) {
      setFormError("Please enter a delivery name.");
      return;
    }
    if (!address.trim() || !city.trim() || !postalCode.trim()) {
      setFormError("Please complete the delivery address, city and postal code.");
      return;
    }

    setSubmitting(true);
    try {
      const { error: err } = await supabase.from("subscriptions").insert({
        user_id: user.id,
        customer_name: name.trim(),
        customer_email: user.email,
        customer_phone: phone.trim() || null,
        delivery_address: address.trim(),
        delivery_city: city.trim(),
        delivery_postal_code: postalCode.trim(),
        delivery_notes: notes.trim() || null,
        product_id: product.id,
        product_name: product.name,
        quantity,
        unit_price: product.price,
        frequency,
      });
      if (err) throw err;
      setCreating(false);
      setQuantity(1);
      setNotes("");
      await load();
    } catch (err) {
      setFormError("Could not create the subscription. Please try again.");
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "createSubscription",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-xl font-bold text-ink-900 dark:text-white">
          <Repeat className="h-5 w-5 text-brand-600 dark:text-brand-400" />
          Subscriptions
        </h2>
        {!creating && (
          <button
            type="button"
            onClick={openCreator}
            className="btn-outline px-4 py-2 text-sm"
          >
            <Plus className="h-4 w-4" /> New subscription
          </button>
        )}
      </div>
      <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
        Set up a standing order and we&rsquo;ll email you a one-click pay link
        each time it&rsquo;s due. No card details are ever stored.
      </p>

      {/* Creator */}
      {creating && (
        <form
          onSubmit={handleCreate}
          className="mt-6 rounded-xl border border-ink-200 bg-ink-50/50 p-5 dark:border-ink-800 dark:bg-ink-800/30"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="sub-product" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Product
              </label>
              <select
                id="sub-product"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                className="input"
              >
                {SELLABLE.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {formatZAR(p.price)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-qty" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Quantity
              </label>
              <input
                id="sub-qty"
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="sub-freq" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Frequency
              </label>
              <select
                id="sub-freq"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="input"
              >
                {FREQUENCY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="sub-name" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Delivery name
              </label>
              <input
                id="sub-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="sub-phone" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Phone (optional)
              </label>
              <input
                id="sub-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sub-address" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Delivery address
              </label>
              <input
                id="sub-address"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="sub-city" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                City
              </label>
              <input
                id="sub-city"
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="sub-postal" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Postal code
              </label>
              <input
                id="sub-postal"
                type="text"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className="input"
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="sub-notes" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                Delivery notes (optional)
              </label>
              <input
                id="sub-notes"
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="input"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-4 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
              <XCircle className="h-4 w-4 shrink-0" /> {formError}
            </p>
          )}

          <div className="mt-5 flex items-center gap-2">
            <button type="submit" disabled={submitting} className="btn-primary px-5 py-2.5 text-sm">
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Saving&hellip;
                </span>
              ) : (
                "Create subscription"
              )}
            </button>
            <button
              type="button"
              onClick={() => setCreating(false)}
              className="btn-outline px-5 py-2.5 text-sm"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-500/10">
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          <button
            type="button"
            onClick={load}
            className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
          >
            Try again
          </button>
        </div>
      ) : subs.length === 0 ? (
        !creating && (
          <div className="mt-6 rounded-xl border border-ink-200 bg-ink-50 px-6 py-12 text-center dark:border-ink-800 dark:bg-ink-800/30">
            <p className="text-ink-500 dark:text-ink-400">
              You don&rsquo;t have any subscriptions yet.
            </p>
            <button
              type="button"
              onClick={openCreator}
              className="btn-primary mt-4 inline-flex px-5 py-2.5 text-sm"
            >
              <Plus className="h-4 w-4" /> Set one up
            </button>
          </div>
        )
      ) : (
        <ul className="mt-6 space-y-3">
          {subs.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-ink-200 p-4 dark:border-ink-800"
            >
              <div className="min-w-0">
                <p className="font-medium text-ink-900 dark:text-white">
                  {s.product_name}{" "}
                  <span className="text-ink-500 dark:text-ink-400">&times; {s.quantity}</span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500 dark:text-ink-400">
                  <span>{frequencyLabel(s.frequency)}</span>
                  <span>{formatZAR(s.unit_price * s.quantity)}</span>
                  {s.status !== "cancelled" && (
                    <span className="inline-flex items-center gap-1">
                      <CalendarClock className="h-3.5 w-3.5" />
                      Next:{" "}
                      {new Date(s.next_delivery_date).toLocaleDateString("en-ZA", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={cx("badge", subscriptionStatusBadgeClass(s.status))}>
                  {subscriptionStatusLabel(s.status)}
                </span>
                {s.status === "active" && (
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "paused")}
                    disabled={busyId === s.id}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {s.status === "paused" && (
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "active")}
                    disabled={busyId === s.id}
                    className="btn-outline px-3 py-1.5 text-xs"
                  >
                    <Play className="h-3.5 w-3.5" /> Resume
                  </button>
                )}
                {s.status !== "cancelled" && (
                  <button
                    type="button"
                    onClick={() => setStatus(s.id, "cancelled")}
                    disabled={busyId === s.id}
                    className="btn-outline px-3 py-1.5 text-xs text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Cancel
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
