import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { products } from "@/data/products";
import { categories } from "@/data/categories";
import { cx } from "@/lib/format";
import type { Category } from "@/types";

type SortKey = "featured" | "price-asc" | "price-desc" | "name";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "price-asc", label: "Price: low → high" },
  { value: "price-desc", label: "Price: high → low" },
  { value: "name", label: "Name A–Z" },
];

export function Shop() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get("category") as Category | null;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");

  const setCategory = (cat: Category | null) => {
    const next = new URLSearchParams(params);
    if (cat) next.set("category", cat);
    else next.delete("category");
    setParams(next, { replace: true });
  };

  const visible = useMemo(() => {
    let list = products.slice();
    if (activeCategory) list = list.filter((p) => p.category === activeCategory);
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.tagline.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }
    switch (sort) {
      case "price-asc":
        list.sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        list.sort((a, b) => b.price - a.price);
        break;
      case "name":
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        list.sort((a, b) => Number(b.featured ?? false) - Number(a.featured ?? false));
    }
    return list;
  }, [activeCategory, query, sort]);

  const hasFilters = !!activeCategory || !!query.trim();

  return (
    <>
      <Seo title="Shop" description="Browse bottled water, coolers, dispensers and accessories." />

      <div className="container-page py-10">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Shop
          </h1>
          <p className="mt-1.5 text-ink-500 dark:text-ink-400">
            {visible.length} {visible.length === 1 ? "product" : "products"} available
          </p>
        </div>

        {/* Controls bar */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="input pl-10 pr-9"
              aria-label="Search products"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-ink-400" />
            <label htmlFor="sort" className="sr-only">Sort by</label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="input w-auto cursor-pointer"
            >
              {sortOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Category chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={cx("chip", !activeCategory ? "chip-active" : "chip-idle")}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategory(c.id)}
              className={cx("chip", activeCategory === c.id ? "chip-active" : "chip-idle")}
            >
              {c.label}
            </button>
          ))}
          {hasFilters && (
            <button
              type="button"
              onClick={() => { setCategory(null); setQuery(""); }}
              className="chip chip-idle flex items-center gap-1 text-red-600 border-red-200 hover:border-red-400 hover:text-red-700 dark:text-red-400 dark:border-red-900 dark:hover:border-red-700"
            >
              <X className="h-3 w-3" /> Clear filters
            </button>
          )}
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <Search className="h-12 w-12 text-ink-300 dark:text-ink-600" />
            <h2 className="font-display font-semibold text-ink-700 dark:text-ink-200">
              No products found
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Try adjusting your search or clearing the filters.
            </p>
            <button
              type="button"
              onClick={() => { setCategory(null); setQuery(""); }}
              className="btn-outline mt-2 px-5 py-2.5"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
