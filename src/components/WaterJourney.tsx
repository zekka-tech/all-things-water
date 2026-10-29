import { cx } from "@/lib/format";
import { useReveal } from "@/lib/useReveal";
import { Reveal } from "./Reveal";

const DROPLET = "M48 18c7 11 12 16 12 23a12 12 0 0 1-24 0c0-7 5-12 12-23Z";

function Disc() {
  return (
    <circle cx="48" cy="48" r="47" className="fill-brand-50 dark:fill-brand-500/10" />
  );
}

function SourceArt() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className="h-full w-full">
      <Disc />
      <path
        d="M8 72 L30 40 L44 60 L56 44 L88 72 Z"
        className="fill-brand-200 dark:fill-brand-800"
      />
      <path d="M30 40 L39 53 H21 Z" className="fill-white dark:fill-brand-300/50" />
      <path d={DROPLET} className="fill-brand-500" />
      <circle cx="43" cy="37" r="3" className="fill-white/70" />
      <path
        d="M20 78 Q34 72 48 78 T76 78"
        className="stroke-brand-400 dark:stroke-brand-500"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function FilterArt() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className="h-full w-full">
      <Disc />
      <path
        d="M24 24 H72 L54 50 V70 H42 V50 Z"
        className="fill-brand-200 dark:fill-brand-800"
      />
      <g className="stroke-white dark:stroke-brand-300/60" strokeWidth="2.5" fill="none">
        <path d="M30 32 H66" />
        <path d="M36 40 H60" />
        <path d="M42 48 H54" />
      </g>
      <path
        d="M48 72c3 5 5 7 5 10a5 5 0 0 1-10 0c0-3 2-5 5-10Z"
        className="fill-brand-500"
      />
    </svg>
  );
}

function ChilledArt() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className="h-full w-full">
      <Disc />
      <rect
        x="38"
        y="16"
        width="20"
        height="10"
        rx="3"
        className="fill-brand-300 dark:fill-brand-700"
      />
      <path
        d="M36 28h24a6 6 0 0 1 6 6v38a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8V34a6 6 0 0 1 6-6Z"
        className="fill-brand-200 dark:fill-brand-800"
      />
      <path
        d="M30 54h36v18a8 8 0 0 1-8 8H38a8 8 0 0 1-8-8V54Z"
        className="fill-brand-500"
      />
      <g
        className="stroke-white dark:stroke-brand-200"
        strokeWidth="2.5"
        strokeLinecap="round"
      >
        <path d="M48 36v12" />
        <path d="M42 39l12 6" />
        <path d="M54 39l-12 6" />
      </g>
    </svg>
  );
}

function DeliveredArt() {
  return (
    <svg viewBox="0 0 96 96" aria-hidden className="h-full w-full">
      <Disc />
      <path
        d="M14 40h38v26H14Z"
        className="fill-brand-500"
      />
      <path
        d="M52 48h14l12 12v6H52Z"
        className="fill-brand-200 dark:fill-brand-800"
      />
      <g className="fill-ink-700 dark:fill-ink-900">
        <circle cx="28" cy="70" r="7" />
        <circle cx="66" cy="70" r="7" />
      </g>
      <g className="fill-white">
        <circle cx="28" cy="70" r="2.5" />
        <circle cx="66" cy="70" r="2.5" />
      </g>
      <path
        d="M33 46c2.5 4 4 5.5 4 7.5a4 4 0 0 1-8 0c0-2 1.5-3.5 4-7.5Z"
        className="fill-white"
      />
    </svg>
  );
}

const STAGES = [
  {
    art: SourceArt,
    step: "01",
    title: "From the source",
    text: "Spring and purified still water from trusted South African bottlers.",
  },
  {
    art: FilterArt,
    step: "02",
    title: "Filtered clean",
    text: "Multi-stage filtration and replaceable cartridges that keep it that way.",
  },
  {
    art: ChilledArt,
    step: "03",
    title: "Chilled & ready",
    text: "Dispensers and chillers that pour ice-cold or steaming hot on demand.",
  },
  {
    art: DeliveredArt,
    step: "04",
    title: "At your door",
    text: "Delivered across SA — and set to repeat, so you never run dry.",
  },
] as const;

function JourneyStage({
  stage,
  delay,
}: {
  stage: (typeof STAGES)[number];
  delay: number;
}) {
  // The hook rather than <Reveal> because an <ol> may only contain <li>.
  const { ref, visible } = useReveal<HTMLLIElement>();

  return (
    <li
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={cx("reveal text-center", visible && "reveal-visible")}
    >
      <div className="mx-auto h-24 w-24 drop-shadow-xs">
        <stage.art />
      </div>
      <p className="mt-5 text-xs font-bold tracking-widest text-brand-600 dark:text-brand-400">
        {stage.step}
      </p>
      <h3 className="mt-1.5 font-display text-lg font-semibold text-ink-900 dark:text-white">
        {stage.title}
      </h3>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-500 dark:text-ink-400">
        {stage.text}
      </p>
    </li>
  );
}

export function WaterJourney() {
  return (
    <section className="container-page py-16">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="badge bg-brand-100 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300">
          The journey
        </span>
        <h2 className="section-title mt-4 text-balance text-3xl">
          Every drop, from source to <span className="gradient-text">your glass</span>
        </h2>
        <p className="mt-3 leading-relaxed text-ink-600 dark:text-ink-300">
          We handle the whole chain — the water, the hardware that chills and filters
          it, and the delivery that keeps it coming.
        </p>
      </Reveal>

      <div className="relative mt-12">
        {/* Connecting current, drawn behind the stages. */}
        <svg
          aria-hidden
          viewBox="0 0 1200 40"
          preserveAspectRatio="none"
          className="pointer-events-none absolute left-0 top-12 hidden h-10 w-full lg:block"
        >
          <path
            d="M0,20 Q150,0 300,20 T600,20 T900,20 T1200,20"
            className="stroke-brand-200 dark:stroke-brand-800"
            strokeWidth="2"
            strokeDasharray="6 10"
            fill="none"
          />
        </svg>

        <ol className="relative grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {STAGES.map((stage, i) => (
            <JourneyStage key={stage.step} stage={stage} delay={i * 110} />
          ))}
        </ol>
      </div>
    </section>
  );
}
