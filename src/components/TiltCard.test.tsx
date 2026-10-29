import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TiltCard } from "@/components/TiltCard";

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

const renderTilt = () => {
  render(<TiltCard>Tilt me</TiltCard>);
  const card = screen.getByText("Tilt me").closest("div") as HTMLElement;
  // jsdom reports a zero-size box, which would make the tilt maths divide by 0.
  card.getBoundingClientRect = () =>
    ({ left: 0, top: 0, width: 200, height: 100 }) as DOMRect;
  return card;
};

describe("TiltCard", () => {
  beforeEach(() => {
    setReducedMotion(false);
  });

  it("tilts toward a mouse pointer", () => {
    const card = renderTilt();

    // Bottom-right corner → positive Y rotation, negative X rotation.
    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });

    expect(card.style.getPropertyValue("--tilt-x")).toBe("7deg");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("-7deg");
  });

  it("resets when the pointer leaves", () => {
    const card = renderTilt();

    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });
    fireEvent.pointerLeave(card);

    expect(card.style.getPropertyValue("--tilt-x")).toBe("0deg");
    expect(card.style.getPropertyValue("--tilt-y")).toBe("0deg");
  });

  it("ignores touch input so the card does not move under a tapping finger", () => {
    const card = renderTilt();

    fireEvent.pointerMove(card, { pointerType: "touch", clientX: 200, clientY: 100 });

    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
  });

  it("does not tilt when the viewer prefers reduced motion", () => {
    setReducedMotion(true);
    const card = renderTilt();

    fireEvent.pointerMove(card, { pointerType: "mouse", clientX: 200, clientY: 100 });

    expect(card.style.getPropertyValue("--tilt-x")).toBe("");
  });
});
