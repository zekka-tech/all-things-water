import { useRef } from "react";
import type { HTMLAttributes, PointerEvent } from "react";
import { cx } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";

interface TiltCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Peak rotation at the edges, in degrees. */
  max?: number;
  sheen?: boolean;
}

export function TiltCard({
  max = 7,
  sheen = true,
  className,
  children,
  ...rest
}: TiltCardProps) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (event: PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    // Touch/pen would tilt the card out from under the finger that is tapping it.
    if (!el || event.pointerType !== "mouse" || prefersReducedMotion()) return;

    const rect = el.getBoundingClientRect();
    const offsetX = (event.clientX - rect.left) / rect.width - 0.5;
    const offsetY = (event.clientY - rect.top) / rect.height - 0.5;

    el.style.setProperty("--tilt-x", `${offsetX * max * 2}deg`);
    el.style.setProperty("--tilt-y", `${-offsetY * max * 2}deg`);
    // Unitless twins (-0.5..0.5) for the parallax-* layers: a deg value can't
    // be turned into a px offset in calc().
    el.style.setProperty("--tilt-px", offsetX.toFixed(3));
    el.style.setProperty("--tilt-py", offsetY.toFixed(3));
  };

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
    el.style.setProperty("--tilt-px", "0");
    el.style.setProperty("--tilt-py", "0");
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      className={cx("tilt-card relative", className)}
      {...rest}
    >
      {children}
      {sheen && <span aria-hidden className="sheen-overlay rounded-[inherit]" />}
    </div>
  );
}
