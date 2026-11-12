/*
  "The new route is on screen." Fired by <RouteSignal> from inside the route
  Suspense boundary, so it only fires once the page itself — not the loading
  fallback — has committed. TransitionLink waits on it before letting the
  view transition capture the new page.
*/

const listeners = new Set<() => void>();

export function onRouteCommitted(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function routeCommitted() {
  for (const listener of [...listeners]) listener();
}
