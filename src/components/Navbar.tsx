import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Droplets, Menu, Moon, Settings, ShoppingCart, Sun, UserCircle, X } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@/context/useAuth";
import { cx } from "@/lib/format";

const links = [
  { to: "/", label: "Home", end: true },
  { to: "/shop", label: "Shop" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
];

export function Navbar() {
  const { count } = useCart();
  const { theme, toggle } = useTheme();
  const { user, hasConfig } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-ink-200/70 bg-white/90 backdrop-blur-md dark:border-ink-800/70 dark:bg-ink-950/90">
      <div className="container-page flex h-16 items-center justify-between gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-extrabold tracking-tight">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm transition-shadow hover:shadow-glow-sm">
            <Droplets className="h-5 w-5" />
          </span>
          <span className="font-display text-lg">
            All Things <span className="text-brand-600 dark:text-brand-400">Water</span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 md:flex">
          {links.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.end}>
              {({ isActive }) => (
                <span
                  className={cx(
                    "relative block rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "text-brand-700 dark:text-brand-300"
                      : "text-ink-600 hover:text-ink-900 dark:text-ink-300 dark:hover:text-white",
                  )}
                >
                  {l.label}
                  {isActive && (
                    <span className="absolute -bottom-px left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-brand-600 dark:bg-brand-400" />
                  )}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggle}
            aria-label="Toggle dark mode"
            className="btn-ghost h-10 w-10 rounded-xl p-0"
          >
            {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
          </button>

          <Link to="/cart" className="btn-ghost relative h-10 w-10 rounded-xl p-0" aria-label="Cart">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white ring-2 ring-white dark:ring-ink-950">
                {count > 9 ? "9+" : count}
              </span>
            )}
          </Link>

          {hasConfig && (
            <Link
              to="/account"
              className="btn-ghost h-10 w-10 rounded-xl p-0"
              aria-label={user ? "My account" : "Sign in"}
              title={user ? user.email : "Sign in"}
            >
              <UserCircle className="h-5 w-5" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="btn-ghost h-10 w-10 rounded-xl p-0 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <nav className="animate-slide-up border-t border-ink-200 bg-white/95 px-4 pb-4 pt-2 backdrop-blur-sm dark:border-ink-800 dark:bg-ink-950/95">
          <div className="space-y-0.5">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cx(
                    "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800/60",
                  )
                }
              >
                {l.label}
              </NavLink>
            ))}

            {/* Account link — shown only when accounts are configured */}
            {hasConfig && (
              <NavLink
                to="/account"
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  cx(
                    "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800/60",
                  )
                }
              >
                <span className="flex items-center gap-2">
                  <UserCircle className="h-4 w-4" />
                  {user ? "My Account" : "Sign in"}
                </span>
              </NavLink>
            )}

            {/* Admin link — subtle, mobile only */}
            <NavLink
              to="/admin"
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300"
                    : "text-ink-400 hover:bg-ink-50 dark:text-ink-500 dark:hover:bg-ink-800/60",
                )
              }
            >
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Admin
              </span>
            </NavLink>
          </div>
        </nav>
      )}
    </header>
  );
}
