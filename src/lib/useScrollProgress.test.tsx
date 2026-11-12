import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useScrollProgress } from "./useScrollProgress";

function Track({ onProgress }: { onProgress: (p: number) => void }) {
  const ref = useScrollProgress<HTMLDivElement>(onProgress);
  return <div ref={ref} />;
}

const atRect = (top: number, height: number) =>
  vi
    .spyOn(HTMLElement.prototype, "getBoundingClientRect")
    .mockReturnValue({ top, height, bottom: top + height, left: 0, right: 0, width: 0 } as DOMRect);

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useScrollProgress", () => {
  // jsdom's window is 768 px tall.
  it("reports how far the viewport has travelled through the element", () => {
    atRect(-616, 2000); // travel = 2000 - 768 = 1232; halfway
    const onProgress = vi.fn();
    render(<Track onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith(0.5);
  });

  it("clamps before the element and after it", () => {
    const onProgress = vi.fn();
    atRect(300, 2000);
    const { unmount } = render(<Track onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith(0);
    unmount();

    atRect(-5000, 2000);
    render(<Track onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });

  it("reports 0 for an element shorter than the viewport", () => {
    atRect(-100, 400);
    const onProgress = vi.fn();
    render(<Track onProgress={onProgress} />);
    expect(onProgress).toHaveBeenLastCalledWith(0);
  });

  it("re-measures on scroll, once per frame", () => {
    const rect = atRect(0, 2000);
    const onProgress = vi.fn();
    const frames: FrameRequestCallback[] = [];
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => frames.push(cb));
    render(<Track onProgress={onProgress} />);

    rect.mockReturnValue({ top: -1232, height: 2000 } as DOMRect);
    window.dispatchEvent(new Event("scroll"));
    window.dispatchEvent(new Event("scroll"));
    expect(frames).toHaveLength(1);

    frames[0](0);
    expect(onProgress).toHaveBeenLastCalledWith(1);
  });
});
