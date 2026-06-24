import { Link } from "react-router-dom";
import {
  ArrowRight,
  Droplets,
  Snowflake,
  Truck,
  Recycle,
  ShieldCheck,
  Waves,
  Package,
  Wind,
  Wrench,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { featuredProducts } from "@/data/products";
import { categories } from "@/data/categories";

const valueProps = [
  {
    icon: Truck,
    title: "Fast delivery",
    text: "Reliable delivery to your door across South Africa.",
  },
  {
    icon: ShieldCheck,
    title: "Quality assured",
    text: "Trusted brands and equipment you can rely on, every time.",
  },
  {
    icon: Snowflake,
    title: "Hot & cold",
    text: "Dispensers and water filters for every kitchen and office.",
  },
  {
    icon: Recycle,
    title: "Refill & reuse",
    text: "Refillable bottles that help cut down on single-use waste.",
  },
];

const categoryIcons: Record<string, React.ElementType> = {
  "bottled-water": Waves,
  coolers: Wind,
  dispensers: Package,
  accessories: Wrench,
};

export function Home() {
  const featured = featuredProducts();

  return (
    <>
      <Seo
        title="Bottled Water, Dispensers & Water Filters"
        description="All Things Water — premium bottled water, dispensers, water filters and accessories delivered across South Africa."
      />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 via-white to-white dark:from-ink-900 dark:via-ink-950 dark:to-ink-950">
        {/* Decorative blobs */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 h-[700px] w-[700px] -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/15"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-brand-200/25 blur-3xl dark:bg-brand-800/20"
        />

        <div className="container-page relative grid items-center gap-12 py-16 lg:grid-cols-2 lg:py-24">
          {/* Left — copy */}
          <div className="animate-fade-in">
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
              <Droplets className="h-3.5 w-3.5" /> Everything water, in one place
            </span>

            <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.1] tracking-tight text-ink-900 sm:text-5xl dark:text-white">
              All Things{" "}
              <span className="gradient-text">Water</span>,
              <br className="hidden sm:block" /> delivered to your door.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-ink-600 dark:text-ink-300">
              Premium still and sparkling bottled water, refillable dispensers, water filters
              and accessories — for home and office.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-6 py-3 text-base">
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-outline px-6 py-3 text-base">
                Our story
              </Link>
            </div>

            {/* Social proof strip */}
            <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-ink-500 dark:text-ink-400">
              <span className="flex items-center gap-1.5">
                <span className="flex">
                  {["★","★","★","★","★"].map((s, i) => (
                    <span key={i} className="text-amber-400">{s}</span>
                  ))}
                </span>
                Trusted by SA homes &amp; offices
              </span>
              <span className="hidden sm:block text-ink-300 dark:text-ink-700">|</span>
              <span>🇿🇦 Proudly South African</span>
            </div>
          </div>

          {/* Right — product tiles */}
          <div className="animate-fade-in-delay relative">
            <div
              aria-hidden
              className="absolute inset-0 -z-10 mx-auto h-64 w-64 rounded-full bg-brand-400/25 blur-3xl animate-ripple"
            />
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((p, i) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  style={{ animationDelay: `${i * 80}ms` }}
                  className="glass card-hover group flex flex-col items-center gap-3 rounded-2xl p-5 shadow-sm"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    className="h-28 w-full object-contain transition-transform duration-500 group-hover:scale-105"
                  />
                  <p className="text-center text-xs font-semibold leading-tight text-ink-700 dark:text-ink-200">
                    {p.name}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Value propositions ── */}
      <section className="container-page py-14">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {valueProps.map((v, i) => (
            <div
              key={v.title}
              style={{ animationDelay: `${i * 60}ms` }}
              className="card p-5 animate-fade-in"
            >
              <div className="icon-wrap">
                <v.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 font-display font-semibold text-ink-900 dark:text-white">
                {v.title}
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                {v.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Categories ── */}
      <section className="container-page py-4">
        <div className="flex items-end justify-between">
          <h2 className="section-title">Shop by category</h2>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => {
            const Icon = categoryIcons[c.id] ?? Wind;
            return (
              <Link
                key={c.id}
                to={`/shop?category=${c.id}`}
                className="card card-hover group flex flex-col p-6"
              >
                <div className="icon-wrap-lg transition-transform duration-300 group-hover:scale-110">
                  <Icon className="h-6 w-6" />
                </div>
                <span className="mt-4 font-display font-semibold text-ink-900 dark:text-white">
                  {c.label}
                </span>
                <span className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                  {c.description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600 dark:text-brand-400">
                  Browse <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ── Featured products ── */}
      <section className="container-page py-14">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="section-title">Featured products</h2>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
              Our most popular picks, ready to ship.
            </p>
          </div>
          <Link
            to="/shop"
            className="hidden items-center gap-1 text-sm font-semibold text-brand-600 hover:underline dark:text-brand-400 sm:flex"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
        <div className="mt-6 sm:hidden">
          <Link to="/shop" className="btn-outline w-full py-3 text-sm">
            View all products <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* ── CTA banner ── */}
      <section className="container-page py-12">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-800 px-8 py-14 text-center text-white sm:px-16">
          {/* Decorative */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-brand-500/30 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-brand-400/20 blur-3xl"
          />

          <span className="badge bg-white/20 text-white backdrop-blur-sm">
            <Droplets className="h-3.5 w-3.5" /> Home &amp; office
          </span>
          <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight sm:text-4xl">
            Set up your water station today
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-100">
            From a single case of water to a complete cooler &amp; dispenser setup — we have everything you need.
          </p>
          <Link
            to="/shop"
            className="btn mt-8 inline-flex bg-white px-6 py-3 text-base font-semibold text-brand-700 shadow-lg hover:bg-brand-50 hover:shadow-glow-brand"
          >
            Start shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
