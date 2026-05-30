import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CreditCard, Truck, User } from "lucide-react";
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
          <h1 className="text-2xl font-bold">Your cart is empty</h1>
          <Link to="/shop" className="btn-primary mt-6 px-5 py-3">
            Browse products
          </Link>
        </div>
      </>
    );
  }

  const set = (key: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const validate = (): boolean => {
    const next: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) next.name = "Please enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Enter a valid email.";
    if (!/^[0-9+\s()-]{7,}$/.test(form.phone)) next.phone = "Enter a valid phone number.";
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
        <div className="container-page grid place-items-center py-24 text-center">
          <CheckCircle2 className="h-16 w-16 text-emerald-500" />
          <h1 className="mt-4 text-3xl font-extrabold">Thank you, {form.name.split(" ")[0]}!</h1>
          <p className="mt-2 max-w-md text-ink-500">
            Your order <span className="font-bold text-ink-800 dark:text-ink-100">{orderRef}</span> has
            been received. We'll be in touch shortly to confirm payment and delivery.
          </p>
          <Link to="/shop" className="btn-primary mt-8 px-5 py-3">
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
      <label htmlFor={key} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={key}
        type={type}
        value={form[key]}
        onChange={set(key)}
        className={cx("input", errors[key] && "border-red-400 focus:ring-red-200")}
        aria-invalid={Boolean(errors[key])}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  );

  return (
    <>
      <Seo title="Checkout" />
      <form onSubmit={placeOrder} className="container-page py-10">
        <h1 className="text-3xl font-extrabold tracking-tight">Checkout</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-8 lg:col-span-2">
            <section className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <User className="h-5 w-5 text-brand-600" /> Contact details
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field("name", "Full name", "text", true)}
                {field("email", "Email", "email")}
                {field("phone", "Phone", "tel")}
              </div>
            </section>

            <section className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Truck className="h-5 w-5 text-brand-600" /> Delivery address
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {field("address", "Street address", "text", true)}
                {field("city", "City / town")}
                {field("postal", "Postal code")}
                <div className="sm:col-span-2">
                  <label htmlFor="notes" className="mb-1 block text-sm font-medium">
                    Delivery notes (optional)
                  </label>
                  <textarea
                    id="notes"
                    rows={3}
                    value={form.notes}
                    onChange={set("notes")}
                    className="input resize-none"
                  />
                </div>
              </div>
            </section>

            <section className="card p-6">
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <CreditCard className="h-5 w-5 text-brand-600" /> Payment
              </h2>
              <p className="mt-2 text-sm text-ink-500">
                This is a demo store. No payment is taken — place the order and we'll contact you to
                arrange payment (EFT or card on delivery).
              </p>
            </section>
          </div>

          {/* Summary */}
          <aside className="card h-fit p-6">
            <h2 className="text-lg font-bold">Your order</h2>
            <ul className="mt-4 space-y-3 text-sm">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex justify-between gap-2">
                  <span className="text-ink-600 dark:text-ink-300">
                    {product.name} × {quantity}
                  </span>
                  <span className="font-medium">{formatZAR(product.price * quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-2 border-t border-ink-200 pt-4 text-sm dark:border-ink-800">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd>{formatZAR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Delivery</dt>
                <dd>{delivery === 0 ? "Free" : formatZAR(delivery)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink-200 pt-2 text-base font-bold dark:border-ink-800">
                <dt>Total</dt>
                <dd>{formatZAR(total)}</dd>
              </div>
            </dl>
            <button type="submit" className="btn-primary mt-6 w-full py-3">
              Place order
            </button>
          </aside>
        </div>
      </form>
    </>
  );
}
