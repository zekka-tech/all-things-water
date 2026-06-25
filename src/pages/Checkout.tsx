import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  CreditCard,
  Truck,
  User,
  Check,
  MapPin,
  AlertTriangle,
  XCircle,
  Smartphone,
  Store,
  Loader2,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { formatZAR, cx } from "@/lib/format";
import { env } from "@/lib/env";
import { apiPost, userFriendlyError } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { captureException } from "@/lib/sentry";
import {
  DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  DEPOT_ADDRESS,
  calculateDelivery,
  getDeliveryEstimate,
  isDeliverablePostalCode,
  type DeliveryMethod,
  type ZoneStatus,
} from "@/lib/delivery";

const WHATSAPP_OPTIN_KEY = "atw.whatsapp-optin";

interface Form {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  postal: string;
  notes: string;
}

const empty: Form = {
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postal: "",
  notes: "",
};

const steps = [
  { id: 1, label: "Contact", icon: User },
  { id: 2, label: "Delivery", icon: Truck },
  { id: 3, label: "Review", icon: CreditCard },
];

/** Label + icon pairing for each postal-code zone status. */
const postalFeedback: Record<
  ZoneStatus,
  { icon: typeof CheckCircle2; label: string; colour: string }
> = {
  metro: {
    icon: CheckCircle2,
    label: "We deliver to your area",
    colour: "text-emerald-600 dark:text-emerald-400",
  },
  borderline: {
    icon: AlertTriangle,
    label: "Please confirm your area — delivery may vary",
    colour: "text-amber-600 dark:text-amber-400",
  },
  "out-of-range": {
    icon: XCircle,
    label: "Currently not in delivery zone",
    colour: "text-red-600 dark:text-red-400",
  },
  invalid: {
    icon: XCircle,
    label: "Enter a valid 4‑digit postal code",
    colour: "text-red-600 dark:text-red-400",
  },
};

