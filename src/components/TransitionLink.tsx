import { Link, NavLink, useNavigate } from "react-router";
import type { LinkProps, NavLinkProps } from "react-router";
import type { MouseEvent, Ref } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { onRouteCommitted } from "@/lib/routeSignal";
import { preloadRoute } from "@/routes";

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => Promise<void>) => unknown;
};

/** Give up waiting on a slow page and let the transition finish regardless. */
const COMMIT_TIMEOUT_MS = 1500;

const pathOf = (to: string) => new URL(to, window.location.href);

/**
 * Click handling shared by TransitionLink and TransitionNavLink. Falls through
 * to a normal router navigation whenever a view transition isn't wanted or
 * possible: modified clicks, other targets, same-page links, reduced motion,
 * or a browser without the View Transitions API.
 */
function useTransitionClick(to: string, replace?: boolean, state?: unknown) {
  const navigate = useNavigate();

  return (event: MouseEvent<HTMLAnchorElement>) => {
    const doc = document as ViewTransitionDocument;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (event.currentTarget.target && event.currentTarget.target !== "_self") ||
      typeof doc.startViewTransition !== "function" ||
      prefersReducedMotion()
    ) {
      return;
    }
    const next = pathOf(to);
    if (next.origin !== window.location.origin) return;
    if (next.pathname === window.location.pathname && next.search === window.location.search) {
      return;
    }

    event.preventDefault();
    doc.startViewTransition(
      () =>
        new Promise<void>((resolve) => {
          let done = false;
          const finish = () => {
            if (done) return;
            done = true;
            stop();
            // One more frame so effects that run after commit (scroll reset)
            // land before the new snapshot is taken.
            requestAnimationFrame(() => resolve());
          };
          const stop = onRouteCommitted(finish);
          window.setTimeout(finish, COMMIT_TIMEOUT_MS);
          navigate(to, { replace, state });
        }),
    );
  };
}

const warm = (to: string) => () => void preloadRoute(pathOf(to).pathname);

type TransitionLinkProps = Omit<LinkProps, "to"> & { to: string; ref?: Ref<HTMLAnchorElement> };

export function TransitionLink({ to, replace, state, onClick, ...rest }: TransitionLinkProps) {
  const transition = useTransitionClick(to, replace, state);
  return (
    <Link
      to={to}
      replace={replace}
      state={state}
      onPointerEnter={warm(to)}
      onFocus={warm(to)}
      onClick={(event) => {
        onClick?.(event);
        transition(event);
      }}
      {...rest}
    />
  );
}

type TransitionNavLinkProps = Omit<NavLinkProps, "to"> & {
  to: string;
  ref?: Ref<HTMLAnchorElement>;
};

export function TransitionNavLink({
  to,
  replace,
  state,
  onClick,
  ...rest
}: TransitionNavLinkProps) {
  const transition = useTransitionClick(to, replace, state);
  return (
    <NavLink
      to={to}
      replace={replace}
      state={state}
      onPointerEnter={warm(to)}
      onFocus={warm(to)}
      onClick={(event) => {
        onClick?.(event);
        transition(event);
      }}
      {...rest}
    />
  );
}
