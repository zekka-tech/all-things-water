import { createRef } from "react";
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/context/ThemeContext";
import { depthFor } from "@/lib/water/depth";
import { WaterCanvas, type WaterCanvasHandle } from "./WaterCanvas";

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

const renderCanvas = (ref = createRef<WaterCanvasHandle>()) => {
  const view = render(
    <ThemeProvider>
      <WaterCanvas ref={ref} />
    </ThemeProvider>,
  );
  const root = view.container.querySelector<HTMLElement>("[data-water-state]")!;
  return { ...view, root, ref };
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("WaterCanvas", () => {
  it("stays on the CSS water when the browser lacks the observers it needs", () => {
    // jsdom ships neither IntersectionObserver nor ResizeObserver.
    const { root } = renderCanvas();
    expect(root).toHaveAttribute("data-water-state", "fallback:unsupported");
    expect(root.querySelector("canvas")).toHaveClass("opacity-0");
  });

  it("skips the GPU scene on data-saver connections", () => {
    vi.stubGlobal("IntersectionObserver", NoopObserver);
    vi.stubGlobal("ResizeObserver", NoopObserver);
    // jsdom has no Network Information API to spy on.
    Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true });

    try {
      const { root } = renderCanvas();
      expect(root).toHaveAttribute("data-water-state", "fallback:lite");
    } finally {
      delete (navigator as { connection?: unknown }).connection;
    }
  });

  it("falls back when WebGL is unavailable", async () => {
    vi.stubGlobal("IntersectionObserver", NoopObserver);
    vi.stubGlobal("ResizeObserver", NoopObserver);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);

    const { root } = renderCanvas();
    expect(root).toHaveAttribute("data-water-state", "idle");
    await waitFor(() => expect(root).toHaveAttribute("data-water-state", "fallback:no-webgl"), {
      timeout: 3000,
    });
  });

  it("leaves software renderers to the CSS water", async () => {
    vi.stubGlobal("IntersectionObserver", NoopObserver);
    vi.stubGlobal("ResizeObserver", NoopObserver);
    const loseContext = vi.fn();
    const fakeGl = {
      RENDERER: 0x1f01,
      getExtension: (name: string) =>
        name === "WEBGL_debug_renderer_info"
          ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
          : name === "WEBGL_lose_context"
            ? { loseContext }
            : null,
      getParameter: () => "ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)), SwiftShader driver)",
    };
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, "getContext")
      .mockReturnValue(fakeGl as never);

    const { root } = renderCanvas();
    await waitFor(() => expect(root).toHaveAttribute("data-water-state", "fallback:software"), {
      timeout: 3000,
    });
    // Asked the browser to refuse a software context in the first place…
    expect(getContext).toHaveBeenCalledWith(
      "webgl",
      expect.objectContaining({ failIfMajorPerformanceCaveat: true }),
    );
    // …and released the one it got anyway.
    expect(loseContext).toHaveBeenCalled();
  });

  it("darkens the CSS water as the dive deepens", () => {
    const { root, ref } = renderCanvas();
    ref.current!.setProgress(0.5);
    const deep = root.querySelector<HTMLElement>(".to-abyss")!;
    expect(Number(deep.style.opacity)).toBeCloseTo(depthFor(0.5) * 0.9);
  });
});
