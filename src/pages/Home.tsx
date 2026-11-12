import { ArrowRight } from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { Reveal } from "@/components/Reveal";
import { TiltCard } from "@/components/TiltCard";
import { PhotoFrame } from "@/components/PhotoFrame";
import { TransitionLink } from "@/components/TransitionLink";
import { WaterPlanner } from "@/components/WaterPlanner";
import { WaterDive } from "@/components/home/WaterDive";
import { useRipple } from "@/components/Ripple";
import { useCatalog } from "@/context/CatalogContext";
import { categories } from "@/data/categories";
import { photos, type PhotoSlot } from "@/data/photos";
import type { Category, CategoryMeta } from "@/types";

const portalPhoto: Record<Category, PhotoSlot> = {
  "bottled-water": "sparkling",
  coolers: "purity",
  dispensers: "refill",
  accessories: "home",
};

function CategoryPortal({
  category,
  count,
  delay,
}: {
  category: CategoryMeta;
  count: number;
  delay: number;
}) {
  const { onPointerDown, ripples } = useRipple();

  return (
    <Reveal delay={delay}>
      <TiltCard max={6} className="rounded-[28px]">
        <TransitionLink
          to={`/shop?category=${category.id}`}
          onPointerDown={onPointerDown}
          className="group relative block aspect-square overflow-hidden rounded-[28px] shadow-depth-2 transition-shadow duration-300 hover:shadow-depth-3 sm:aspect-[4/5]"
        >
          <PhotoFrame
            photo={photos[portalPhoto[category.id]]}
            fill
            sizes="(min-width: 1024px) 20rem, (min-width: 640px) 50vw, 100vw"
            decorative
            imgClassName="parallax-back transition-[filter] duration-500 group-hover:saturate-125"
          />
          <span className="absolute inset-0 bg-linear-to-t from-abyss/95 via-abyss/55 via-45% to-abyss/0" />
          <span className="parallax-front absolute inset-x-0 bottom-0 p-6 text-white">
            <span className="label text-white/80">
              {count > 0 ? `${count} product${count === 1 ? "" : "s"}` : "Ask us"}
            </span>
            <span className="mt-2 block font-display text-2xl font-semibold tracking-tight">
              {category.label}
            </span>
            <span className="mt-1.5 line-clamp-2 block text-sm leading-relaxed text-white/85">
              {category.description}
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold">
              Browse
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" aria-hidden />
            </span>
          </span>
          {ripples}
        </TransitionLink>
      </TiltCard>
    </Reveal>
  );
}

export function Home() {
  const { products } = useCatalog();
  // Four fill a row at every breakpoint; a fifth would sit alone. What can be
  // ordered today leads, so a sold-out pick never displaces one in stock.
  const featured = products
    .filter((p) => p.featured)
    .sort((a, b) => Number(b.stock > 0) - Number(a.stock > 0))
    .slice(0, 4);

  return (
    <>
      <Seo
        title="Bottled Water, Dispensers & Chillers, and Water Filters"
        description="All Things Water — premium bottled water, dispensers, chillers, water filters and accessories, delivered to your door."
      />

      <WaterDive />

      {/* ── Categories ── */}
      <section aria-labelledby="categories-title" className="container-page py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="label text-brand-700 dark:text-brand-300">Shop by category</p>
            <h2 id="categories-title" className="section-title mt-3">
              Pick your <span className="accent">water.</span>
            </h2>
          </div>
          <TransitionLink
            to="/shop"
            className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300 sm:flex"
          >
            View all products <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </TransitionLink>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c, i) => (
            <CategoryPortal
              key={c.id}
              category={c}
              count={products.filter((p) => p.category === c.id).length}
              delay={i * 90}
            />
          ))}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section aria-labelledby="featured-title" className="container-page py-10">
        <div className="flex items-end justify-between gap-6">
          <div>
            <p className="label text-brand-700 dark:text-brand-300">Most popular</p>
            <h2 id="featured-title" className="section-title mt-3">
              Ready to <span className="accent">pour.</span>
            </h2>
          </div>
          <TransitionLink
            to="/shop"
            className="hidden items-center gap-1 text-sm font-semibold text-brand-700 hover:underline dark:text-brand-300 sm:flex"
          >
            View all <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </TransitionLink>
        </div>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-6 sm:hidden">
          <TransitionLink to="/shop" className="btn-outline w-full py-3 text-sm">
            View all products <ArrowRight className="h-4 w-4" aria-hidden />
          </TransitionLink>
        </div>
      </section>

      {/* ── Planner ── */}
      <section id="planner" className="container-page scroll-mt-20 py-20">
        <Reveal>
          <WaterPlanner />
        </Reveal>
      </section>
    </>
  );
}
