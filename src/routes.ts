import { lazy } from "react";
import type { ComponentType } from "react";

/*
  Route chunks, loaded once and shared between React.lazy and hover/focus
  preloading — TransitionLink warms a chunk before the click lands, so the
  route transition never waits on the network.
*/

type Loader = () => Promise<{ default: ComponentType }>;

const cache = new Map<string, Promise<{ default: ComponentType }>>();

function route(key: string, load: Loader) {
  const loadOnce = () => {
    let pending = cache.get(key);
    if (!pending) {
      pending = load();
      cache.set(key, pending);
      // A failed fetch shouldn't poison the cache; let the next attempt retry.
      pending.catch(() => cache.delete(key));
    }
    return pending;
  };
  return { key, load: loadOnce, Component: lazy(loadOnce) };
}

export const routes = {
  home: route("/", () => import("@/pages/Home").then((m) => ({ default: m.Home }))),
  shop: route("/shop", () => import("@/pages/Shop").then((m) => ({ default: m.Shop }))),
  product: route("/product", () =>
    import("@/pages/ProductDetail").then((m) => ({ default: m.ProductDetail })),
  ),
  water: route("/water", () =>
    import("@/pages/WaterGuide").then((m) => ({ default: m.WaterGuide })),
  ),
  cart: route("/cart", () => import("@/pages/Cart").then((m) => ({ default: m.Cart }))),
  checkout: route("/checkout", () =>
    import("@/pages/Checkout").then((m) => ({ default: m.Checkout })),
  ),
  checkoutReturn: route("/checkout/return", () =>
    import("@/pages/CheckoutReturn").then((m) => ({ default: m.CheckoutReturn })),
  ),
  checkoutCancel: route("/checkout/cancel", () =>
    import("@/pages/CheckoutCancel").then((m) => ({ default: m.CheckoutCancel })),
  ),
  about: route("/about", () => import("@/pages/About").then((m) => ({ default: m.About }))),
  contact: route("/contact", () =>
    import("@/pages/Contact").then((m) => ({ default: m.Contact })),
  ),
  business: route("/business", () =>
    import("@/pages/Business").then((m) => ({ default: m.Business })),
  ),
  terms: route("/terms", () => import("@/pages/Terms").then((m) => ({ default: m.Terms }))),
  privacy: route("/privacy", () =>
    import("@/pages/Privacy").then((m) => ({ default: m.Privacy })),
  ),
  returns: route("/returns", () =>
    import("@/pages/Returns").then((m) => ({ default: m.Returns })),
  ),
  admin: route("/admin", () => import("@/pages/Admin").then((m) => ({ default: m.Admin }))),
  account: route("/account", () =>
    import("@/pages/Account").then((m) => ({ default: m.Account })),
  ),
  notFound: route("*", () => import("@/pages/NotFound").then((m) => ({ default: m.NotFound }))),
};

/** Starts loading the chunk for a pathname; resolves when it's ready. */
export function preloadRoute(pathname: string): Promise<unknown> {
  const match =
    Object.values(routes).find((r) => r.key === pathname) ??
    (pathname.startsWith("/product/") ? routes.product : routes.notFound);
  return match.load().catch(() => undefined);
}
