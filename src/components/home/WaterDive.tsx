import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Clock, Recycle, Truck } from "lucide-react";
import { useCatalog } from "@/context/CatalogContext";
import { photos } from "@/data/photos";
import { waterSubjects, type WaterSubject } from "@/data/waterSubjects";
import { DELIVERY_THRESHOLD } from "@/lib/delivery";
import { cx, formatZAR } from "@/lib/format";
import { useScrollProgress } from "@/lib/useScrollProgress";
import { depthFor } from "@/lib/water/depth";
import type { Product } from "@/types";
import { MiniProduct } from "../MiniProduct";
import { PhotoFrame } from "../PhotoFrame";
import { Reveal } from "../Reveal";
import { TransitionLink } from "../TransitionLink";
import { WaterCanvas, type WaterCanvasHandle } from "../WaterCanvas";

/** Same-page targets stay plain anchors; cross-page ones get the transition. */
function SubjectLink({ to, children }: { to: string; children: React.ReactNode }) {
  const className =
    "inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 transition-[gap] hover:gap-2.5 dark:text-brand-300";
  const local = to === "/water#planner" ? "#planner" : null;
  return local ? (
    <a href={local} className={className}>
      {children}
    </a>
  ) : (
    <TransitionLink to={to} className={className}>
      {children}
    </TransitionLink>
  );
}

