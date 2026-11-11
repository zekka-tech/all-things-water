import { apiPost } from "@/lib/api";
import { env } from "@/lib/env";
import { getAccessToken } from "@/lib/adminAuth";
import type { Product } from "@/types";

export type CatalogUpdate =
  & Pick<Product, "id">
  & Partial<Pick<Product, "name" | "price" | "cost" | "stock">>
  & { visible?: boolean };

export async function adminCatalogRequest<T>(
  body: { action: "list" } | { updates: CatalogUpdate[] },
): Promise<T> {
  const token = await getAccessToken();
  if (!env.supabaseUrl || !token) {
    throw new Error("Sign in again to manage the catalogue.");
  }
  return apiPost<T>(`${env.supabaseUrl}/functions/v1/admin-sync`, body, {
    apikey: env.supabaseAnonKey,
    Authorization: `Bearer ${token}`,
  });
}
