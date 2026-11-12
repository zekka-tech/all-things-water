import { ArrowRight, Award, HeartHandshake, Leaf } from "lucide-react";
import { Seo } from "@/components/Seo";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Reveal } from "@/components/Reveal";
import { TransitionLink } from "@/components/TransitionLink";
import { WaterSurface } from "@/components/WaterSurface";
import { useCatalog } from "@/context/CatalogContext";
import { categories } from "@/data/categories";
import { photos } from "@/data/photos";
import { DEPOT_ADDRESS_PARTS } from "@/lib/contact";
import { DELIVERY_THRESHOLD, getDeliveryEstimate } from "@/lib/delivery";
import { formatZAR } from "@/lib/format";

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

export function About() {
  const { products } = useCatalog();

  // Every figure here comes from the catalogue or the delivery rules, so the
  // page can't drift from what the shop actually does.
  const [days] = getDeliveryEstimate(DEPOT_ADDRESS_PARTS.postalCode).split(" ");
  const facts = [
    { value: String(products.length), label: `products across ${categories.length} categories` },
    { value: days, label: "business days to Gauteng" },
    { value: "Free", label: `delivery on orders from ${formatZAR(DELIVERY_THRESHOLD)}` },
  ];

  return (
    <>
      <Seo title="About us" description="Who we are and why we started All Things Water." />

      {/* ── Hero: the Drakensberg, full bleed ── */}
      <section aria-labelledby="about-title" className="relative isolate overflow-hidden bg-abyss">
        <PhotoFrame
          photo={photos.about}
          fill
          sizes="100vw"
          priority
          parallax
          decorative
          className="-z-10"
        />
        <div className="absolute inset-0 -z-10 bg-linear-to-t from-abyss via-abyss/60 to-abyss/10" />
        <div className="container-page flex min-h-[min(72svh,40rem)] flex-col justify-end pb-24 pt-32">
          <p className="label blur-rise text-brand-200">Our story</p>
          <h1 id="about-title" className="display-1 blur-rise mt-5 max-w-3xl text-white! [animation-delay:60ms]">
            Everything water, <span className="accent text-brand-200!">made simple.</span>
          </h1>
          <p className="blur-rise mt-6 max-w-2xl text-lg leading-relaxed text-white/85 [animation-delay:180ms]">
            All Things Water began with a simple idea: getting great water — and the equipment to
            serve it — should be effortless for every home and office. Today we bring still and
            sparkling bottled water, dispensers, chillers, water filters and accessories together in
            one place.
          </p>
          <p className="blur-rise mt-8 text-xs text-white/70 [animation-delay:300ms]">
            The Drakensberg, where the Thukela and several of South Africa&rsquo;s rivers begin.
          </p>
        </div>
        <WaterSurface className="bottom-0 h-12 text-white dark:text-ink-950" />
      </section>

      {/* ── Pillars ── */}
      <section aria-labelledby="pillars-title" className="container-page py-20">
        <p className="label text-brand-700 dark:text-brand-300">What we stand for</p>
        <h2 id="pillars-title" className="section-title mt-3">
          Three things we <span className="accent">don&rsquo;t compromise on.</span>
        </h2>
        <ol className="mt-10 grid gap-5 md:grid-cols-3">
          {pillars.map((p, i) => (
            <li key={p.title}>
              <Reveal delay={i * 90} className="h-full">
                <article className="relative h-full overflow-hidden rounded-[28px] border border-ink-200/70 bg-linear-to-b from-brand-50 to-white p-7 dark:border-white/10 dark:from-ink-900 dark:to-ink-950">
                  <div aria-hidden className="caustic-bg absolute inset-0 opacity-60" />
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-brand-700 shadow-depth-1 dark:bg-ink-800 dark:text-brand-300">
                        <p.icon className="h-6 w-6" aria-hidden />
                      </span>
                      <span className="label text-ink-500 dark:text-ink-400">0{i + 1}</span>
                    </div>
                    <h3 className="mt-6 font-display text-xl font-semibold tracking-tight text-ink-900 dark:text-white">
                      {p.title}
                    </h3>
                    <p className="mt-2 leading-relaxed text-ink-600 dark:text-ink-300">{p.text}</p>
                  </div>
                </article>
              </Reveal>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Facts ── */}
      <section aria-label="At a glance" className="container-page pb-20">
        <div className="relative overflow-hidden rounded-[32px] bg-abyss text-white">
          <div aria-hidden className="caustic-bg absolute inset-0 opacity-25" />
          <div className="relative grid gap-10 px-8 py-12 sm:px-12 lg:grid-cols-[1.2fr_2fr] lg:items-center">
            <div>
              <p className="label text-brand-200">From our depot</p>
              <p className="mt-3 font-display text-2xl font-semibold tracking-tight">
                Delivered from {DEPOT_ADDRESS_PARTS.addressLocality},{" "}
                <span className="accent text-brand-200!">{DEPOT_ADDRESS_PARTS.addressRegion}.</span>
              </p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/75">
                Or collect from {DEPOT_ADDRESS_PARTS.streetAddress} — choose it at checkout.
              </p>
            </div>
            <dl className="grid gap-8 sm:grid-cols-3">
              {facts.map((f) => (
                <div key={f.label} className="border-t border-white/15 pt-4">
                  <dt className="sr-only">{f.label}</dt>
                  <dd>
                    <span className="block font-display text-3xl font-semibold tracking-tight">{f.value}</span>
                    <span className="mt-1 block text-sm text-white/75">{f.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <TransitionLink to="/shop" className="btn-primary px-6 py-3 text-base">
            Shop water <ArrowRight className="h-4 w-4" aria-hidden />
          </TransitionLink>
          <TransitionLink to="/water" className="btn-outline px-6 py-3 text-base">
            Read the water guide
          </TransitionLink>
        </div>
      </section>
    </>
  );
}
