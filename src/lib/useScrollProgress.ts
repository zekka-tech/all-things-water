import { useEffect, useLayoutEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion";

/**
 * Reports how far the viewport has travelled through an element, 0 when its
 * top reaches the top of the viewport and 1 when its bottom reaches the
 * bottom. The callback runs at most once per frame and never re-renders —
 * consumers write to the DOM or a uniform directly. Purely decorative inputs
 * hang off it; nothing is hidden behind it, so there's nothing to fail open.
 */
export function useScrollProgress<T extends HTMLElement>(onProgress: (progress: number) => void) {
  const ref = useRef<T>(null);
  const callback = useRef(onProgress);

  useLayoutEffect(() => {
    callback.current = onProgress;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;

    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const travel = rect.height - window.innerHeight;
      callback.current(travel > 0 ? Math.min(Math.max(-rect.top / travel, 0), 1) : 0);
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return ref;
}

/**
 * Scroll parallax for an image inside a clipped frame: the image drifts
 * against the scroll and is pre-scaled so its edges never show. Only listens
 * while the frame is on screen, and does nothing under reduced motion.
 */
export function useParallax<T extends HTMLElement>(strength = 0.08) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    const frameEl = el?.parentElement;
    if (!el || !frameEl || prefersReducedMotion() || typeof IntersectionObserver === "undefined") {
      return;
    }
    let frame = 0;

    const update = () => {
      frame = 0;
      const rect = frameEl.getBoundingClientRect();
      const half = window.innerHeight / 2;
      // -1 as the frame enters at the bottom, +1 as it leaves at the top.
      const offset = (half - (rect.top + rect.height / 2)) / (half + rect.height / 2);
      const shift = Math.max(-1, Math.min(1, offset)) * strength * 100;
      el.style.setProperty(
        "transform",
        `translate3d(0, ${shift.toFixed(2)}%, 0) scale(${1 + strength * 2})`,
      );
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        update();
        window.addEventListener("scroll", schedule, { passive: true });
      } else {
        window.removeEventListener("scroll", schedule);
      }
    });
    observer.observe(frameEl);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
    };
  }, [strength]);

  return ref;
}