export function Checkout() {
  const { items, subtotal } = useCart();
  const { user } = useAuth();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // ── New state for enhancements ──
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("delivery");
  const [postalStatus, setPostalStatus] = useState<ZoneStatus>("invalid");
  const [postalDebounced, setPostalDebounced] = useState("");
  const [deliverySlot, setDeliverySlot] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(() => {
    try {
      return localStorage.getItem(WHATSAPP_OPTIN_KEY) === "true";
    } catch {
      return false;
    }
  });

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced postal-code validation (300 ms)
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setPostalDebounced(form.postal);
    }, 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [form.postal]);

  // Re-run zone check when debounced value settles
  useEffect(() => {
    if (postalDebounced.length === 0) {
      setPostalStatus("invalid");
      return;
    }
    const { zone } = isDeliverablePostalCode(postalDebounced);
    setPostalStatus(zone);
  }, [postalDebounced]);

  // Persist WhatsApp opt-in preference
  useEffect(() => {
    try {
      localStorage.setItem(WHATSAPP_OPTIN_KEY, String(whatsappOptIn));
    } catch {
      /* storage may be unavailable */
    }
  }, [whatsappOptIn]);

  // Pre-fill email when a logged-in customer reaches checkout
  useEffect(() => {
    if (user && !form.email) {
      setForm((f) => ({ ...f, email: user.email }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // ── Derived values ──
  const delivery = calculateDelivery(subtotal, deliveryMethod);
  const total = subtotal + delivery;
  const deliveryEstimate =
    postalStatus === "metro" || postalStatus === "borderline"
      ? getDeliveryEstimate(form.postal)
      : null;
  const isPostalDeliverable =
    deliveryMethod === "collection" || postalStatus === "metro" || postalStatus === "borderline";

  if (items.length === 0) {
    return (
      <>
        <Seo title="Checkout" />
        <div className="container-page py-24 text-center">
          <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
            Your cart is empty
          </h1>
          <Link to="/shop" className="btn-primary mt-6 px-5 py-3">
            Browse products
          </Link>
        </div>
      </>
    );
  }

  const set =
    (key: keyof Form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }));
      setErrors((er) => ({ ...er, [key]: undefined }));
    };

  const validate = (): boolean => {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      next.email = "Enter a valid email.";
    if (!/^[0-9+\s()-]{7,}$/.test(form.phone))
      next.phone = "Enter a valid phone number.";

    if (deliveryMethod === "delivery") {
      if (!form.address.trim()) next.address = "Please enter a delivery address.";
      if (!form.city.trim()) next.city = "Please enter your city.";
      if (!isPostalDeliverable) next.postal = "We cannot deliver to this postal code.";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    if (!env.supabaseUrl || !env.supabaseAnonKey) {
      setSubmitError("Checkout is temporarily unavailable until site configuration is completed.");
      setSubmitting(false);
      return;
    }

    try {
      const functionsUrl = `${env.supabaseUrl}/functions/v1`;

      // Attach the customer's access token so the Edge Function can link
      // the order to their account.
      const { data: sessionData } = supabase
        ? await supabase.auth.getSession()
        : { data: null };
      const authHeaders: Record<string, string> = {};
      if (sessionData?.session?.access_token) {
        authHeaders.Authorization = `Bearer ${sessionData.session.access_token}`;
      }

      const orderPayload = {
        items: items.map(({ product, quantity }) => ({
          productId: product.id,
          quantity,
        })),
        customer: {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
        },
        delivery: {
          address: deliveryMethod === "delivery" ? form.address.trim() : undefined,
          city: deliveryMethod === "delivery" ? form.city.trim() : undefined,
          postalCode: deliveryMethod === "delivery" ? form.postal.trim() : undefined,
          notes: form.notes.trim() || undefined,
          method: deliveryMethod,
        },
        whatsappOptin: whatsappOptIn,
        deliverySlot: deliveryMethod === "delivery" ? deliverySlot || undefined : undefined,
      };

      const orderResult = await apiPost<{ orderId: string; orderRef: string }>(
        `${functionsUrl}/orders`,
        orderPayload,
        authHeaders,
      );

      const paymentResult = await apiPost<{ redirectUrl: string }>(
        `${functionsUrl}/payments-payfast-initiate`,
        { orderId: orderResult.orderId },
        authHeaders,
      );

      window.location.href = paymentResult.redirectUrl;
    } catch (err) {
      captureException(err instanceof Error ? err : new Error(String(err)), {
        action: "placeOrder",
      });
      setSubmitError(userFriendlyError(err));
      setSubmitting(false);
    }
  };

  const field = (
    key: keyof Form,
    label: string,
    type = "text",
    full = false,
  ) => (
    <div className={cx(full && "sm:col-span-2")}>
      <label htmlFor={key} className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
        {label}
      </label>
      <input
        id={key}
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={cx("input", errors[key] && "border-red-400 focus:ring-red-200 dark:border-red-600")}
        aria-invalid={Boolean(errors[key])}
      />
      {errors[key] && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors[key]}</p>
      )}
    </div>
  );

  // ── Postal-code status indicator ──
  const postalFeedbackData = postalFeedback[postalStatus];
  const PostalIcon = postalFeedbackData.icon;

  return (
    <>
      <Seo title="Checkout" />
      <form onSubmit={placeOrder} className="container-page py-10">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          Checkout
        </h1>

        {/* Step indicators */}
        <div className="mt-6 flex items-center gap-0">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {i < 2 ? <Check className="h-3.5 w-3.5" /> : step.id}
                </span>
                <span className="hidden text-sm font-medium text-ink-700 dark:text-ink-300 sm:block">
                  {step.label}
                </span>
              </div>
              {i < steps.length - 1 && (
                <div className="mx-3 h-px w-8 bg-brand-300 dark:bg-brand-700 sm:w-16" />
              )}
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Contact */}
            <section className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
                <span className="icon-wrap h-8 w-8 rounded-lg">
                  <User className="h-4 w-4" />
                </span>
                Contact details
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {field("name", "Full name", "text", true)}
                {field("email", "Email", "email")}
                {field("phone", "Phone number", "tel")}
              </div>
            </section>

            {/* Delivery method selector */}
            <section className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
                <span className="icon-wrap h-8 w-8 rounded-lg">
                  <Truck className="h-4 w-4" />
                </span>
                Delivery method
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("delivery");
                    setErrors((er) => {
                      const withoutDelivery = { ...er };
                      delete withoutDelivery.address;
                      delete withoutDelivery.city;
                      delete withoutDelivery.postal;
                      return withoutDelivery;
                    });
                  }}
                  className={cx(
                    "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    deliveryMethod === "delivery"
                      ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                      : "border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600",
                  )}
                >
                  <span
                    className={cx(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      deliveryMethod === "delivery"
                        ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
                    )}
                  >
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">
                      Door-to-door delivery
                    </p>
                    <p className="mt-0.5 text-xs text-ink-500 dark:text-ink-400">
                      {subtotal >= DELIVERY_THRESHOLD
                        ? "Free"
                        : `${formatZAR(DELIVERY_FEE)} fee`}{" "}
                      · {DELIVERY_THRESHOLD >= subtotal
                        ? `Free over ${formatZAR(DELIVERY_THRESHOLD)}`
                        : `Orders over ${formatZAR(DELIVERY_THRESHOLD)}`}
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod("collection");
                    setErrors((er) => {
                      const withoutDelivery = { ...er };
                      delete withoutDelivery.address;
                      delete withoutDelivery.city;
                      delete withoutDelivery.postal;
                      return withoutDelivery;
                    });
                  }}
                  className={cx(
                    "flex items-start gap-3 rounded-xl border-2 p-4 text-left transition-colors",
                    deliveryMethod === "collection"
                      ? "border-brand-500 bg-brand-50 dark:border-brand-400 dark:bg-brand-500/10"
                      : "border-ink-200 hover:border-ink-300 dark:border-ink-700 dark:hover:border-ink-600",
                  )}
                >
                  <span
                    className={cx(
                      "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                      deliveryMethod === "collection"
                        ? "bg-brand-100 text-brand-600 dark:bg-brand-500/20 dark:text-brand-400"
                        : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400",
                    )}
                  >
                    <Store className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-ink-900 dark:text-white">
                      Collect from our depot
                    </p>
                    <p className="mt-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      Free
                    </p>
                  </div>
                </button>
              </div>

              {/* Depot address — shown when collection is selected */}
              {deliveryMethod === "collection" && (
                <div className="mt-4 flex items-start gap-3 rounded-lg bg-ink-50 p-4 dark:bg-ink-800/50">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-400 dark:text-ink-500" />
                  <div>
                    <p className="text-sm font-medium text-ink-700 dark:text-ink-200">
                      Depot address
                    </p>
                    <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                      {DEPOT_ADDRESS}
                    </p>
                  </div>
                </div>
              )}
            </section>

            {/* Delivery address — conditionally required */}
            {deliveryMethod === "delivery" && (
              <section className="card p-6">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
                  <span className="icon-wrap h-8 w-8 rounded-lg">
                    <MapPin className="h-4 w-4" />
                  </span>
                  Delivery address
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  {field("address", "Street address", "text", true)}
                  {field("city", "City / town")}

                  {/* Postal code with real-time zone indicator */}
                  <div>
                    <label
                      htmlFor="postal"
                      className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                    >
                      Postal code
                    </label>
                    <div className="relative">
                      <input
                        id="postal"
                        type="text"
                        maxLength={4}
                        inputMode="numeric"
                        value={form.postal}
                        onChange={set("postal")}
                        className={cx(
                          "input pr-10",
                          errors.postal && "border-red-400 focus:ring-red-200 dark:border-red-600",
                        )}
                        aria-invalid={Boolean(errors.postal)}
                        placeholder="e.g. 2000"
                      />
                      {/* Status icon inside the input */}
                      {form.postal.length === 4 && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          <PostalIcon
                            className={cx("h-4 w-4", postalFeedbackData.colour)}
                          />
                        </span>
                      )}
                    </div>
                    {/* Feedback text below the input */}
                    {form.postal.length === 4 && (
                      <p
                        className={cx(
                          "mt-1 flex items-center gap-1 text-xs",
                          postalFeedbackData.colour,
                        )}
                      >
                        {postalFeedbackData.label}
                      </p>
                    )}
                    {errors.postal && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors.postal}
                      </p>
                    )}
                  </div>
                </div>

                {/* Delivery slot selection */}
                <div className="mt-5">
                  <label htmlFor="slot" className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200">
                    Preferred delivery window
                  </label>
                  <select
                    id="slot"
                    value={deliverySlot}
                    onChange={(e) => setDeliverySlot(e.target.value)}
                    className="input"
                  >
                    <option value="">Choose a window…</option>
                    <option value="mon-am">Monday morning (08:00–12:00)</option>
                    <option value="mon-pm">Monday afternoon (12:00–17:00)</option>
                    <option value="tue-am">Tuesday morning (08:00–12:00)</option>
                    <option value="tue-pm">Tuesday afternoon (12:00–17:00)</option>
                    <option value="wed-am">Wednesday morning (08:00–12:00)</option>
                    <option value="wed-pm">Wednesday afternoon (12:00–17:00)</option>
                    <option value="thu-am">Thursday morning (08:00–12:00)</option>
                    <option value="thu-pm">Thursday afternoon (12:00–17:00)</option>
                    <option value="fri-am">Friday morning (08:00–12:00)</option>
                    <option value="fri-pm">Friday afternoon (12:00–17:00)</option>
                    <option value="sat-am">Saturday morning (08:00–12:00)</option>
                  </select>
                  <p className="mt-1 text-xs text-ink-400 dark:text-ink-500">
                    We&rsquo;ll do our best to deliver in your chosen window. A confirmed
                    slot will be emailed once your order is processed.
                  </p>
                </div>

                {/* Prominent delivery notes */}
                <div className="mt-5 rounded-lg border border-ink-200 bg-ink-50/50 p-4 dark:border-ink-700 dark:bg-ink-800/30">
                  <label
                    htmlFor="notes"
                    className="mb-2 flex items-center gap-1.5 text-sm font-medium text-ink-700 dark:text-ink-200"
                  >
                    <Smartphone className="h-3.5 w-3.5 text-ink-400" />
                    Delivery notes
                    <span className="font-normal text-ink-400">(optional)</span>
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={set("notes")}
                    placeholder="e.g. Gate code, building name, delivery hours…"
                    className="input resize-none"
                  />
                  <p className="mt-2 text-xs text-ink-400 dark:text-ink-500">
                    Help our driver find you quickly — include any access instructions or landmarks.
                  </p>
                </div>
              </section>
            )}

            {/* Payment */}
            <section className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
                <span className="icon-wrap h-8 w-8 rounded-lg">
                  <CreditCard className="h-4 w-4" />
                </span>
                Payment
              </h2>
              <div className="mt-4 rounded-xl bg-ink-50 px-4 py-3 dark:bg-ink-800/50">
                <p className="text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                  You&rsquo;ll be redirected to <strong className="text-ink-700 dark:text-ink-200">PayFast</strong>{" "}
                  to complete your payment securely via{" "}
                  <strong className="text-ink-700 dark:text-ink-200">EFT</strong>,{" "}
                  <strong className="text-ink-700 dark:text-ink-200">card</strong>, or{" "}
                  <strong className="text-ink-700 dark:text-ink-200">Instant EFT</strong>.
                </p>
              </div>

              {submitError && (
                <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900 dark:bg-red-500/10">
                  <p className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400">
                    <XCircle className="h-4 w-4 shrink-0" />
                    {submitError}
                  </p>
                  <button
                    type="submit"
                    className="mt-2 text-sm font-medium text-red-600 hover:underline dark:text-red-400"
                  >
                    Try again
                  </button>
                </div>
              )}
            </section>
          </div>

          {/* Order summary */}
          <aside className="card h-fit p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">
              Your order
            </h2>
            <ul className="mt-4 divide-y divide-ink-100 text-sm dark:divide-ink-800">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between gap-2 py-2.5">
                  <span className="text-ink-600 dark:text-ink-300">
                    {product.name}{" "}
                    <span className="text-ink-400">× {quantity}</span>
                  </span>
                  <span className="font-medium text-ink-900 dark:text-white">
                    {formatZAR(product.price * quantity)}
                  </span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm dark:border-ink-800">
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <dt>Subtotal</dt>
                <dd className="font-medium text-ink-800 dark:text-ink-200">{formatZAR(subtotal)}</dd>
              </div>
              <div className="flex justify-between text-ink-500 dark:text-ink-400">
                <dt>{deliveryMethod === "collection" ? "Collection" : "Delivery"}</dt>
                <dd className={`font-medium ${delivery === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-ink-800 dark:text-ink-200"}`}>
                  {delivery === 0 ? "Free" : formatZAR(delivery)}
                </dd>
              </div>
              {deliveryEstimate && (
                <div className="flex justify-between text-ink-500 dark:text-ink-400">
                  <dt>Est. delivery</dt>
                  <dd className="font-medium text-ink-800 dark:text-ink-200">
                    {deliveryEstimate}
                  </dd>
                </div>
              )}
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-bold dark:border-ink-800">
                <dt className="text-ink-900 dark:text-white">Total</dt>
                <dd className="text-ink-900 dark:text-white">{formatZAR(total)}</dd>
              </div>
            </dl>

            {/* WhatsApp order updates opt-in */}
            <label className="mt-4 flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={whatsappOptIn}
                onChange={(e) => setWhatsappOptIn(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600 dark:bg-ink-800"
              />
              <span className="text-xs leading-relaxed text-ink-500 dark:text-ink-400">
                Send order updates via <strong className="text-ink-700 dark:text-ink-200">WhatsApp</strong>{" "}
                to the phone number provided.
              </span>
            </label>

            <button
              type="submit"
              disabled={!isPostalDeliverable || submitting}
              className="btn-primary mt-6 w-full py-3 text-base"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Processing&hellip;
                </span>
              ) : (
                "Place order"
              )}
            </button>
            {!isPostalDeliverable && deliveryMethod === "delivery" && !submitting && (
              <p className="mt-2 text-center text-xs text-red-600 dark:text-red-400">
                Please enter a deliverable postal code to continue.
              </p>
            )}
            <p className="mt-3 text-center text-xs text-ink-400 dark:text-ink-500">
              By placing your order you agree to our terms.
            </p>
          </aside>
        </div>
      </form>
    </>
  );
}
