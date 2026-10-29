import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Product3DPanel } from "@/components/Product3DPanel";

describe("Product3DPanel", () => {
  it("exposes exactly one labelled image for the product", () => {
    render(<Product3DPanel src="/bottle.webp" alt="18.9L dispenser bottle" />);

    expect(
      screen.getByRole("img", { name: "18.9L dispenser bottle" }),
    ).toBeInTheDocument();
  });

  it("loads the product image eagerly because it is the above-fold LCP element", () => {
    render(<Product3DPanel src="/bottle.webp" alt="18.9L dispenser bottle" />);

    expect(screen.getByRole("img", { name: "18.9L dispenser bottle" })).toHaveAttribute(
      "loading",
      "eager",
    );
  });

  it("blends the photo onto the stage, since catalogue shots are on white", () => {
    render(<Product3DPanel src="/bottle.webp" alt="18.9L dispenser bottle" />);

    expect(
      screen.getByRole("img", { name: "18.9L dispenser bottle" }).className,
    ).toContain("mix-blend-multiply");
  });
});
