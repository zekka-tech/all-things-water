import { Droplets, Leaf, HeartHandshake, Award } from "lucide-react";
import { Seo } from "@/components/Seo";

const pillars = [
  { icon: Award, title: "Quality first", text: "We stock trusted brands and reliable equipment — water you can taste and gear that lasts." },
  { icon: HeartHandshake, title: "Service that shows up", text: "From a single case to a full office setup, we deliver and support every order." },
  { icon: Leaf, title: "Kinder to the planet", text: "Refillable bottles and recyclable packaging help cut down on single-use waste." },
];

export function About() {
  return (
    <>
      <Seo title="About us" description="Who we are and why we started All Things Water." />

      <section className="bg-gradient-to-b from-brand-50 to-white py-16 dark:from-ink-900 dark:to-ink-950">
        <div className="container-page max-w-3xl text-center">
          <span className="badge mx-auto bg-brand-100 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
            <Droplets className="h-3.5 w-3.5" /> Our story
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight">
            Everything water, made simple
          </h1>
          <p className="mt-4 text-lg text-ink-600 dark:text-ink-300">
            All Things Water began with a simple idea: getting great water — and the equipment to
            serve it — should be effortless for every home and office. Today we bring still and
            sparkling bottled water, coolers, dispensers and accessories together in one place.
          </p>
        </div>
      </section>

      <section className="container-page grid gap-6 py-14 md:grid-cols-3">
        {pillars.map((p) => (
          <div key={p.title} className="card p-6">
            <p.icon className="h-8 w-8 text-brand-600 dark:text-brand-400" />
            <h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
            <p className="mt-2 text-sm text-ink-500 dark:text-ink-400">{p.text}</p>
          </div>
        ))}
      </section>

      <section className="container-page pb-16">
        <div className="card grid gap-6 p-8 sm:grid-cols-3 sm:text-center">
          <div>
            <p className="text-3xl font-extrabold text-brand-600">8+</p>
            <p className="mt-1 text-sm text-ink-500">Products & growing</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-brand-600">2</p>
            <p className="mt-1 text-sm text-ink-500">Categories — water & equipment</p>
          </div>
          <div>
            <p className="text-3xl font-extrabold text-brand-600">🇿🇦</p>
            <p className="mt-1 text-sm text-ink-500">Proudly delivering in South Africa</p>
          </div>
        </div>
      </section>
    </>
  );
}
