import { useEffect, useState } from "react";
import { ArrowRight, Calculator, ChevronDown } from "lucide-react";
import { Seo } from "@/components/Seo";
import { JsonLdFaq } from "@/components/JsonLd";
import { MiniProduct } from "@/components/MiniProduct";
import { PhotoFrame } from "@/components/PhotoFrame";
import { Reveal } from "@/components/Reveal";
import { TransitionLink } from "@/components/TransitionLink";
import { WaterPlanner } from "@/components/WaterPlanner";
import { WaterSurface } from "@/components/WaterSurface";
import { useCatalog } from "@/context/CatalogContext";
import { photos } from "@/data/photos";
import { waterSubjects, type SubjectId } from "@/data/waterSubjects";
import { DELIVERY_FEE, DELIVERY_THRESHOLD } from "@/lib/delivery";
import { cx, formatZAR } from "@/lib/format";
import type { Product } from "@/types";

const faqs = [
  {
    q: "How much water does a home or office need?",
    a: "It depends on the people and their habits, so the planner on this page lets you set both. A common rule of thumb is about 2 litres per person a day at home, and about 1 litre per person per workday at the office.",
  },
  {
    q: "What's the difference between spring and mineral water?",
    a: "Both come from underground. Spring water is collected from a source where it rises naturally; mineral water is groundwater with a naturally stable mix of dissolved minerals, which shapes its taste. Labels name the source, and most list the minerals.",
  },
  {
    q: "Where do you deliver?",
    a: `We deliver from our Centurion depot. Gauteng orders arrive in 2–4 business days and nearby areas in 3–7. Delivery is free on orders from ${formatZAR(DELIVERY_THRESHOLD)} — otherwise it's ${formatZAR(DELIVERY_FEE)} — or you can collect from the depot.`,
  },
  {
    q: "Can I get a regular delivery?",
    a: "Yes. Choose a product and how often — every week, every 2 weeks or every month — and we'll repeat the order. You'll need an account to set it up.",
  },
  {
    q: "Will the 18.9 L bottles fit my cooler?",
    a: "They're made for standard top-loading coolers and dispensers, including the ones we sell.",
  },
];

/** Which chapter is under the sticky index, for its active pill. */
function useActiveChapter(ids: SubjectId[]) {
  const [active, setActive] = useState<SubjectId | null>(null);
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id as SubjectId);
        }
      },
      { rootMargin: "-30% 0px -60% 0px" },
    );
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const subjectIds = waterSubjects.map((s) => s.id);

