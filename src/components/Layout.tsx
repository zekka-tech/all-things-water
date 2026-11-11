import type { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { CookieConsent } from "./CookieConsent";
import { useCatalog } from "@/context/CatalogContext";

export function Layout({ children }: { children: ReactNode }) {
  const { error } = useCatalog();
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      {error && <p role="alert" className="bg-amber-50 p-3 text-center text-sm text-amber-900">We couldn’t refresh prices and availability. Please reload before checking out.</p>}
      <main className="flex-1">{children}</main>
      <Footer />
      <CookieConsent />
    </div>
  );
}
