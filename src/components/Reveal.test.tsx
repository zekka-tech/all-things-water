import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Reveal } from "@/components/Reveal";

describe("Reveal", () => {
  afterEach(() => {
    // @ts-expect-error — restoring the jsdom default (no observer).
    delete globalThis.IntersectionObserver;
  });

  it("renders its children", () => {
    render(<Reveal>Hello water</Reveal>);
    expect(screen.getByText("Hello water")).toBeInTheDocument();
  });

  it("starts visible when IntersectionObserver is unavailable", () => {
    // Content must never be left hidden on a browser without the observer.
    render(<Reveal>Fail open</Reveal>);
    expect(screen.getByText("Fail open").className).toContain("reveal-visible");
  });

  it("stays hidden until the observer reports an intersection", () => {
    const observe = vi.fn();
    class FakeObserver {
      observe = observe;
      disconnect = vi.fn();
      unobserve = vi.fn();
      takeRecords = vi.fn(() => []);
      root = null;
      rootMargin = "";
      thresholds = [];
    }
    globalThis.IntersectionObserver =
      FakeObserver as unknown as typeof IntersectionObserver;

    render(<Reveal>Waiting</Reveal>);

    expect(observe).toHaveBeenCalled();
    expect(screen.getByText("Waiting").className).not.toContain("reveal-visible");
  });

  it("applies the stagger delay as a transition delay", () => {
    render(<Reveal delay={140}>Staggered</Reveal>);
    expect(screen.getByText("Staggered")).toHaveStyle({ transitionDelay: "140ms" });
  });
});
