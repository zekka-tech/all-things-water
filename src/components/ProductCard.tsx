import { Link } from "react-router-dom";
import { ShoppingCart, Check } from "lucide-react";
import { useState } from "react";
import type { Product } from "@/types";
import { formatZAR } from "@/lib/format";
import { useCart } from "@/context/CartContext";
import { StockBadge } from "./StockBadge";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const soldOut = product.stock <= 0;

  const handleAdd = () => {
    addItem(product, 1);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1400);
  };

  return (
    <div className="card group flex flex-col overflow-hidden hover:-translate-y-1 hover:shadow-lg">
      <Link
        to={`/product/${product.slug}`}
        className="relative block aspect-square overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-800 dark:to-ink-900"
      >
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-contain p-6 transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-3 top-3">
          <StockBadge stock={product.stock} />
        </span>
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-600 dark:text-brand-400">
          {product.unit}
        </p>
        <h3 className="mt-1 font-semibold leading-snug">
          <Link to={`/product/${product.slug}`} className="hover:text-brand-700 dark:hover:text-brand-400">
            {product.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-2 text-sm text-ink-500 dark:text-ink-400">
          {product.tagline}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-lg font-bold">{formatZAR(product.price)}</span>
          <button
            type="button"
            onClick={handleAdd}
            disabled={soldOut}
            className="btn-primary px-3 py-2 text-xs"
          >
            {added ? (
              <>
                <Check className="h-4 w-4" /> Added
              </>
            ) : (
              <>
                <ShoppingCart className="h-4 w-4" /> {soldOut ? "Sold out" : "Add"}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
