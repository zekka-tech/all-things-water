import { describe, expect, it } from "vitest";
import { depthFor } from "./depth";

describe("depthFor", () => {
  it("starts at the surface", () => {
    expect(depthFor(0)).toBe(0);
  });

  it("is fully deep through the middle of the dive", () => {
    expect(depthFor(0.5)).toBeCloseTo(1);
    expect(depthFor(0.7)).toBeCloseTo(1);
  });

  it("surfaces again at the end, but not all the way", () => {
    expect(depthFor(1)).toBeCloseTo(0.12);
    expect(depthFor(0.9)).toBeLessThan(depthFor(0.75));
  });

  it("clamps progress outside 0..1", () => {
    expect(depthFor(-1)).toBe(depthFor(0));
    expect(depthFor(2)).toBe(depthFor(1));
  });
});
