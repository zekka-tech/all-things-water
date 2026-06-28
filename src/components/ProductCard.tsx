import { Link } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types";
import { formatZAR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { trackMarketing } from "@/lib/marketing";
import { StockBadge } from "./StockBadge";
import { OptimizedImage } from "./OptimizedImage";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  const handleAdd = () => {
    addItem(product, 1);
    trackMarketing({
      type: "add_to_cart",
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity: 1,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="card card-hover group flex flex-col overflow-hidden">
      {/* Image */}
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gradient-to-b from-brand-50 via-brand-50/60 to-white dark:from-ink-800 dark:via-ink-800/60 dark:to-ink-900"
      >
        <OptimizedImage
          src={product.image}
          alt={product.name}
          className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-[1.06]"
        />
        <span className="absolute left-3 top-3">
          <StockBadge stock={product.stock} />
        </span>
        {product.featured && !soldOut && (
          <span className="absolute right-3 top-3 badge bg-brand-600 text-white text-[10px]">
            Featured
          </span>
        )}
      </Link>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-600 dark:text-brand-400">
          {product.unit}
        </p>
        <h3 className="mt-1 font-display font-semibold leading-snug text-ink-900 dark:text-ink-50">
          <Link
            to={`/product/${product.slug}`}
            className="hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
          >
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {product.tagline}
        </p>

        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <span className="font-display text-lg font-bold text-ink-900 dark:text-white">
            {formatZAR(product.price)}
          </span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className={
              added
                ? "btn bg-emerald-600 px-3 py-2 text-xs text-white hover:bg-emerald-700"
                : "btn-primary px-3 py-2 text-xs"
            }
          >
            {added ? (
              <>
                <Check className="h-3.5 w-3.5" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-3.5 w-3.5" /> {soldOut ? "Sold out" : "Add"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
