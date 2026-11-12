import { useState } from "react";
import { Droplets, Mail, MapPin, Phone, ArrowRight, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { env } from "@/lib/env";
import { validateEmail } from "@/lib/validation";
import {
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_PHONE,
  CONTACT_PHONE_HREF,
  DEPOT_ADDRESS_PARTS,
} from "@/lib/contact";
import { TransitionLink as Link } from "./TransitionLink";
import { WaterSurface } from "./WaterSurface";

const linkClass = "text-white/75 transition-colors hover:text-white";
const headingClass = "label text-brand-200";
const iconClass = "grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 text-brand-200";

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
    // The page ends in deep water: a crest rises out of the footer's top edge.
    <footer className="relative mt-32 bg-abyss text-white/75">
      {/* `!` because WaterSurface's own colour sorts after text-abyss. */}
      <WaterSurface className="bottom-full h-12 text-abyss!" />

      <div>
        {/* Newsletter strip */}
        <div className="border-b border-white/10">
          <div className="container-page flex flex-col gap-4 py-10 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-xl font-semibold tracking-tight text-white">
                Stay hydrated — <span className="accent text-brand-200!">stay informed.</span>
              </p>
              <p className="mt-1 text-sm text-white/70">
                Product updates and promotions, straight to your inbox.
              </p>
            </div>

            {/* ── Success state ── */}
            {state === "success" && (
              <p className="text-sm font-semibold text-emerald-300 animate-fade-in">
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
                        className="btn-ghost ml-auto px-2! py-1! text-xs"
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
            <Link to="/" className="flex items-center gap-2.5 font-extrabold text-white">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-linear-to-br from-brand-500 to-brand-700 text-white shadow-xs">
                <Droplets className="h-5 w-5" />
              </span>
              <span className="font-display text-base">All Things Water</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
              Bottled water, dispensers and coolers — delivered from {DEPOT_ADDRESS_PARTS.addressLocality} across{" "}
              {DEPOT_ADDRESS_PARTS.addressRegion} and nearby.
            </p>
          </div>

          {/* Shop */}
          <div>
            <h2 className={headingClass}>Shop</h2>
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
                    className={linkClass}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h2 className={headingClass}>Company</h2>
            <ul className="mt-4 space-y-2.5 text-sm">
              {[
                { to: "/water", label: "Water guide" },
                { to: "/about", label: "About us" },
                { to: "/business", label: "For business" },
                { to: "/contact", label: "Contact" },
                { to: "/cart", label: "Your cart" },
              ].map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className={linkClass}
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h2 className={headingClass}>Get in touch</h2>
            <ul className="mt-4 space-y-3 text-sm">
              <li className="flex items-center gap-2.5">
                <span className={iconClass}>
                  <Phone className="h-3.5 w-3.5" />
                </span>
                <a href={CONTACT_PHONE_HREF} className={linkClass}>
                  {CONTACT_PHONE}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className={iconClass}>
                  <Mail className="h-3.5 w-3.5" />
                </span>
                <a href={CONTACT_EMAIL_HREF} className={linkClass}>
                  {CONTACT_EMAIL}
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <span className={iconClass}>
                  <MapPin className="h-3.5 w-3.5" />
                </span>
                {DEPOT_ADDRESS_PARTS.addressLocality}, {DEPOT_ADDRESS_PARTS.addressRegion}
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-5">
          <div className="container-page flex flex-col items-center justify-between gap-2 text-xs text-white/70 sm:flex-row">
            <span>© {new Date().getFullYear()} All Things Water. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link
                to="/terms"
                className="transition-colors hover:text-white"
              >
                Terms
              </Link>
              <Link
                to="/privacy"
                className="transition-colors hover:text-white"
              >
                Privacy
              </Link>
              <Link
                to="/returns"
                className="transition-colors hover:text-white"
              >
                Returns
              </Link>
              <span>Proudly South African</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
