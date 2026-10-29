import { cx } from "@/lib/format";

/*
  The path spans 2400 units with a 600-unit wave period, and the <svg> is laid
  out at 200% width. A -50% drift therefore lands exactly two periods along,
  so the loop is seamless with no snap.
*/
const WAVE_PATH =
  "M0,60 Q150,10 300,60 T600,60 T900,60 T1200,60 T1500,60 T1800,60 T2100,60 T2400,60 V120 H0 Z";

const BANDS = [
  { animation: "animate-wave-drift-slow", opacity: "opacity-30", y: "translate-y-0" },
  { animation: "animate-wave-drift", opacity: "opacity-50", y: "translate-y-2" },
  { animation: "animate-wave-drift-fast", opacity: "opacity-70", y: "translate-y-4" },
] as const;

interface WaterSurfaceProps {
  className?: string;
  /** Point the crests downward, for a surface seen from below. */
  flip?: boolean;
}

export function WaterSurface({ className, flip = false }: WaterSurfaceProps) {
  return (
    <div
      aria-hidden
      className={cx(
        "water-surface text-brand-300 dark:text-brand-800",
        flip && "rotate-180",
        className,
      )}
    >
      {BANDS.map((band) => (
        <svg
          key={band.animation}
          viewBox="0 0 2400 120"
          preserveAspectRatio="none"
          className={cx(
            "absolute inset-x-0 bottom-0 h-full w-[200%]",
            band.animation,
            band.opacity,
            band.y,
          )}
        >
          <path d={WAVE_PATH} fill="currentColor" />
        </svg>
      ))}
    </div>
  );
}
