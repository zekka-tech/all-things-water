import { cx } from "@/lib/format";

// Fixed rather than random so the layout is identical across renders, tests
// and Lighthouse runs.
const BUBBLES = [
  { left: "8%", size: 10, delay: 0, duration: 11 },
  { left: "19%", size: 6, delay: 2.4, duration: 9 },
  { left: "31%", size: 14, delay: 1.1, duration: 13 },
  { left: "44%", size: 8, delay: 3.6, duration: 10 },
  { left: "57%", size: 5, delay: 0.7, duration: 8 },
  { left: "68%", size: 12, delay: 4.2, duration: 12 },
  { left: "79%", size: 7, delay: 1.9, duration: 9.5 },
  { left: "91%", size: 9, delay: 3.1, duration: 11.5 },
] as const;

export function BubbleField({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cx("pointer-events-none absolute inset-0 overflow-hidden", className)}
    >
      {BUBBLES.map((bubble) => (
        <span
          key={bubble.left}
          style={{
            left: bubble.left,
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            animationDelay: `${bubble.delay}s`,
            animationDuration: `${bubble.duration}s`,
          }}
          className="animate-bubble-rise absolute bottom-0 rounded-full border border-white/50 bg-white/30 dark:border-brand-300/30 dark:bg-brand-300/15"
        />
      ))}
    </div>
  );
}
