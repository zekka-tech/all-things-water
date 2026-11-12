import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TransitionLink } from "./TransitionLink";

/** Installs (or with no argument, removes) document.startViewTransition. */
const setViewTransitions = (start?: (update: () => Promise<void>) => unknown) => {
  if (start) Object.defineProperty(document, "startViewTransition", { value: start, configurable: true });
  else Reflect.deleteProperty(document, "startViewTransition");
};

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderLink = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <TransitionLink to="/shop">Shop</TransitionLink>
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

const reducedMotion = (matches: boolean) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches: matches && query.includes("reduce"),
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }) as unknown as MediaQueryList,
  );

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  setViewTransitions();
});

describe("TransitionLink", () => {
  it("navigates normally where view transitions aren't supported", () => {
    renderLink();
    fireEvent.click(screen.getByRole("link", { name: "Shop" }));
    expect(screen.getByTestId("where")).toHaveTextContent("/shop");
  });

  it("wraps the navigation in a view transition where supported", () => {
    reducedMotion(false);
    const start = vi.fn((update: () => Promise<void>) => void update());
    setViewTransitions(start);

    renderLink();
    fireEvent.click(screen.getByRole("link", { name: "Shop" }));

    expect(start).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("where")).toHaveTextContent("/shop");
  });

  it("skips the transition under reduced motion", () => {
    reducedMotion(true);
    const start = vi.fn();
    setViewTransitions(start);

    renderLink();
    fireEvent.click(screen.getByRole("link", { name: "Shop" }));

    expect(start).not.toHaveBeenCalled();
    expect(screen.getByTestId("where")).toHaveTextContent("/shop");
  });

  it("leaves modified clicks to the browser", () => {
    reducedMotion(false);
    const start = vi.fn();
    setViewTransitions(start);

    renderLink();
    fireEvent.click(screen.getByRole("link", { name: "Shop" }), { ctrlKey: true });

    expect(start).not.toHaveBeenCalled();
  });
});
