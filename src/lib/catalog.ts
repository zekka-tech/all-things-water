import { products } from "@/data/products";
import type { Database } from "@/lib/supabase";
import type { Product } from "@/types";

export type ProductRow =
  & Omit<
    Database["public"]["Tables"]["products"]["Row"],
    "cost" | "visible" | "created_at" | "updated_at"
  >
  & { cost?: number; visible?: boolean };

/** Seeded /src/ image paths must resolve to Vite's content-hashed assets. */
export function productFromRow(row: ProductRow, available = true): Product {
  const bundled = products.find((p) => p.id === row.id);
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    category: row.category,
    price: row.price,
    cost: row.cost ?? 0,
    unit: row.unit,
    stock: Math.max(0, row.stock - (available ? row.reserved_stock : 0)),
    image: row.image.startsWith("/src/")
      ? bundled?.image ?? "/favicon.svg"
      : row.image,
    features: row.features,
    featured: row.featured,
    volumeMl: row.volume_ml ?? undefined,
  };
}
