import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CreditCard, Truck, User, Check } from "lucide-react";
import { Seo } from "@/components/Seo";
import { useCart } from "@/context/CartContext";
import { formatZAR } from "@/lib/format";
import { cx } from "@/lib/format";

const DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 75;

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

export function Checkout() {
  const { items, subtotal, clear } = useCart();
  const [form, setForm] = useState<Form>(empty);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [placed, setPlaced] = useState(false);
  const [orderRef, setOrderRef] = useState("");

  const delivery = subtotal >= DELIVERY_THRESHOLD ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;

  if (items.length === 0 && !placed) {
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
    if (!form.address.trim()) next.address = "Please enter a delivery address.";
    if (!form.city.trim()) next.city = "Please enter your city.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const placeOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    const ref = `ATW-${Date.now().toString(36).toUpperCase().slice(-6)}`;
    setOrderRef(ref);
    setPlaced(true);
    clear();
  };

  if (placed) {
    return (
      <>
        <Seo title="Order confirmed" />
        <div className="container-page flex flex-col items-center py-28 text-center">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 dark:bg-emerald-500/15">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="mt-6 font-display text-3xl font-extrabold text-ink-900 dark:text-white">
            Thank you, {form.name.split(" ")[0]}!
          </h1>
          <p className="mt-3 max-w-md text-ink-500 dark:text-ink-400">
            Your order{" "}
            <span className="font-semibold text-ink-800 dark:text-ink-200">{orderRef}</span>{" "}
            has been received. We'll be in touch shortly to confirm payment and delivery.
          </p>
          <Link to="/shop" className="btn-primary mt-8 px-6 py-3 text-base">
            Continue shopping
          </Link>
        </div>
      </>
    );
  }

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

            {/* Delivery */}
            <section className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink-900 dark:text-white">
                <span className="icon-wrap h-8 w-8 rounded-lg">
                  <Truck className="h-4 w-4" />
                </span>
                Delivery address
              </h2>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                {field("address", "Street address", "text", true)}
                {field("city", "City / town")}
                {field("postal", "Postal code")}
                <div className="sm:col-span-2">
                  <label
                    htmlFor="notes"
                    className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-ink-200"
                  >
                    Delivery notes{" "}
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
                </div>
              </div>
            </section>

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
                  This is a demo store — no payment is taken now. Place your order and we'll contact
                  you to arrange payment via <strong className="text-ink-700 dark:text-ink-200">EFT</strong> or{" "}
                  <strong className="text-ink-700 dark:text-ink-200">card on delivery</strong>.
                </p>
              </div>
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
                <dt>Delivery</dt>
                <dd className={`font-medium ${delivery === 0 ? "text-emerald-600 dark:text-emerald-400" : "text-ink-800 dark:text-ink-200"}`}>
                  {delivery === 0 ? "Free" : formatZAR(delivery)}
                </dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base font-bold dark:border-ink-800">
                <dt className="text-ink-900 dark:text-white">Total</dt>
                <dd className="text-ink-900 dark:text-white">{formatZAR(total)}</dd>
              </div>
            </dl>
            <button type="submit" className="btn-primary mt-6 w-full py-3 text-base">
              Place order
            </button>
            <p className="mt-3 text-center text-xs text-ink-400 dark:text-ink-500">
              By placing your order you agree to our terms.
            </p>
          </aside>
        </div>
      </form>
    </>
  );
}
