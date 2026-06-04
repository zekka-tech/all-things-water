import { describe, it, expect } from "vitest";
import { categories, categoryLabel } from "./categories";
import type { CategoryMeta } from "@/types";

describe("categoryLabel", () => {
  // ✅ Positive tests
  it("returns the label for a valid category id", () => {
    expect(categoryLabel("bottled-water")).toBe("Bottled Water");
    expect(categoryLabel("coolers")).toBe("Water Coolers");
    expect(categoryLabel("dispensers")).toBe("Dispensers & Bottles");
    expect(categoryLabel("accessories")).toBe("Accessories");
  });

  // ❌ Negative / edge case tests
  it("returns the id itself for an unknown category id", () => {
    expect(categoryLabel("unknown-category")).toBe("unknown-category");
  });

  it("returns empty string for empty string id", () => {
    expect(categoryLabel("")).toBe("");
  });
});

describe("categories array", () => {
  it("contains all expected category ids", () => {
    const ids = categories.map((c) => c.id);
    expect(ids).toContain("bottled-water");
    expect(ids).toContain("coolers");
    expect(ids).toContain("dispensers");
    expect(ids).toContain("accessories");
  });

  it("has exactly 4 categories", () => {
    expect(categories).toHaveLength(4);
  });

  it("each category has required fields (id, label, description)", () => {
    for (const category of categories) {
      expect(category.id).toBeTruthy();
      expect(typeof category.id).toBe("string");
      expect(category.label).toBeTruthy();
      expect(typeof category.label).toBe("string");
      expect(category.description).toBeTruthy();
      expect(typeof category.description).toBe("string");
    }
  });

  it("each category has a unique id", () => {
    const ids = categories.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every entry conforms to CategoryMeta type shape", () => {
    for (const category of categories) {
      const meta: CategoryMeta = category;
      expect(meta).toHaveProperty("id");
      expect(meta).toHaveProperty("label");
      expect(meta).toHaveProperty("description");
    }
  });
});
