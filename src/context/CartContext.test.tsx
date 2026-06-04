import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { CartProvider, useCart } from "@/context/CartContext";
import type { Product } from "@/types";

/**
 * Factory to create a minimal Product stub for tests.
 */
function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    id: overrides.id ?? "test-001",
    slug: overrides.slug ?? "test-product",
    name: overrides.name ?? "Test Product",
    tagline: overrides.tagline ?? "A test product",
    description: overrides.description ?? "Used for testing",
    category: overrides.category ?? "accessories",
    price: overrides.price ?? 100,
    cost: overrides.cost ?? 50,
    unit: overrides.unit ?? "each",
    stock: overrides.stock ?? 10,
    image: overrides.image ?? "/test.jpg",
    features: overrides.features ?? ["Feature 1"],
    featured: overrides.featured ?? false,
  };
}

/**
 * Wrapper that provides CartProvider context for renderHook.
 */
function wrapper({ children }: { children: ReactNode }) {
  return <CartProvider>{children}</CartProvider>;
}

beforeEach(() => {
  // Clear localStorage between tests so state doesn't leak
  localStorage.clear();
});

describe("CartContext", () => {
  describe("addItem", () => {
    it("adds an item to an empty cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", price: 100 });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe("atw-001");
      expect(result.current.items[0].quantity).toBe(1);
      expect(result.current.count).toBe(1);
    });

    it("adds an item with a specified quantity", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 10 });

      act(() => {
        result.current.addItem(product, 3);
      });

      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.count).toBe(3);
    });

    it("increments quantity when adding the same product again", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 10 });

      act(() => {
        result.current.addItem(product);
      });
      act(() => {
        result.current.addItem(product, 2);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(3);
      expect(result.current.count).toBe(3);
    });
  });

  describe("clampToStock (stock limit enforcement)", () => {
    it("clamps quantity at the stock limit when adding more than available", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 2 });

      act(() => {
        result.current.addItem(product, 5);
      });

      expect(result.current.items[0].quantity).toBe(2);
    });

    it("clamps total quantity when adding to an existing item beyond stock", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 3 });

      act(() => {
        result.current.addItem(product, 2);
      });
      act(() => {
        result.current.addItem(product, 5); // 2 + 5 = 7, but stock is 3
      });

      expect(result.current.items[0].quantity).toBe(3);
    });

    it("does not add item if stock is 0", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 0 });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("does not add item if stock is negative (defensive)", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: -5 });

      act(() => {
        result.current.addItem(product);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("clamps setQuantity to stock limit", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 4 });

      act(() => {
        result.current.addItem(product, 1);
      });
      act(() => {
        result.current.setQuantity("atw-001", 10);
      });

      expect(result.current.items[0].quantity).toBe(4);
    });
  });

  describe("removeItem", () => {
    it("removes an item from the cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const p1 = makeProduct({ id: "atw-001" });
      const p2 = makeProduct({ id: "atw-002" });

      act(() => {
        result.current.addItem(p1);
        result.current.addItem(p2);
      });
      expect(result.current.items).toHaveLength(2);

      act(() => {
        result.current.removeItem("atw-001");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe("atw-002");
    });

    it("does nothing when removing a non-existent item", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(product);
      });

      act(() => {
        result.current.removeItem("nonexistent");
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe("atw-001");
    });
  });

  describe("setQuantity", () => {
    it("updates the quantity of an existing item", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 10 });

      act(() => {
        result.current.addItem(product, 1);
      });
      act(() => {
        result.current.setQuantity("atw-001", 5);
      });

      expect(result.current.items[0].quantity).toBe(5);
    });

    // clampToStock clamps 0 → 1 when stock > 0, so setQuantity(0) keeps item at qty 1
    it("clamps quantity to 1 when set to 0 (stock > 0)", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 5 });

      act(() => {
        result.current.addItem(product, 2);
      });
      act(() => {
        result.current.setQuantity("atw-001", 0);
      });

      // clampToStock: Math.min(Math.max(1, 0), 5) = Math.min(1, 5) = 1
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
    });

    it("does not add item when stock is 0 (clampToStock returns 0)", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 0 });

      act(() => {
        result.current.addItem(product, 1);
      });

      expect(result.current.items).toHaveLength(0);
    });

    it("clamps negative quantity to 1 when stock > 0", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001", stock: 10 });

      act(() => {
        result.current.addItem(product, 1);
      });
      act(() => {
        result.current.setQuantity("atw-001", -5);
      });

      // clampToStock: Math.min(Math.max(1, -5), 10) = Math.min(1, 10) = 1
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
    });

    it("is a no-op for a non-existent product id", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(product, 1);
      });
      act(() => {
        result.current.setQuantity("nonexistent", 5);
      });

      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].quantity).toBe(1);
    });
  });

  describe("clear", () => {
    it("clears all items from the cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const p1 = makeProduct({ id: "atw-001" });
      const p2 = makeProduct({ id: "atw-002" });

      act(() => {
        result.current.addItem(p1);
        result.current.addItem(p2);
      });
      expect(result.current.count).toBe(2);

      act(() => {
        result.current.clear();
      });

      expect(result.current.items).toHaveLength(0);
      expect(result.current.count).toBe(0);
      expect(result.current.subtotal).toBe(0);
    });
  });

  describe("quantityOf", () => {
    it("returns the quantity of an item in the cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(product, 3);
      });

      expect(result.current.quantityOf("atw-001")).toBe(3);
    });

    it("returns 0 for an item not in the cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.quantityOf("atw-999")).toBe(0);
    });
  });

  describe("subtotal calculation", () => {
    it("calculates subtotal as sum of price × quantity", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const p1 = makeProduct({ id: "atw-001", price: 100 });
      const p2 = makeProduct({ id: "atw-002", price: 200 });

      act(() => {
        result.current.addItem(p1, 2); // 200
        result.current.addItem(p2, 1); // 200
      });

      expect(result.current.subtotal).toBe(400);
    });

    it("returns subtotal of 0 for an empty cart", () => {
      const { result } = renderHook(() => useCart(), { wrapper });

      expect(result.current.subtotal).toBe(0);
    });
  });

  describe("count", () => {
    it("reflects total quantity across all items", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const p1 = makeProduct({ id: "atw-001", stock: 5 });
      const p2 = makeProduct({ id: "atw-002", stock: 5 });

      act(() => {
        result.current.addItem(p1, 3);
        result.current.addItem(p2, 2);
      });

      expect(result.current.count).toBe(5);
    });

    it("updates count when an item is removed", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const p1 = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(p1, 3);
      });
      act(() => {
        result.current.removeItem("atw-001");
      });

      expect(result.current.count).toBe(0);
    });
  });

  describe("localStorage persistence", () => {
    it("persists cart items to localStorage on change", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(product, 2);
      });

      const stored = localStorage.getItem("atw.cart.v1");
      expect(stored).not.toBeNull();

      const parsed = JSON.parse(stored!);
      expect(parsed).toHaveLength(1);
      expect(parsed[0].product.id).toBe("atw-001");
      expect(parsed[0].quantity).toBe(2);
    });

    it("persists empty array after clear", () => {
      const { result } = renderHook(() => useCart(), { wrapper });
      const product = makeProduct({ id: "atw-001" });

      act(() => {
        result.current.addItem(product);
      });
      act(() => {
        result.current.clear();
      });

      const stored = localStorage.getItem("atw.cart.v1");
      expect(stored).toBe("[]");
    });

    it("hydrates from localStorage on mount", () => {
      // Pre-populate localStorage
      const preexisting = [
        {
          product: makeProduct({ id: "atw-001", price: 50 }),
          quantity: 2,
        },
      ];
      localStorage.setItem("atw.cart.v1", JSON.stringify(preexisting));

      const { result } = renderHook(() => useCart(), { wrapper });

      // After hydration, the cart should reflect the stored items
      expect(result.current.items).toHaveLength(1);
      expect(result.current.items[0].product.id).toBe("atw-001");
      expect(result.current.items[0].quantity).toBe(2);
    });

    it("handles malformed localStorage gracefully", () => {
      localStorage.setItem("atw.cart.v1", "not-valid-json{{{");

      // Should not throw
      const { result } = renderHook(() => useCart(), { wrapper });
      expect(result.current.items).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("throws when useCart is used outside CartProvider", () => {
      let error: Error | null = null;
      try {
        renderHook(() => useCart());
      } catch (e) {
        error = e as Error;
      }
      expect(error).not.toBeNull();
      expect(error?.message).toContain("useCart must be used within a CartProvider");
    });
  });
});
