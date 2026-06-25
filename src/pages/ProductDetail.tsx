import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, ShoppingCart, Tag } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { StockBadge } from "@/components/StockBadge";
import { QuantityStepper } from "@/components/QuantityStepper";
import { ProductReviews } from "@/components/ProductReviews";
import { getProductBySlug, getRelatedProducts } from "@/data/products";
import { categoryLabel } from "@/data/categories";
import { BackInStockNotify } from "@/components/BackInStockNotify";
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
        {/* Breadcrumb */}
        <Link
          to="/shop"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-400"
        >
          <ArrowLeft className="h-4 w-4" /> Back to shop
        </Link>

        {/* Product layout */}
        <div className="mt-6 grid gap-10 lg:grid-cols-2">
          {/* Image panel */}
          <div className="animate-fade-in card relative grid place-items-center overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/50 to-white p-10 dark:from-ink-800 dark:via-ink-800/50 dark:to-ink-900">
            {/* Decorative blur */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 -z-0 flex items-center justify-center"
            >
              <div className="h-64 w-64 rounded-full bg-brand-200/40 blur-3xl dark:bg-brand-700/20" />
            </div>
            <img
              src={product.image}
              alt={product.name}
              className="relative z-10 max-h-[420px] w-full object-contain drop-shadow-sm transition-transform duration-500 hover:scale-[1.03]"
            />
          </div>

          {/* Details panel */}
          <div className="animate-fade-in-delay flex flex-col">
            {/* Category + stock */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
                <Tag className="h-3 w-3" />
                {categoryLabel(product.category)}
              </span>
              <StockBadge stock={product.stock} />
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
              {product.name}
            </h1>

            <div className="mt-3 flex flex-wrap items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-ink-900 dark:text-white">
                {formatZAR(product.price)}
              </span>
              <span className="text-sm text-ink-500 dark:text-ink-400">/ {product.unit}</span>
            </div>

            <p className="mt-5 leading-relaxed text-ink-600 dark:text-ink-300">
              {product.description}
            </p>

            {/* Features */}
            <ul className="mt-6 space-y-2.5">
              {product.features.map((f) => (
                <li key={f} className="flex items-start gap-3 text-sm">
                  <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-brand-100 dark:bg-brand-500/15">
                    <Check className="h-3 w-3 text-brand-600 dark:text-brand-400" />
                  </span>
                  <span className="text-ink-700 dark:text-ink-200">{f}</span>
                </li>
              ))}
            </ul>

            {/* Quantity + CTA */}
            <div className="mt-auto pt-8">
              <div className="flex flex-wrap items-center gap-4">
                {!soldOut && (
                  <QuantityStepper value={qty} max={product.stock} onChange={setQty} />
                )}
                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={soldOut}
                  className={
                    added
                      ? "btn bg-emerald-600 px-6 py-3 text-base text-white hover:bg-emerald-700"
                      : "btn-primary px-6 py-3 text-base"
                  }
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5" /> Added to cart
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" />
                      {soldOut ? "Sold out" : "Add to cart"}
                    </>
                  )}
                </button>
              </div>

              {soldOut && (
                <BackInStockNotify productId={product.id} />
              )}
            </div>
          </div>
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="section-title">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        )}

        <ProductReviews productId={product.id} />
      </div>
    </>
  );
}
