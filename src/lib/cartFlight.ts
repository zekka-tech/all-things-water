import { prefersReducedMotion } from "./motion";

/*
  The add-to-cart "pour": a droplet arcs from the button that was pressed into
  the cart icon, and the badge reacts when it lands. Navbar registers the
  target; anything that adds to the cart calls flyToCart with its button.
*/

interface Target {
  element: () => HTMLElement | null;
  onLand: () => void;
}

let target: Target | null = null;

export function registerCartTarget(next: Target): () => void {
  target = next;
  return () => {
    if (target === next) target = null;
  };
}

const DROP_SIZE = 14;
const FLIGHT_MS = 720;

/** Animates a droplet to the cart; lands immediately when it can't fly. */
export function flyToCart(from: Element | null | undefined) {
  const current = target;
  const to = current?.element();
  const land = () => current?.onLand();

  if (!from || !to || prefersReducedMotion() || typeof document.body.animate !== "function") {
    land();
    return;
  }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  // The cart icon can be off screen or collapsed (e.g. mid-layout); skip.
  if (b.width === 0 || b.height === 0) {
    land();
    return;
  }

  const x0 = a.left + a.width / 2 - DROP_SIZE / 2;
  const y0 = a.top + a.height / 2 - DROP_SIZE / 2;
  const dx = b.left + b.width / 2 - DROP_SIZE / 2 - x0;
  const dy = b.top + b.height / 2 - DROP_SIZE / 2 - y0;
  const lift = Math.min(160, Math.abs(dy) * 0.35 + 60);

  const drop = document.createElement("span");
  drop.className = "cart-drop";
  drop.setAttribute("aria-hidden", "true");
  // Inline style attributes are CSP-legal; injected <style> elements are not.
  drop.style.setProperty("left", `${x0}px`);
  drop.style.setProperty("top", `${y0}px`);
  document.body.appendChild(drop);

  const flight = drop.animate(
    [
      { transform: "translate3d(0, 0, 0) scale(0.5)", opacity: 0 },
      {
        transform: `translate3d(${dx * 0.3}px, ${dy * 0.3 - lift}px, 0) scale(1.15)`,
        opacity: 1,
        offset: 0.4,
      },
      { transform: `translate3d(${dx}px, ${dy}px, 0) scale(0.45)`, opacity: 0.9 },
    ],
    { duration: FLIGHT_MS, easing: "cubic-bezier(0.45, 0, 0.55, 1)" },
  );
  const finish = () => {
    drop.remove();
    land();
  };
  flight.onfinish = finish;
  flight.oncancel = finish;
}
