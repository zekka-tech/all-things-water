import { useState } from "react";
import { Link } from "react-router-dom";
import { Droplets, Mail, MapPin, Phone, ArrowRight, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { env } from "@/lib/env";
import { validateEmail } from "@/lib/validation";

export function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error" | "unavailable">(
    "idle",
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateEmail(email)) return;

    if (!env.newsletterEndpoint) {
      setState("unavailable");
      return;
    }

    setState("loading");

    try {
      const res = await fetch(env.newsletterEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!res.ok) throw new Error("Subscription failed");

      setState("success");
    } catch {
      setState("error");
    }
  };

  const reset = () => {
    setState("idle");
    setEmail("");
  };

  return (
    <footer className="mt-20 border-t border-ink-200 dark:border-ink-800">
      {/* Brand gradient accent */}
      <div className="h-1 bg-gradient-to-r from-brand-500 via-brand-400 to-brand-600" />

      <div className="bg-ink-50 dark:bg-ink-950">
        {/* Newsletter strip */}
        <div className="border-b border-ink-200 dark:border-ink-800">
          <div className="container-page flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display font-semibold text-ink-900 dark:text-white">
                Stay hydrated — stay informed
              </p>
              <p className="mt-0.5 text-sm text-ink-500 dark:text-ink-400">
                Product updates and promotions, straight to your inbox.
              </p>
            </div>

            {/* ── Success state ── */}
            {state === "success" && (
              <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 animate-fade-in">
                ✓ Thanks for subscribing!
              </p>
            )}

            {/* ── Form or loading ── */}
            {state !== "success" && (
              <form onSubmit={handleSubscribe} className="w-full max-w-sm space-y-2">
                <div className="sr-only" aria-live="polite">
                  {state === "loading" && "Subscribing…"}
                  {state === "error" && "Newsletter subscription failed."}
                  {state === "unavailable" && "Newsletter subscription is currently unavailable."}
                </div>
                {(state === "error" || state === "unavailable") && (
                  <div
                    className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400 animate-fade-in"
                    role="alert"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {state === "unavailable"
                        ? "Newsletter sign-up is currently unavailable."
                        : "We couldn't subscribe you right now. Please try again later."}
                    </span>
                    {state === "error" && (
                      <button
                        type="button"
                        onClick={reset}
                        className="btn-ghost ml-auto !px-2 !py-1 text-xs"
                      >
                        <RefreshCw className="h-3 w-3" />
                        Try again
                      </button>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (state === "error" || state === "unavailable") {
                        setState("idle");
                      }
                    }}
                    placeholder="your@email.com"
                    className="input flex-1 text-sm"
                    aria-label="Email address"
                    disabled={state === "loading"}
                  />
                  <button
                    type="submit"
                    disabled={state === "loading"}
                    className="btn-primary shrink-0 px-4 py-2.5 text-sm"
                    aria-label="Subscribe to newsletter"
                  >
                    {state === "loading" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Main grid */}
        <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div>
            <Link to="/" className="flex items-center gap-2.5 font-extrabold">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
                <Droplets className="h-5 w-5" />
              </span>
              <span className="font-display text-base">All Things Water</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-500 dark:text-ink-400">
              Premium bottled water, dispensers and water filters — delivered across South Africa.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
              Shop
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: "/shop", label: "All products" },
                { to: "/shop?category=bottled-water", label: "Bottled water" },
                { to: "/shop?category=coolers", label: "Water filters" },
                { to: "/shop?category=dispensers", label: "Dispensers & chillers" },
                { to: "/shop?category=accessories", label: "Accessories" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-ink-600 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
              Company
            </h4>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: "/about", label: "About us" },
                { to: "/contact", label: "Contact" },
                { to: "/cart", label: "Your cart" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-ink-600 transition-colors hover:text-brand-600 dark:text-ink-400 dark:hover:text-brand-300"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-ink-400 dark:text-ink-500">
              Get in touch
            </h4>
            <ul className="mt-4 space-y-3 text-sm text-ink-500 dark:text-ink-400">
              <li className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <Phone className="h-3.5 w-3.5" />
                </span>
                +27 00 000 0000
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <Mail className="h-3.5 w-3.5" />
                </span>
                hello@allthingswater.co.za
              </li>
              <li className="flex items-center gap-2.5">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-500/15 dark:text-brand-400">
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                South Africa
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-ink-200 py-5 dark:border-ink-800">
          <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-ink-400 sm:flex-row">
            <span>© {new Date().getFullYear()} All Things Water. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link
                to="/terms"
                className="transition-colors hover:text-ink-600 dark:hover:text-ink-300"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="transition-colors hover:text-ink-600 dark:hover:text-ink-300"
              >
                Privacy
              </Link>
              <Link
                to="/returns"
                className="transition-colors hover:text-ink-600 dark:hover:text-ink-300"
              >
                Returns
              </Link>
              <span className="text-ink-300 dark:text-ink-600">Proudly South African 🇿🇦</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
