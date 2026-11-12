import { useEffect } from "react";
import { useLocation } from "react-router";
import { trackPageView } from "@/lib/analytics";

/** Scrolls to the top on every route change — or to the #hash target, when
 *  a link points into a page (e.g. /water#planner). */
export function ScrollToTop() {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    trackPageView(`${pathname}${search}`);
  }, [pathname, search]);

  useEffect(() => {
    const target = hash ? document.getElementById(decodeURIComponent(hash.slice(1))) : null;
    if (target) target.scrollIntoView({ block: "start" });
    else window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, search, hash]);

  return null;
}
