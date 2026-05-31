import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag, Trash2, Truck } from "lucide-react";
import { Seo } from "@/components/Seo";
import { QuantityStepper } from "@/components/QuantityStepper";
import { useCart } from "@/context/CartContext";
import { formatZAR } from "@/lib/format";

const DELIVERY_THRESHOLD = 500;
const DELIVERY_FEE = 75;

export function Cart() {
  const { items, subtotal, setQuantity, removeItem, clear } = useCart();

  const delivery = subtotal >= DELIVERY_THRESHOLD || subtotal === 0 ? 0 : DELIVERY_FEE;
  const total = subtotal + delivery;
  const amountToFreeShipping = Math.max(0, DELIVERY_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, (subtotal / DELIVERY_THRESHOLD) * 100);
  const freeShipping = subtotal >= DELIVERY_THRESHOLD && subtotal > 0;

  if (items.length === 0) {
    return (
      <>
        <Seo title="Your cart" />
        <div className="container-page flex flex-col items-center justify-center py-28 text-center">
          <div className="icon-wrap-lg mb-2">
            <ShoppingBag className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-bold text-ink-900 dark:text-white">
            Your cart is empty
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
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
          Your cart
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
              <span className="shrink-0 text-xs text-ink-400">{formatZAR(DELIVERY_THRESHOLD)}</span>
            </div>
            <div className="progress-track mt-2">
              <div
                className={`progress-fill ${freeShipping ? "from-emerald-500 to-emerald-600" : ""}`}
                style={{ width: `${shippingProgress}%` }}
              />
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
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-gradient-to-b from-brand-50 to-white p-2 dark:from-ink-800 dark:to-ink-900"
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
                      className="btn-ghost h-8 w-8 shrink-0 rounded-lg p-0 text-ink-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
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
              className="text-sm font-medium text-ink-400 transition-colors hover:text-red-600 dark:hover:text-red-400"
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
