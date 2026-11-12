export interface CatalogUpdate {
  id: string;
  name?: string;
  price?: number;
  cost?: number;
  stock?: number;
  visible?: boolean;
}

export function validateCatalogUpdates(
  body: Record<string, unknown>,
): { ok: true; updates: CatalogUpdate[] } | { ok: false; message: string } {
  // Preserve stock-only callers during a rolling frontend/backend deployment.
  const raw = body.updates ??
    (body.stockUpdates && typeof body.stockUpdates === "object"
      ? Object.entries(body.stockUpdates).map(([id, stock]) => ({ id, stock }))
      : undefined);
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 200) {
    return { ok: false, message: "Provide 1–200 product updates" };
  }
  const updates: CatalogUpdate[] = [];
  const seen = new Set<string>();
  for (const value of raw) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return { ok: false, message: "Invalid product update" };
    }
    const entry = value as Record<string, unknown>;
    if (
      typeof entry.id !== "string" || !entry.id.trim() ||
      entry.id.length > 64 || seen.has(entry.id)
    ) return { ok: false, message: "Invalid or duplicate product id" };
    seen.add(entry.id);
    const update: CatalogUpdate = { id: entry.id };
    for (const key of ["price", "cost", "stock"] as const) {
      const amount = entry[key];
      if (amount !== undefined) {
        if (
          typeof amount !== "number" || !Number.isInteger(amount) ||
          amount < (key === "price" ? 1 : 0) || amount > 1_000_000
        ) return { ok: false, message: `Invalid ${key}` };
        update[key] = amount;
      }
    }
    if (entry.name !== undefined) {
      if (
        typeof entry.name !== "string" || !entry.name.trim() ||
        entry.name.length > 200
      ) return { ok: false, message: "Invalid product name" };
      update.name = entry.name.trim();
    }
    if (entry.visible !== undefined) {
      if (typeof entry.visible !== "boolean") {
        return { ok: false, message: "Invalid product visibility" };
      }
      update.visible = entry.visible;
    }
    if (
      Object.keys(entry).some((key) =>
        !["id", "name", "price", "cost", "stock", "visible"].includes(key)
      ) || Object.keys(update).length === 1
    ) return { ok: false, message: "Unsupported product fields" };
    updates.push(update);
  }
  return { ok: true, updates };
}