function Chapter({
  subject,
  index,
  products,
  onActive,
}: {
  subject: WaterSubject;
  index: number;
  products: Product[];
  onActive: (index: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    // A thin band across the middle of the viewport: whichever chapter is
    // crossing it is the one the depth gauge highlights.
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && onActive(index),
      { rootMargin: "-48% 0px -48% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [index, onActive]);

  const Icon = subject.icon;
  const shown = subject.productIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  return (
    <li ref={ref} className={cx("flex", index % 2 ? "lg:justify-end" : "lg:justify-start")}>
      <Reveal className="w-full max-w-xl">
        <article
          aria-labelledby={`dive-${subject.id}`}
          className="glass-card overflow-hidden rounded-[28px]"
        >
          <div className={cx("relative grid", subject.photos.length > 1 && "grid-cols-2")}>
            {subject.photos.map((slot) => (
              <PhotoFrame
                key={slot}
                photo={photos[slot]}
                aspect={subject.photos.length > 1 ? "aspect-[4/5] sm:aspect-[4/3]" : "aspect-[16/9]"}
                sizes="(min-width: 640px) 36rem, 100vw"
                parallax
              />
            ))}
            <span className="label absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-ink-800 shadow-depth-1 backdrop-blur-sm">
              {subject.index} / 0{waterSubjects.length}
            </span>
          </div>
          <div className="p-6 sm:p-8">
            <p className="label flex items-center gap-2 text-brand-700 dark:text-brand-300">
              <Icon className="h-4 w-4" aria-hidden /> {subject.eyebrow}
            </p>
            <h3
              id={`dive-${subject.id}`}
              className="mt-3 text-balance font-display text-[clamp(1.75rem,3vw,2.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-ink-900 dark:text-white"
            >
              {subject.title} <span className="accent">{subject.accent}</span>
            </h3>
            <p className="mt-4 leading-relaxed text-ink-600 dark:text-ink-300">{subject.summary}</p>
            {shown.length > 0 && (
              <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                {shown.map((p) => (
                  <MiniProduct key={p.id} product={p} />
                ))}
              </ul>
            )}
            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2">
              <SubjectLink to={subject.link.to}>
                {subject.link.label} <ArrowRight className="h-4 w-4" aria-hidden />
              </SubjectLink>
              <TransitionLink
                to={`/water#${subject.id}`}
                className="text-sm font-medium text-ink-600 underline-offset-4 hover:underline dark:text-ink-300"
              >
                Read more in the guide
              </TransitionLink>
            </div>
          </div>
        </article>
      </Reveal>
    </li>
  );
}

/**
 * The Home hero and the "dive": one sticky GPU water scene that the visitor
 * looks into, then descends through as five subjects of water rise past.
 */
export function WaterDive() {
  const { products } = useCatalog();
  const water = useRef<WaterCanvasHandle>(null);
  const [active, setActive] = useState(-1);
  const [deep, setDeep] = useState(false);
  const ref = useScrollProgress<HTMLDivElement>((progress) => {
    water.current?.setProgress(progress);
    // The gauge is light-on-dark, so it shows only while the water is deep.
    setDeep(depthFor(progress) > 0.4);
    // Above the first chapter and past the last, there's nothing to point at.
    if (progress < 0.1 || progress > 0.97) setActive(-1);
  });

  return (
    <div ref={ref} data-water-surface className="relative [overflow-x:clip]">
      {/* The scene sticks for the whole dive. An absolute track keeps it out
          of the flow without a negative margin, which would also stretch the
          sticky range past the end of the dive and over the next section. */}
      <div className="pointer-events-none absolute inset-0">
        <div className="sticky top-0 h-[100svh]">
          <WaterCanvas ref={water} className="absolute inset-0" />
          <div className="grain" />
          {/* Depth gauge: a slim rail that fits the page margin beside the
              right-hand cards. Over deep water by the time it shows, so it's
              light-on-dark in both themes. */}
          <ol
            aria-hidden
            className={cx(
              "absolute right-5 top-1/2 hidden -translate-y-1/2 flex-col gap-4 transition-opacity duration-500 min-[1400px]:flex",
              active >= 0 && deep ? "opacity-100" : "opacity-0",
            )}
          >
            {waterSubjects.map((s, i) => (
              <li key={s.id} className="flex items-center justify-end gap-2.5">
                <span
                  className={cx(
                    "text-[11px] font-semibold tabular-nums transition-colors duration-300",
                    i === active ? "text-white" : "text-white/45",
                  )}
                >
                  {s.index}
                </span>
                <span
                  className={cx(
                    "h-0.5 w-6 origin-right rounded-full bg-brand-300 transition-transform duration-300",
                    i === active ? "scale-x-100" : "scale-x-50 opacity-50",
                  )}
                />
              </li>
            ))}
          </ol>
        </div>
        {/* The water surfaces again at the end and fades into the page. */}
        <div className="absolute inset-x-0 bottom-0 h-[40svh] bg-linear-to-b from-transparent to-white dark:to-ink-950" />
      </div>

      {/* ── Hero ── */}
      <section aria-labelledby="hero-title" className="relative z-10">
        <div className="container-page flex min-h-[calc(100svh-4rem)] flex-col justify-center pb-24 pt-14 lg:pb-28">
          <div className="max-w-2xl">
            <p className="label blur-rise flex items-center gap-2.5 text-brand-800 dark:text-brand-200">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Bottled water · Dispensers · Filters
            </p>
            <h1 id="hero-title" className="display-1 blur-rise mt-6 [animation-delay:60ms]">
              Every drop, <br className="hidden sm:block" />
              <span className="accent">from source to glass.</span>
            </h1>
            <p className="blur-rise mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-700 [animation-delay:180ms] dark:text-ink-200">
              Still and sparkling water, hot-and-cold dispensers and refillable bottles for home and
              office — delivered to your door, free from {formatZAR(DELIVERY_THRESHOLD)}.
            </p>
            <div className="blur-rise mt-9 flex flex-wrap gap-3 [animation-delay:300ms]">
              <TransitionLink to="/shop" className="btn-primary px-6 py-3 text-base">
                Shop water <ArrowRight className="h-4 w-4" aria-hidden />
              </TransitionLink>
              <a
                href="#planner"
                className="btn glass-strong px-6 py-3 text-base text-ink-800 hover:text-brand-700 dark:text-ink-100 dark:hover:text-brand-300"
              >
                Plan my water
              </a>
            </div>
          </div>

          <ul className="blur-rise mt-14 flex flex-wrap gap-x-8 gap-y-3 text-sm font-medium text-ink-700 [animation-delay:420ms] dark:text-ink-200">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
              Free delivery from {formatZAR(DELIVERY_THRESHOLD)}
            </li>
            <li className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
              Gauteng delivery in 2–4 business days
            </li>
            <li className="flex items-center gap-2">
              <Recycle className="h-4 w-4 text-brand-600 dark:text-brand-400" aria-hidden />
              Refillable 18.9 L bottles
            </li>
          </ul>
        </div>

        <a
          href="#dive"
          className="label absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-ink-600 hover:text-brand-700 dark:text-ink-300 dark:hover:text-brand-300"
        >
          Dive in
          <ArrowDown className="animate-bob h-4 w-4" aria-hidden />
        </a>
      </section>

      {/* ── The dive ── */}
      <section id="dive" aria-labelledby="dive-title" className="relative z-10 scroll-mt-16 pb-[30svh]">
        <div className="container-page">
          <Reveal className="mx-auto max-w-2xl py-[18svh]">
            <div className="glass-card rounded-[28px] px-6 py-10 text-center sm:px-12">
              <p className="label text-brand-700 dark:text-brand-300">The world of water</p>
              <h2 id="dive-title" className="display-2 mt-4 text-balance">
                Five things worth knowing <span className="accent">about water.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md leading-relaxed text-ink-600 dark:text-ink-300">
                Where it comes from, what keeps it clean, why it fizzes — and how to keep it coming.
                Scroll down through the water.
              </p>
            </div>
          </Reveal>

          <ol className="space-y-[22svh]">
            {waterSubjects.map((subject, i) => (
              <Chapter
                key={subject.id}
                subject={subject}
                index={i}
                products={products}
                onActive={setActive}
              />
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
