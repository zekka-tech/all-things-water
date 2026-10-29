import { useCallback, useState } from "react";
import type { PointerEvent } from "react";
import { prefersReducedMotion } from "@/lib/motion";

interface Ring {
  id: number;
  x: number;
  y: number;
  size: number;
}

let nextRingId = 0;

/**
 * Water-touch feedback: a ring spreads from the pointer, the way a dropped
 * stone rings out. Spread `onPointerDown` onto a `relative overflow-hidden`
 * element and render `ripples` as its last child.
 */
export function useRipple() {
  const [rings, setRings] = useState<Ring[]>([]);

  const onPointerDown = useCallback((event: PointerEvent<HTMLElement>) => {
    if (prefersReducedMotion()) return;

    const rect = event.currentTarget.getBoundingClientRect();
    // Cover the furthest corner so the ring always clears the element.
    const size = Math.hypot(rect.width, rect.height) * 2;

    setRings((current) => [
      ...current,
      {
        id: nextRingId++,
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        size,
      },
    ]);
  }, []);

  const clearRing = useCallback((id: number) => {
    setRings((current) => current.filter((ring) => ring.id !== id));
  }, []);

  const ripples = rings.map((ring) => (
    <span
      key={ring.id}
      aria-hidden
      onAnimationEnd={() => clearRing(ring.id)}
      style={{
        left: ring.x,
        top: ring.y,
        width: ring.size,
        height: ring.size,
      }}
      className="animate-ring-out pointer-events-none absolute rounded-full border-2 border-current opacity-0"
    />
  ));

  return { onPointerDown, ripples };
}
