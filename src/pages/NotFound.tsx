import { Link } from "react-router-dom";
import { Droplets } from "lucide-react";
import { Seo } from "@/components/Seo";

export function NotFound() {
  return (
    <>
      <Seo title="Page not found" />
      <div className="container-page grid place-items-center py-24 text-center">
        <Droplets className="h-14 w-14 text-brand-300" />
        <h1 className="mt-4 text-4xl font-extrabold">404</h1>
        <p className="mt-2 text-ink-500">We couldn't find that page.</p>
        <Link to="/" className="btn-primary mt-6 px-5 py-3">
          Back home
        </Link>
      </div>
    </>
  );
}
