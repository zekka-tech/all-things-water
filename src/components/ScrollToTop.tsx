import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/** Scrolls to the top on every route change. */
export function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search]);
  return null;
}
