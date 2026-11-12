import { afterEach, describe, expect, it, vi } from "vitest";
import { flyToCart, registerCartTarget } from "./cartFlight";

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

const box = (rect: Partial<DOMRect>) => {
  const el = document.createElement("button");
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 40, height: 40, ...rect }) as DOMRect;
  document.body.appendChild(el);
  return el;
};

// jsdom has no Web Animations API; tests that need it install a stub.
const originalAnimate = Element.prototype.animate;

afterEach(() => {
  vi.restoreAllMocks();
  Element.prototype.animate = originalAnimate;
  document.body.innerHTML = "";
});

describe("flyToCart", () => {
  it("lands straight away under reduced motion, without a droplet", () => {
    reducedMotion(true);
    const onLand = vi.fn();
    const cart = box({ left: 900, top: 10 });
    const stop = registerCartTarget({ element: () => cart, onLand });
    // Even where animation is supported, reduced motion means no flight.
    const animate = vi.fn();
    Element.prototype.animate = animate as never;

    flyToCart(box({ left: 100, top: 600 }));

    expect(onLand).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    expect(document.querySelector(".cart-drop")).toBeNull();
    stop();
  });

  it("flies a droplet when motion is allowed, and lands when it finishes", () => {
    reducedMotion(false);
    const onLand = vi.fn();
    const cart = box({ left: 900, top: 10 });
    const stop = registerCartTarget({ element: () => cart, onLand });
    const flight = { onfinish: null as null | (() => void), oncancel: null };
    Element.prototype.animate = vi.fn(() => flight) as never;

    flyToCart(box({ left: 100, top: 600 }));
    expect(document.querySelector(".cart-drop")).not.toBeNull();
    expect(onLand).not.toHaveBeenCalled();

    flight.onfinish?.();
    expect(onLand).toHaveBeenCalledTimes(1);
    expect(document.querySelector(".cart-drop")).toBeNull();
    stop();
  });

  it("does nothing harmful when no cart is registered", () => {
    reducedMotion(false);
    expect(() => flyToCart(box({}))).not.toThrow();
    expect(document.querySelector(".cart-drop")).toBeNull();
  });

  it("only clears the target it registered", () => {
    reducedMotion(true);
    const first = vi.fn();
    const second = vi.fn();
    const stopFirst = registerCartTarget({ element: () => box({}), onLand: first });
    const stopSecond = registerCartTarget({ element: () => box({}), onLand: second });

    stopFirst();
    flyToCart(box({}));
    expect(second).toHaveBeenCalledTimes(1);
    expect(first).not.toHaveBeenCalled();
    stopSecond();
  });
});
