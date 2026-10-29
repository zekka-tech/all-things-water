import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { WaterJourney } from "@/components/WaterJourney";

describe("WaterJourney", () => {
  it("renders all four stages in order", () => {
    render(<WaterJourney />);

    const steps = screen.getAllByRole("listitem");
    expect(steps).toHaveLength(4);
    expect(steps[0]).toHaveTextContent("From the source");
    expect(steps[3]).toHaveTextContent("At your door");
  });

  it("nests only list items in the ordered list, keeping the markup valid", () => {
    render(<WaterJourney />);

    const list = screen.getByRole("list");
    for (const child of list.children) {
      expect(child.tagName).toBe("LI");
    }
  });

  it("hides the decorative artwork from assistive tech", () => {
    const { container } = render(<WaterJourney />);

    for (const svg of container.querySelectorAll("svg")) {
      expect(svg).toHaveAttribute("aria-hidden");
    }
  });
});
