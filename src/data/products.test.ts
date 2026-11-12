import { describe, it, expect } from "vitest";
import {
  products,
  getProductReviews,
  productReviews,
} from "./products";

describe("products data integrity", () => {
  it("every product has a unique id", () => {
    const ids = products.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every product has a unique slug", () => {
    const slugs = products.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("every product has required string fields", () => {
    for (const product of products) {
      expect(product.id).toBeTruthy();
      expect(typeof product.id).toBe("string");
      expect(product.slug).toBeTruthy();
      expect(typeof product.slug).toBe("string");
      expect(product.name).toBeTruthy();
      expect(typeof product.name).toBe("string");
      expect(product.description).toBeTruthy();
      expect(typeof product.description).toBe("string");
      expect(product.unit).toBeTruthy();
      expect(typeof product.unit).toBe("string");
      expect(Array.isArray(product.features)).toBe(true);
      expect(product.features.length).toBeGreaterThan(0);
    }
  });

  it("every product has valid numeric fields (price, cost, stock)", () => {
    for (const product of products) {
      expect(typeof product.price).toBe("number");
      expect(product.price).toBeGreaterThanOrEqual(0);
      expect(typeof product.cost).toBe("number");
      expect(product.cost).toBeGreaterThanOrEqual(0);
      expect(typeof product.stock).toBe("number");
      expect(product.stock).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(product.stock)).toBe(true);
    }
  });

  it("every product has a valid category from the Category union", () => {
    const validCategories = [
      "bottled-water",
      "coolers",
      "dispensers",
      "accessories",
    ];
    for (const product of products) {
      expect(validCategories).toContain(product.category);
    }
  });

  it("every product has a non-empty image path", () => {
    for (const product of products) {
      expect(product.image).toBeTruthy();
      expect(typeof product.image).toBe("string");
    }
  });

  it("every review points to an existing product id", () => {
    const productIds = new Set(products.map((product) => product.id));

    for (const review of productReviews) {
      expect(productIds.has(review.productId)).toBe(true);
    }
  });

  it("returns reviews when queried with a PDP product id", () => {
    expect(getProductReviews("atw-001")).toHaveLength(3);
    expect(getProductReviews("atw-001").map((review) => review.author)).toContain("Thandi M.");
  });
});
