import type { Product } from "@/types";
import { formatZAR } from "@/lib/format";
import { TransitionLink } from "./TransitionLink";

/** A compact product link for editorial surfaces (the dive, the guide). The
 *  thumbnail sits on white because catalogue photos are shot on white. */
export function MiniProduct({ product }: { product: Product }) {
  return (
    <li>
      <TransitionLink
        to={`/product/${product.slug}`}
        className="group flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white/70 p-2 pr-3 transition-colors hover:border-brand-300 dark:border-white/10 dark:bg-ink-950/40 dark:hover:border-brand-700"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white p-1">
          <img
            src={product.image}
            alt=""
            className="h-full w-full object-contain mix-blend-multiply transition-transform duration-300 group-hover:scale-110"
          />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-ink-900 dark:text-white">
            {product.name}
          </span>
          <span className="block text-xs text-ink-500 dark:text-ink-400">
            {formatZAR(product.price)} · {product.unit}
          </span>
        </span>
      </TransitionLink>
    </li>
  );
}
