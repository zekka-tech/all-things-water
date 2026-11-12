import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { useLocation } from "react-router";
import { products as bundledProducts } from "@/data/products";
import { supabase } from "@/lib/supabase";
import { productFromRow } from "@/lib/catalog";
import type { Product } from "@/types";

const fallback = { products: bundledProducts, ready: true, error: false };
const CatalogContext = createContext(fallback);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const [catalog, setCatalog] = useState(() =>
    supabase
      ? {
        products: bundledProducts.map((p) => ({ ...p, stock: 0 })),
        ready: false,
        error: false,
      }
      : fallback
  );

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let revision = 0;
    const reload = async () => {
      const current = ++revision;
      try {
        const { data, error } = await client.from("products")
          .select(
            "id,slug,name,tagline,description,category,price,unit,stock,reserved_stock,image,features,featured,volume_ml",
          )
          .eq("visible", true)
          .order("id")
          .abortSignal(AbortSignal.timeout(10_000));
        if (error) throw error;
        if (active && current === revision) {
          setCatalog({
            products: (data ?? []).map((row) => productFromRow(row)),
            ready: true,
            error: false,
          });
        }
      } catch {
        // Never offer bundled inventory as live stock during a backend outage.
        if (active && current === revision) {
          setCatalog((previous) => ({
            ...previous,
            ready: false,
            error: true,
          }));
        }
      }
    };
    void reload();
    const onFocus = () => {
      void reload();
    };
    window.addEventListener("focus", onFocus);
    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [pathname]);

  return (
    <CatalogContext.Provider value={catalog}>
      {children}
    </CatalogContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCatalog(): {
  products: Product[];
  ready: boolean;
  error: boolean;
} {
  return useContext(CatalogContext);
}
