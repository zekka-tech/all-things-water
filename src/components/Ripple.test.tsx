import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRipple } from "@/components/Ripple";

const setReducedMotion = (matches: boolean) => {
  vi.mocked(window.matchMedia).mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as unknown as MediaQueryList,
  );
};

function Probe() {
  const { onPointerDown, ripples } = useRipple();
  return (
    <button type="button" onPointerDown={onPointerDown} data-testid="probe">
      Touch the water
      {ripples}
    </button>
  );
}

const rings = (el: HTMLElement) => el.querySelectorAll("span.animate-ring-out");

describe("useRipple", () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  it("spawns a ring where the pointer landed", () => {
    render(<Probe />);
    const probe = screen.getByTestId("probe");

    fireEvent.pointerDown(probe, { clientX: 10, clientY: 12 });

    expect(rings(probe)).toHaveLength(1);
  });

  it("removes the ring once its animation finishes", () => {
    render(<Probe />);
    const probe = screen.getByTestId("probe");

    fireEvent.pointerDown(probe, { clientX: 10, clientY: 12 });
    fireEvent.animationEnd(rings(probe)[0]);

    expect(rings(probe)).toHaveLength(0);
  });

  it("stacks concurrent ripples", () => {
    render(<Probe />);
    const probe = screen.getByTestId("probe");

    fireEvent.pointerDown(probe, { clientX: 10, clientY: 12 });
    fireEvent.pointerDown(probe, { clientX: 40, clientY: 20 });

    expect(rings(probe)).toHaveLength(2);
  });

  it("stays still when the viewer prefers reduced motion", () => {
    setReducedMotion(true);
    render(<Probe />);
    const probe = screen.getByTestId("probe");

    fireEvent.pointerDown(probe, { clientX: 10, clientY: 12 });

    expect(rings(probe)).toHaveLength(0);
  });
});
