import { useMemo, useState, useRef, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
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

const priceRange = () => {
  const prices = products.map((p) => p.price);
  return { min: Math.min(...prices), max: Math.max(...prices) };
};

export function Shop() {
  const [params, setParams] = useSearchParams();
  const activeCategory = params.get("category") as Category | null;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("featured");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [inStockOnly, setInStockOnly] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const { min: globalMin, max: globalMax } = priceRange();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 5);
  }, [query]);

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
    const pMin = parseFloat(priceMin);
    if (!isNaN(pMin)) list = list.filter((p) => p.price >= pMin);
    const pMax = parseFloat(priceMax);
    if (!isNaN(pMax)) list = list.filter((p) => p.price <= pMax);
    if (inStockOnly) list = list.filter((p) => p.stock > 0);
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
  }, [activeCategory, query, sort, priceMin, priceMax, inStockOnly]);

  const hasFilters = !!activeCategory || !!query.trim() || !!priceMin || !!priceMax || inStockOnly;

  const activeFilterCount = [activeCategory, query.trim(), priceMin || priceMax, inStockOnly].filter(
    Boolean,
  ).length;

  const clearAll = () => {
    setCategory(null);
    setQuery("");
    setPriceMin("");
    setPriceMax("");
    setInStockOnly(false);
  };

  return (
    <>
      <Seo title="Shop" description="Browse bottled water, dispensers, water filters and accessories." />

      <div className="container-page py-10">
        {/* Header */}
        <div className="animate-fade-in">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-white">
            Shop
          </h1>
          <p className="mt-1.5 text-ink-500 dark:text-ink-400">
            {visible.length} of {products.length} products
          </p>
        </div>

        {/* Controls bar */}
        <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search with suggestions */}
          <div ref={searchRef} className="relative max-w-sm flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              placeholder="Search products…"
              className="input pl-10 pr-9"
              aria-label="Search products"
            />
            {query && (
              <button
                type="button"
                onClick={() => { setQuery(""); setShowSuggestions(false); }}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-ink-200 bg-white shadow-lg dark:border-ink-700 dark:bg-ink-900">
                {suggestions.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      navigate(`/product/${p.slug}`);
                      setShowSuggestions(false);
                    }}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                  >
                    <img src={p.image} alt="" className="h-8 w-8 rounded object-cover" />
                    <span className="truncate">{p.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sort + Filters toggle */}
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
            <button
              type="button"
              onClick={() => setShowFilters((v) => !v)}
              className={cx(
                "btn-outline flex items-center gap-1.5 px-3 py-2 text-sm lg:hidden",
                showFilters && "border-brand-400 text-brand-600",
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters
              {activeFilterCount > 0 && (
                <span className="grid h-4 w-4 place-items-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
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
        </div>

        {/* Price + Stock filters */}
        <div
          className={cx(
            "mt-4 overflow-hidden transition-all duration-200",
            showFilters ? "block lg:block" : "hidden lg:block",
          )}
        >
          <div className="flex flex-wrap items-end gap-4 rounded-xl bg-ink-50 p-4 dark:bg-ink-800/50">
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
                Min price (R)
              </label>
              <input
                type="number"
                min={globalMin}
                max={globalMax}
                placeholder={String(globalMin)}
                value={priceMin}
                onChange={(e) => setPriceMin(e.target.value)}
                className="input w-28"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-ink-500 dark:text-ink-400">
                Max price (R)
              </label>
              <input
                type="number"
                min={globalMin}
                max={globalMax}
                placeholder={String(globalMax)}
                value={priceMax}
                onChange={(e) => setPriceMax(e.target.value)}
                className="input w-28"
              />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm text-ink-700 dark:text-ink-200">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-4 w-4 rounded border-ink-300 text-brand-600 focus:ring-brand-500 dark:border-ink-600"
              />
              In stock only
            </label>
            {hasFilters && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 pb-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        {visible.length === 0 ? (
          <div className="mt-20 flex flex-col items-center gap-4 text-center">
            <Search className="h-12 w-12 text-ink-300 dark:text-ink-600" />
            <h2 className="font-display font-semibold text-ink-700 dark:text-ink-200">
              No products match your criteria
            </h2>
            <p className="text-sm text-ink-500 dark:text-ink-400">
              Try adjusting your filters or browse by category instead.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={clearAll}
                className="btn-outline px-5 py-2.5"
              >
                Clear all filters
              </button>
              <button
                type="button"
                onClick={() => navigate("/shop")}
                className="btn-ghost px-5 py-2.5"
              >
                Browse all products
              </button>
            </div>
            <p className="mt-4 text-xs text-ink-400 dark:text-ink-500">
              Browse by:{" "}
              {categories.map((c, i) => (
                <span key={c.id}>
                  <button
                    type="button"
                    onClick={() => setCategory(c.id)}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {c.label}
                  </button>
                  {i < categories.length - 1 && " · "}
                </span>
              ))}
            </p>
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
