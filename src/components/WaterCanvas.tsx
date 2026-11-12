import { useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { cx } from "@/lib/format";
import { prefersReducedMotion } from "@/lib/motion";
import { useTheme } from "@/context/ThemeContext";
import { depthFor } from "@/lib/water/depth";
import type { FallbackReason, WaterScene } from "@/lib/water/scene";
import { BubbleField } from "./BubbleField";

export interface WaterCanvasHandle {
  setProgress: (progress: number) => void;
}

type WaterState = "idle" | "gl" | `fallback:${FallbackReason | "unsupported" | "lite"}`;

/** Dev/QA switch: keep the GPU scene even when frames are slow (e.g. headless
 *  screenshots on a software rasteriser). Never set by the app itself. */
const FORCE_KEY = "atw.water.force";

const liteDevice = () => {
  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean };
    deviceMemory?: number;
  };
  return nav.connection?.saveData === true || (nav.deviceMemory ?? 8) <= 2;
};

/** Decided before first render, so unsupported devices never flash idle. */
const initialState = (): WaterState => {
  if (typeof IntersectionObserver === "undefined" || typeof ResizeObserver === "undefined") {
    return "fallback:unsupported";
  }
  return liteDevice() ? "fallback:lite" : "idle";
};

const readForce = () => {
  try {
    return localStorage.getItem(FORCE_KEY) === "1";
  } catch {
    return false;
  }
};

/**
 * Full-bleed GPU water. The CSS water layers paint first and stay underneath,
 * so the hero looks finished before the shader chunk has even been requested
 * — and if WebGL is missing, slow or lost, they simply remain.
 */
export function WaterCanvas({
  className,
  ref,
}: {
  className?: string;
  ref?: Ref<WaterCanvasHandle>;
}) {
  const { theme } = useTheme();
  const dark = theme === "dark";
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const deepRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<WaterScene | null>(null);
  const progressRef = useRef(0);
  const darkRef = useRef(dark);
  const [state, setState] = useState<WaterState>(initialState);
  const startable = useRef(state === "idle");

  useImperativeHandle(
    ref,
    () => ({
      setProgress: (progress: number) => {
        progressRef.current = progress;
        sceneRef.current?.setProgress(progress);
        // The CSS fallback dives too: an abyss layer fades in with depth.
        deepRef.current?.style.setProperty("opacity", String(depthFor(progress) * 0.9));
      },
    }),
    [],
  );

  useEffect(() => {
    darkRef.current = dark;
    sceneRef.current?.setDark(dark);
  }, [dark]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas || !startable.current) return;

    let cancelled = false;
    let observer: IntersectionObserver | undefined;
    const surface = root.closest<HTMLElement>("[data-water-surface]");
    const still = prefersReducedMotion();

    const onPointerMove = (event: PointerEvent) =>
      sceneRef.current?.setPointer(event.clientX, event.clientY);
    const onPointerDown = (event: PointerEvent) =>
      sceneRef.current?.ripple(event.clientX, event.clientY);
    const onVisibility = () => sceneRef.current?.setVisible(document.visibilityState === "visible");

    const start = async () => {
      const { createWaterScene } = await import("@/lib/water/scene");
      if (cancelled) return;
      const scene = await createWaterScene(canvas, {
        dark: darkRef.current,
        still,
        forceGl: readForce(),
        onReady: () => !cancelled && setState("gl"),
        onFallback: (reason) => {
          sceneRef.current = null;
          if (!cancelled) setState(`fallback:${reason}`);
        },
      });
      if (cancelled) {
        scene?.destroy();
        return;
      }
      if (!scene) return;
      sceneRef.current = scene;
      scene.setProgress(progressRef.current);

      observer = new IntersectionObserver(([entry]) => scene.setVisible(entry.isIntersecting));
      observer.observe(root);
      window.addEventListener("pointermove", onPointerMove, { passive: true });
      // Ripples come from the content the canvas sits behind, not the page.
      surface?.addEventListener("pointerdown", onPointerDown, { passive: true });
      document.addEventListener("visibilitychange", onVisibility);
    };

    // After first paint and idle: the h1 is the LCP element, not the canvas.
    const idle = window.requestIdleCallback
      ? window.requestIdleCallback(() => void start(), { timeout: 1500 })
      : window.setTimeout(() => void start(), 300);

    return () => {
      cancelled = true;
      if (window.cancelIdleCallback) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      observer?.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      surface?.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("visibilitychange", onVisibility);
      sceneRef.current?.destroy();
      sceneRef.current = null;
    };
  }, []);

  const live = state === "gl";

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-water-state={state}
      className={cx("pointer-events-none overflow-hidden", className)}
    >
      {/* CSS water: first paint, and the fallback when the GPU scene is off. */}
      <div
        className={cx(
          "absolute inset-0 transition-opacity duration-700",
          live ? "opacity-0" : "opacity-100",
        )}
      >
        <div className="absolute inset-0 bg-linear-to-b from-brand-50 via-brand-100/60 to-brand-200/70 dark:from-ink-900 dark:via-brand-950/70 dark:to-brand-950" />
        <div className="caustic-bg absolute inset-0" />
        <div ref={deepRef} className="absolute inset-0 bg-linear-to-b from-brand-800 to-abyss opacity-0" />
        <BubbleField className="opacity-60" />
      </div>
      <canvas
        ref={canvasRef}
        className={cx(
          "absolute inset-0 h-full w-full transition-opacity duration-700",
          live ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  );
}
