import { beforeEach, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CatalogProvider, useCatalog } from "./CatalogContext";
import { CartProvider, useCart } from "./CartContext";
import type { ReactNode } from "react";
import { products } from "@/data/products";

const { query } = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => ({ abortSignal: query }) }) }),
    }),
  },
}));

const row = {
  id: "atw-001",
  slug: "cooler",
  name: "Current Cooler",
  tagline: "Current",
  description: "Current",
  category: "dispensers",
  price: 2700,
  unit: "each",
  stock: 8,
  reserved_stock: 3,
  image: "/src/assets/products/unbuilt-filename.webp",
  features: [],
  featured: true,
  volume_ml: null,
};
const wrapper = ({ children }: { children: ReactNode }) => (
  <MemoryRouter>
    <CatalogProvider>
      <CartProvider>{children}</CartProvider>
    </CatalogProvider>
  </MemoryRouter>
);

beforeEach(() => {
  localStorage.clear();
  query.mockReset();
});

it("refreshes saved carts with live prices and unreserved stock", async () => {
  query.mockResolvedValue({ data: [row], error: null });
  localStorage.setItem(
    "atw.cart.v1",
    JSON.stringify([{ product: { id: "atw-001", price: 1 }, quantity: 10 }]),
  );
  const { result } = renderHook(
    () => ({ catalog: useCatalog(), cart: useCart() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.catalog.ready).toBe(true));
  await waitFor(() => expect(result.current.cart.count).toBe(5));
  expect(result.current.cart.subtotal).toBe(13_500);
  expect(result.current.cart.items[0].product.image).toBe(products[0].image);
});

it("removes products hidden from the public catalogue", async () => {
  query.mockResolvedValue({ data: [], error: null });
  localStorage.setItem(
    "atw.cart.v1",
    JSON.stringify([{ product: { id: "atw-001" }, quantity: 1 }]),
  );
  const { result } = renderHook(
    () => ({ catalog: useCatalog(), cart: useCart() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.catalog.ready).toBe(true));
  expect(result.current.cart.items).toEqual([]);
});

it("disables checkout after a refresh failure and preserves the customer's cart", async () => {
  query.mockResolvedValueOnce({ data: [row], error: null });
  const { result } = renderHook(
    () => ({ catalog: useCatalog(), cart: useCart() }),
    { wrapper },
  );
  await waitFor(() => expect(result.current.catalog.ready).toBe(true));
  act(() => result.current.cart.addItem(result.current.catalog.products[0], 2));
  query.mockRejectedValueOnce(new Error("offline"));
  act(() => window.dispatchEvent(new Event("focus")));
  await waitFor(() => expect(result.current.catalog.error).toBe(true));
  expect(result.current.catalog.ready).toBe(false);
  expect(result.current.cart.count).toBe(2);
});
