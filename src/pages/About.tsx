import { Droplets, Leaf, HeartHandshake, Award, Users, Package, MapPin } from "lucide-react";
import { Seo } from "@/components/Seo";

const pillars = [
  {
    icon: Award,
    title: "Quality first",
    text: "We stock trusted brands and reliable equipment — water you can taste and gear that lasts.",
  },
  {
    icon: HeartHandshake,
    title: "Service that shows up",
    text: "From a single case to a full office setup, we deliver and support every order personally.",
  },
  {
    icon: Leaf,
    title: "Kinder to the planet",
    text: "Refillable bottles and recyclable packaging help cut down on single-use waste.",
  },
];

const stats = [
  { icon: Package, value: "8+", label: "Products & growing" },
  { icon: Users, value: "4", label: "Categories covered" },
  { icon: MapPin, value: "🇿🇦", label: "Delivered across SA" },
];

export function About() {
  return (
    <>
      <Seo title="About us" description="Who we are and why we started All Things Water." />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-brand-300/20 blur-3xl dark:bg-brand-700/15"
        />
        <div className="container-page relative max-w-2xl py-16 text-center lg:py-20">
          <span className="badge mx-auto bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
            <Droplets className="h-3.5 w-3.5" /> Our story
          </span>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight tracking-tight text-ink-900 dark:text-white">
            Everything water,{" "}
            <span className="gradient-text">made simple</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-ink-600 dark:text-ink-300">
            All Things Water began with a simple idea: getting great water — and the equipment to
            serve it — should be effortless for every home and office. Today we bring still and
            sparkling bottled water, coolers, dispensers and accessories together in one place.
          </p>
        </div>
      </section>

      {/* Pillars */}
      <section className="container-page py-14">
        <h2 className="section-title text-center">What we stand for</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {pillars.map((p) => (
            <div key={p.title} className="card p-6">
              <div className="icon-wrap-lg">
                <p.icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 font-display text-lg font-semibold text-ink-900 dark:text-white">
                {p.title}
              </h3>
              <p className="mt-2 leading-relaxed text-sm text-ink-500 dark:text-ink-400">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="container-page pb-16">
        <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 to-brand-800 text-white">
          <div className="grid divide-y divide-white/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-2 px-6 py-10 text-center">
                <span className="font-display text-4xl font-extrabold">{s.value}</span>
                <span className="text-sm font-medium text-brand-100">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
