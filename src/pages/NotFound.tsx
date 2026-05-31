import { Link } from "react-router-dom";
import { Droplets, ArrowLeft } from "lucide-react";
import { Seo } from "@/components/Seo";

export function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <div className="container-page flex flex-col items-center justify-center py-28 text-center">
        {/* Animated icon */}
        <div className="relative">
          <div
            aria-hidden
            className="absolute inset-0 -z-10 mx-auto h-24 w-24 rounded-full bg-brand-300/30 blur-2xl animate-ripple"
          />
          <div className="grid h-20 w-20 place-items-center rounded-full bg-brand-100 dark:bg-brand-500/15">
            <Droplets className="h-10 w-10 text-brand-500 dark:text-brand-400" />
          </div>
        </div>

        <p className="mt-6 font-display text-7xl font-extrabold tracking-tight text-brand-200 dark:text-brand-900">
          404
        </p>
        <h1 className="mt-2 font-display text-2xl font-bold text-ink-900 dark:text-white">
          Page not found
        </h1>
        <p className="mt-3 max-w-xs text-ink-500 dark:text-ink-400">
          Looks like this page dried up. Let's get you back to something refreshing.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/" className="btn-primary px-5 py-3">
            <ArrowLeft className="h-4 w-4" /> Back home
          </Link>
          <Link to="/shop" className="btn-outline px-5 py-3">
            Browse shop
          </Link>
        </div>
      </div>
    </>
  );
}