export function WaterGuide() {
  const { products } = useCatalog();
  const active = useActiveChapter(subjectIds);
  const find = (ids: string[]) =>
    ids.map((id) => products.find((p) => p.id === id)).filter((p): p is Product => Boolean(p));

  return (
    <>
      <Seo
        title="The water guide"
        description="Where water comes from, how filtration works, why sparkling water fizzes, hot-and-cold coolers and refillable bottles — plus a planner that works out how much you need."
      />
      <JsonLdFaq items={faqs} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-linear-to-b from-brand-50 to-white dark:from-ink-900 dark:to-ink-950">
        <div aria-hidden className="caustic-bg absolute inset-0" />
        <div className="container-page relative grid items-center gap-10 py-16 lg:grid-cols-[1.1fr_1fr] lg:py-24">
          <div>
            <p className="label blur-rise text-brand-700 dark:text-brand-300">The water guide</p>
            <h1 className="display-1 blur-rise mt-5 [animation-delay:60ms]">
              Everything worth knowing <span className="accent">about water.</span>
            </h1>
            <p className="blur-rise mt-6 max-w-lg text-lg leading-relaxed text-ink-600 [animation-delay:180ms] dark:text-ink-300">
              Five short chapters — from the rock it rises through to the bottle on your cooler — and a
              planner that works out how much you need.
            </p>
            <a
              href="#planner"
              className="btn-primary blur-rise mt-8 px-6 py-3 text-base [animation-delay:300ms]"
            >
              Jump to the planner <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
          <PhotoFrame
            photo={photos.home}
            aspect="aspect-[4/3] lg:aspect-[4/5]"
            sizes="(min-width: 1024px) 34rem, 100vw"
            priority
            parallax
            className="blur-rise rounded-[32px] shadow-depth-3 [animation-delay:200ms] lg:max-h-[34rem]"
          />
        </div>
        <WaterSurface className="bottom-0 h-14 text-white dark:text-ink-950" />
      </section>

      {/* ── Chapter index ── */}
      <nav
        aria-label="Chapters"
        className="sticky top-16 z-30 border-y border-ink-200/70 bg-white/85 backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/85"
      >
        <ol className="container-page flex gap-2 overflow-x-auto py-3 [scrollbar-width:none]">
          {waterSubjects.map((s) => (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={active === s.id ? "location" : undefined}
                className={cx("chip flex items-center gap-2", active === s.id ? "chip-active" : "chip-idle")}
              >
                <span className="text-[11px] font-semibold tabular-nums">{s.index}</span>
                {s.eyebrow}
              </a>
            </li>
          ))}
          <li className="shrink-0">
            <a href="#planner" className="chip chip-idle flex items-center gap-2">
              <Calculator className="h-3.5 w-3.5 opacity-70" aria-hidden />
              Planner
            </a>
          </li>
        </ol>
      </nav>

      {/* ── Chapters ── */}
      <div className="container-page space-y-24 py-20 lg:space-y-32 lg:py-28">
        {waterSubjects.map((subject, i) => {
          const Icon = subject.icon;
          const shown = find(subject.productIds);
          return (
            <section
              key={subject.id}
              id={subject.id}
              aria-labelledby={`${subject.id}-title`}
              className="grid scroll-mt-36 items-center gap-10 lg:grid-cols-2 lg:gap-16"
            >
              <Reveal className={cx(i % 2 === 1 && "lg:order-2")}>
                <div className={cx("grid gap-3", subject.photos.length > 1 && "grid-cols-2")}>
                  {subject.photos.map((slot) => (
                    <PhotoFrame
                      key={slot}
                      photo={photos[slot]}
                      aspect={subject.photos.length > 1 ? "aspect-[3/4]" : "aspect-[4/3]"}
                      sizes="(min-width: 1024px) 36rem, 100vw"
                      parallax
                      className="rounded-[28px] shadow-depth-2"
                    />
                  ))}
                </div>
              </Reveal>
              <Reveal delay={120}>
                <p className="label flex items-center gap-2 text-brand-700 dark:text-brand-300">
                  <Icon className="h-4 w-4" aria-hidden />
                  {subject.index} — {subject.eyebrow}
                </p>
                <h2 id={`${subject.id}-title`} className="display-2 mt-4 text-balance">
                  {subject.title} <span className="accent">{subject.accent}</span>
                </h2>
                <div className="mt-6 space-y-4 leading-relaxed text-ink-600 dark:text-ink-300">
                  {subject.body.map((paragraph) => (
                    <p key={paragraph.slice(0, 24)}>{paragraph}</p>
                  ))}
                </div>
                {shown.length > 0 && (
                  <ul className="mt-8 grid gap-2 sm:grid-cols-2">
                    {shown.map((p) => (
                      <MiniProduct key={p.id} product={p} />
                    ))}
                  </ul>
                )}
                {subject.link.to === "/water#planner" ? (
                  <a href="#planner" className="btn-outline mt-8 px-5 py-2.5">
                    {subject.link.label} <ArrowRight className="h-4 w-4" aria-hidden />
                  </a>
                ) : (
                  <TransitionLink to={subject.link.to} className="btn-outline mt-8 px-5 py-2.5">
                    {subject.link.label} <ArrowRight className="h-4 w-4" aria-hidden />
                  </TransitionLink>
                )}
              </Reveal>
            </section>
          );
        })}
      </div>

      {/* ── FAQ ── */}
      <section aria-labelledby="faq-title" className="bg-ink-50 py-20 dark:bg-ink-900/40">
        <div className="container-page max-w-3xl">
          <p className="label text-brand-700 dark:text-brand-300">Questions</p>
          <h2 id="faq-title" className="section-title mt-3">
            Good to <span className="accent">know.</span>
          </h2>
          <div className="mt-8 divide-y divide-ink-200 rounded-[24px] border border-ink-200/70 bg-white dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900 dark:text-white [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <ChevronDown
                    className="h-5 w-5 shrink-0 text-ink-400 transition-transform duration-200 group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Planner ── */}
      <section id="planner" className="container-page scroll-mt-36 py-20">
        <WaterPlanner />
      </section>

      <p className="container-page pb-12 text-xs leading-relaxed text-ink-500 dark:text-ink-400">
        Photography via Pexels:{" "}
        {Object.values(photos).map((photo, i, all) => (
          <span key={photo.credit.url}>
            <a href={photo.credit.url} className="underline-offset-2 hover:underline" rel="noopener noreferrer" target="_blank">
              {photo.credit.name}
            </a>
            {i < all.length - 1 ? ", " : "."}
          </span>
        ))}
      </p>
    </>
  );
}
