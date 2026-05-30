import { Link } from "react-router-dom";
import { ArrowRight, ShoppingBag, Trash2 } from "lucide-react";
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

  if (items.length === 0) {
    return (
      <>
        <Seo title="Your cart" />
        <div className="container-page grid place-items-center py-24 text-center">
          <ShoppingBag className="h-14 w-14 text-ink-300" />
          <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-ink-500">Add some water to get started.</p>
          <Link to="/shop" className="btn-primary mt-6 px-5 py-3">
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
        <h1 className="text-3xl font-extrabold tracking-tight">Your cart</h1>

        <div className="mt-8 grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {items.map(({ product, quantity }) => (
              <div key={product.id} className="card flex gap-4 p-4">
                <Link
                  to={`/product/${product.slug}`}
                  className="grid h-24 w-24 shrink-0 place-items-center rounded-xl bg-brand-50 p-2 dark:bg-ink-800"
                >
                  <img src={product.image} alt={product.name} className="h-full object-contain" />
                </Link>
                <div className="flex flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link
                        to={`/product/${product.slug}`}
                        className="font-semibold hover:text-brand-600"
                      >
                        {product.name}
                      </Link>
                      <p className="text-sm text-ink-500">{product.unit}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(product.id)}
                      aria-label={`Remove ${product.name}`}
                      className="btn-ghost h-9 w-9 p-0 text-ink-400 hover:text-red-600"
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
                    <span className="font-bold">{formatZAR(product.price * quantity)}</span>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              onClick={clear}
              className="text-sm font-medium text-ink-500 hover:text-red-600"
            >
              Clear cart
            </button>
          </div>

          {/* Summary */}
          <aside className="card h-fit p-6">
            <h2 className="text-lg font-bold">Order summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="font-medium">{formatZAR(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-500">Delivery</dt>
                <dd className="font-medium">
                  {delivery === 0 ? "Free" : formatZAR(delivery)}
                </dd>
              </div>
              {delivery > 0 && (
                <p className="text-xs text-ink-400">
                  Free delivery on orders over {formatZAR(DELIVERY_THRESHOLD)}.
                </p>
              )}
              <div className="flex justify-between border-t border-ink-200 pt-3 text-base dark:border-ink-800">
                <dt className="font-bold">Total</dt>
                <dd className="font-bold">{formatZAR(total)}</dd>
              </div>
            </dl>
            <Link to="/checkout" className="btn-primary mt-6 w-full py-3">
              Checkout <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/shop"
              className="mt-3 block text-center text-sm font-medium text-brand-600 hover:underline"
            >
              Continue shopping
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
