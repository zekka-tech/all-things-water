import { Link } from "react-router-dom";
import {
  ArrowRight,
  Droplets,
  Snowflake,
  Truck,
  Recycle,
  ShieldCheck,
} from "lucide-react";
import { Seo } from "@/components/Seo";
import { ProductCard } from "@/components/ProductCard";
import { featuredProducts } from "@/data/products";
import { categories } from "@/data/categories";

const valueProps = [
  { icon: Truck, title: "Fast delivery", text: "Reliable delivery across South Africa." },
  { icon: ShieldCheck, title: "Quality assured", text: "Trusted brands and equipment you can rely on." },
  { icon: Snowflake, title: "Hot & cold", text: "Coolers and dispensers for every space." },
  { icon: Recycle, title: "Refill & reuse", text: "Refillable bottles that cut down on waste." },
];

export function Home() {
  const featured = featuredProducts();

  return (
    <>
      <Seo
        title="Bottled Water, Coolers & Dispensers"
        description="All Things Water — premium bottled water, coolers, dispensers and accessories delivered across South Africa."
      />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div className="container-page grid items-center gap-10 py-16 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-in">
            <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
              <Droplets className="h-3.5 w-3.5" /> Everything water, in one place
            </span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
              All Things <span className="text-brand-600 dark:text-brand-400">Water</span>,
              delivered to your door.
            </h1>
            <p className="mt-4 max-w-lg text-lg text-ink-600 dark:text-ink-300">
              Premium still and sparkling bottled water, hot &amp; cold coolers,
              refillable dispensers and accessories — for home and office.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/shop" className="btn-primary px-5 py-3 text-base">
                Shop now <ArrowRight className="h-4 w-4" />
              </Link>
              <Link to="/about" className="btn-outline px-5 py-3 text-base">
                Learn more
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 -z-10 mx-auto h-72 w-72 rounded-full bg-brand-300/40 blur-3xl animate-ripple" />
            <div className="grid grid-cols-2 gap-4">
              {featured.slice(0, 4).map((p) => (
                <Link
                  key={p.id}
                  to={`/product/${p.slug}`}
                  className="card grid place-items-center p-5 hover:-translate-y-1"
                >
                  <img src={p.image} alt={p.name} className="h-28 w-full object-contain" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container-page grid grid-cols-2 gap-4 py-12 lg:grid-cols-4">
        {valueProps.map((v) => (
          <div key={v.title} className="card p-5">
            <v.icon className="h-7 w-7 text-brand-600 dark:text-brand-400" />
            <h3 className="mt-3 font-semibold">{v.title}</h3>
            <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{v.text}</p>
          </div>
        ))}
      </section>

      {/* Categories */}
      <section className="container-page py-8">
        <h2 className="text-2xl font-bold tracking-tight">Shop by category</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <Link
              key={c.id}
              to={`/shop?category=${c.id}`}
              className="card flex flex-col p-6 hover:-translate-y-1 hover:border-brand-300"
            >
              <span className="text-lg font-semibold">{c.label}</span>
              <span className="mt-2 flex-1 text-sm text-ink-500 dark:text-ink-400">
                {c.description}
              </span>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-brand-600">
                Browse <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured products */}
      <section className="container-page py-12">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Featured products</h2>
          <Link to="/shop" className="text-sm font-semibold text-brand-600 hover:underline">
            View all
          </Link>
        </div>
        <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {featured.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-12">
        <div className="overflow-hidden rounded-3xl bg-brand-600 px-8 py-12 text-center text-white sm:px-16">
          <h2 className="text-3xl font-extrabold">Set up your office or home today</h2>
          <p className="mx-auto mt-3 max-w-xl text-brand-50">
            From a single case of water to a complete cooler setup — we have you covered.
          </p>
          <Link
            to="/shop"
            className="btn mt-6 bg-white px-6 py-3 text-base text-brand-700 hover:bg-brand-50"
          >
            Start shopping <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
