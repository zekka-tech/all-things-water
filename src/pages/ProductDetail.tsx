import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShoppingCart } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { getProductBySlug, getRelatedProducts } from "@/data/products";
import { categoryLabel } from "@/data/categories";
import { formatZAR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { NotFound } from "./NotFound";

export function ProductDetail() {
  const { slug } = useParams();
  const product = slug ? getProductBySlug(slug) : undefined;
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  if (!product) return <NotFound />;

  const soldOut = product.stock <= 0;
  const related = getRelatedProducts(product);

  const handleAdd = () => {
    addItem(product, qty);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  };

  return (
    <>
      <Seo title={product.name} description={product.tagline} />

      <div className="container-page py-8">
        <Link
          to="/shop"
          className="inline-flex items-center gap-1 text-sm font-medium text-ink-500 hover:text-brand-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          <div className="card grid place-items-center bg-gradient-to-b from-brand-50 to-white p-10 dark:from-ink-800 dark:to-ink-900">
            <img
              src={product.image}
              alt={product.name}
              className="max-h-[420px] w-full object-contain"
            />
          </div>

          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
              {categoryLabel(product.category)}
            </p>
            <h1 className="mt-1 text-3xl font-extrabold tracking-tight">{product.name}</h1>
            <div className="mt-3 flex items-center gap-3">
              <span className="text-2xl font-bold">{formatZAR(product.price)}</span>
              <span className="text-sm text-ink-500">/ {product.unit}</span>
              <StockBadge stock={product.stock} />
            </div>

            <p className="mt-5 text-ink-600 dark:text-ink-300">{product.description}</p>

            <ul className="mt-6 space-y-2">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              {!soldOut && (
                <QuantityStepper value={qty} max={product.stock} onChange={setQty} />
              )}
              <button
                type="button"
                onClick={handleAdd}
                disabled={soldOut}
                className="btn-primary px-6 py-3 text-base"
              >
                {added ? (
                  <><Check className="h-5 w-5" /> Added to cart</>
                ) : (
                  <><ShoppingCart className="h-5 w-5" /> {soldOut ? "Sold out" : "Add to cart"}</>
                )}
              </button>
            </div>
            {soldOut && (
              <p className="mt-3 text-sm text-ink-500">
                This item is currently out of stock.{" "}
                <Link to="/contact" className="font-semibold text-brand-600 hover:underline">
                  Contact us
                </Link>{" "}
                to be notified when it's back.
              </p>
            )}
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold tracking-tight">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
