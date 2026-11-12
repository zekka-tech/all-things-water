import { ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";
import { TransitionLink as Link } from "@/components/TransitionLink";

/** A message in a bottle, bobbing on a two-layer swell. */
function LostAtSea() {
  return (
    <svg
      viewBox="0 0 240 150"
      aria-hidden
      className="w-64 max-w-full [mask-image:linear-gradient(90deg,transparent,#000_22%,#000_78%,transparent)]"
    >
      <g className="animate-bob [transform-box:fill-box] [transform-origin:center]">
        <g transform="rotate(-16 128 74)">
          {/* Glass */}
          <rect
            x="86"
            y="56"
            width="76"
            height="36"
            rx="16"
            className="fill-brand-100/80 stroke-brand-400 dark:fill-brand-900/60 dark:stroke-brand-500"
            strokeWidth="3"
          />
          <rect
            x="160"
            y="65"
            width="20"
            height="18"
            rx="5"
            className="fill-brand-100/80 stroke-brand-400 dark:fill-brand-900/60 dark:stroke-brand-500"
            strokeWidth="3"
          />
          {/* Cork */}
          <rect x="178" y="66" width="10" height="16" rx="3" className="fill-amber-700/80" />
          {/* The rolled-up message */}
          <rect x="100" y="64" width="44" height="20" rx="4" className="fill-amber-50 stroke-amber-300" strokeWidth="2" />
          <path d="M108 71h28M108 77h20" className="stroke-amber-400" strokeWidth="2" strokeLinecap="round" />
          {/* Highlight */}
          <path d="M98 62h50" className="stroke-white/80" strokeWidth="3" strokeLinecap="round" />
        </g>
      </g>
      <path
        d="M0 100q20-12 40 0t40 0 40 0 40 0 40 0 40 0V150H0Z"
        className="fill-brand-200/80 dark:fill-brand-800/70"
      />
      <path
        d="M0 116q20-10 40 0t40 0 40 0 40 0 40 0 40 0V150H0Z"
        className="fill-brand-300/80 dark:fill-brand-700/70"
      />
    </svg>
  );
}

export function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <div className="container-page flex flex-col items-center justify-center py-24 text-center">
        <LostAtSea />

        {/* Decorative: the <h1> below carries the meaning, so this is redundant
            for screen readers and exempt from the contrast minimum. */}
        <p aria-hidden="true" className="label mt-8 text-brand-700 dark:text-brand-300">
          Error 404
        </p>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink-900 dark:text-white">
          Page not found — <span className="accent">lost at sea.</span>
        </h1>
        <p className="mt-3 max-w-sm leading-relaxed text-ink-600 dark:text-ink-300">
          This page has drifted off somewhere. Let&rsquo;s get you back to something refreshing.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary px-5 py-3">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <Link to="/shop" className="btn-outline px-5 py-3">
            Browse shop
          </Link>
          <Link to="/water" className="btn-ghost px-5 py-3">
            Read the water guide
          </Link>
        </div>
      </div>
    </>
  );
}
