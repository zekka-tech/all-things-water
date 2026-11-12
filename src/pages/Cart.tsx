import { useId, useState } from "react";
import { ArrowRight, Trash2, Truck } from "lucide-react";
import { Seo } from "@/components/Seo";
import { QuantityStepper } from "@/components/QuantityStepper";
import { TransitionLink as Link } from "@/components/TransitionLink";
import { useCart } from "@/context/CartContext";
import { formatZAR } from "@/lib/format";
import { DELIVERY_FEE, DELIVERY_THRESHOLD } from "@/lib/delivery";

export function Cart() {
  const { items, subtotal, setQuantity, removeItem, clear } = useCart();

  const delivery = subtotal >= DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const amountToFreeShipping = Math.max(0, DELIVERY_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, (subtotal / DELIVERY_THRESHOLD) * 100);
  const freeShipping = subtotal >= DELIVERY_THRESHOLD && subtotal > 0;

  // A splash when the cart crosses into free delivery (not on arrival).
  const [wasFree, setWasFree] = useState(freeShipping);
  const [splashes, setSplashes] = useState(0);
  if (freeShipping !== wasFree) {
    setWasFree(freeShipping);
    if (freeShipping) setSplashes((n) => n + 1);
  }

  if (items.length === 0) {
    return (
      <>
        <Seo title="Your cart" />
        <div className="group container-page flex flex-col items-center justify-center py-24 text-center">
          <EmptyGlass />
          <h1 className="mt-6 font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-white">
            Your cart is <span className="accent">empty.</span>
          </h1>
          <p className="mt-2 text-ink-500 dark:text-ink-400">
            Add some water to get started.
          </p>
          <Link to="/shop" className="btn-primary mt-7 px-6 py-3 text-base">
            Browse products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title="Your cart" />
      <div className="container-page py-10">
        <h1 className="display-2">
          Your <span className="accent">cart.</span>
        </h1>

        {/* Free shipping progress */}
        {subtotal > 0 && (
          <div className="mt-4 rounded-xl border border-ink-200 bg-ink-50 px-4 py-3 dark:border-ink-800 dark:bg-ink-900/50">
            <div className="flex items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2 text-ink-600 dark:text-ink-300">
                <Truck className="h-4 w-4 text-brand-600 dark:text-brand-400" />
                {freeShipping ? (
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">
                    You've unlocked free delivery!
                  </span>
                ) : (
                  <span>
                    Add{" "}
                    <span className="font-semibold text-ink-900 dark:text-white">
                      {formatZAR(amountToFreeShipping)}
                    </span>{" "}
                    more for free delivery
                  </span>
                )}
              </div>
              <span className="shrink-0 text-xs text-ink-500">{formatZAR(DELIVERY_THRESHOLD)}</span>
            </div>
            {/* The tube fills by transform, not width, so it never re-lays out. */}
            <div className="relative mt-3">
              <div
                role="progressbar"
                aria-label="Progress to free delivery"
                aria-valuemin={0}
                aria-valuemax={DELIVERY_THRESHOLD}
                aria-valuenow={Math.min(subtotal, DELIVERY_THRESHOLD)}
                className="relative h-3 overflow-hidden rounded-full bg-brand-100/80 ring-1 ring-brand-200/80 ring-inset dark:bg-ink-800 dark:ring-white/10"
              >
                <div
                  className={`absolute inset-0 rounded-full bg-linear-to-r transition-transform duration-700 ease-out-expo ${
                    freeShipping ? "from-emerald-400 to-emerald-600" : "from-brand-400 to-brand-600"
                  }`}
                  style={{ transform: `translateX(${shippingProgress - 100}%)` }}
                >
                  {/* Meniscus at the waterline. */}
                  <span className="absolute inset-y-0 right-0 w-2.5 rounded-full bg-white/55" />
                </div>
                {/* Glass highlight along the tube. */}
                <span className="absolute inset-x-2 top-0.5 h-px rounded-full bg-white/70 dark:bg-white/15" />
              </div>
              {splashes > 0 && (
                <span
                  key={splashes}
                  aria-hidden
                  className="animate-ring-out pointer-events-none absolute right-0 top-1/2 h-6 w-6 -translate-y-1/2 translate-x-1/2 rounded-full border-2 border-emerald-400"
                />
              )}
            </div>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          {/* Line items */}
          <div className="space-y-3 lg:col-span-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="card flex gap-4 p-4">
                <Link
                  to={`/product/${product.slug}`}
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-linear-to-b from-brand-50 to-white p-2 dark:from-ink-800 dark:to-ink-900"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full object-contain transition-transform duration-300 hover:scale-105"
                  />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-display font-semibold text-ink-900 hover:text-brand-600 dark:text-ink-50 dark:hover:text-brand-400 transition-colors"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                        {product.unit}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0 text-ink-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-auto flex items-center justify-between pt-3">
                    <QuantityStepper
                      value={quantity}
                      max={product.stock}
                      size="sm"
                      onChange={(q) => setQuantity(product.id, q)}
                    />
                    <span className="font-display font-bold text-ink-900 dark:text-white">
                      {formatZAR(product.price * quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={clear}
              className="text-sm font-medium text-ink-500 transition-colors hover:text-red-600 dark:hover:text-red-400"
            >
              Clear cart
            </button>
          </div>

          {/* Summary */}
          <aside className="card h-fit p-6">
            <h2 className="font-display text-lg font-bold text-ink-900 dark:text-white">
              Order summary
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Subtotal</dt>
                <dd className="font-medium">{formatZAR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500 dark:text-ink-400">Delivery</dt>
                <dd className={`font-medium ${freeShipping ? "text-emerald-600 dark:text-emerald-400" : ""}`}>
                  {delivery === 0 ? (subtotal > 0 ? "Free" : "—") : formatZAR(delivery)}
                </dd>
              </div>
              {delivery > 0 && (
                <p className="rounded-lg bg-brand-50 px-3 py-2 text-xs text-ink-500 dark:bg-brand-900/20 dark:text-ink-400">
                  Free delivery on orders over {formatZAR(DELIVERY_THRESHOLD)}.
                </p>
              )}
              <div className="divider pt-3">
                <div className="flex justify-between text-base">
                  <dt className="font-display font-bold text-ink-900 dark:text-white">Total</dt>
                  <dd className="font-display font-bold text-ink-900 dark:text-white">
                    {formatZAR(total)}
                  </dd>
                </div>
              </div>
            </dl>
            <Link to="/checkout" className="btn-primary mt-6 w-full py-3">
              Checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="mt-3 block text-center text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}

/** An empty tumbler that fills with water while the empty state is hovered. */
function EmptyGlass() {
  const clip = useId();
  return (
    <svg viewBox="0 0 120 140" aria-hidden className="h-36 w-32 text-ink-300 dark:text-ink-600">
      <defs>
        <clipPath id={clip}>
          <path d="M26 18h68l-8 106a8 8 0 0 1-8 7H42a8 8 0 0 1-8-7Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <g className="translate-y-[78%] transition-transform duration-1000 ease-out-expo group-hover:translate-y-[38%] motion-reduce:transition-none">
          <path
            d="M0 12q15-7 30 0t30 0 30 0 30 0V140H0Z"
            className="fill-brand-300/70 dark:fill-brand-600/60"
          />
        </g>
      </g>
      <path
        d="M26 18h68l-8 106a8 8 0 0 1-8 7H42a8 8 0 0 1-8-7Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M38 30l5 86" stroke="currentColor" strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
