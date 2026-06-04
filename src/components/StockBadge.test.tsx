import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StockBadge } from "@/components/StockBadge";

describe("StockBadge", () => {
  // ✅ Positive tests
  it('renders "In stock" for stock greater than 2', () => {
    render(<StockBadge stock={5} />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  it('renders "In stock" for stock equal to 3', () => {
    render(<StockBadge stock={3} />);
    expect(screen.getByText("In stock")).toBeInTheDocument();
  });

  // ✅ Low stock tests
  it('renders "Only 2 left" for stock equal to 2', () => {
    render(<StockBadge stock={2} />);
    expect(screen.getByText("Only 2 left")).toBeInTheDocument();
  });

  it('renders "Only 1 left" for stock equal to 1', () => {
    render(<StockBadge stock={1} />);
    expect(screen.getByText("Only 1 left")).toBeInTheDocument();
  });

  // ❌ Out of stock test
  it('renders "Out of stock" for stock equal to 0', () => {
    render(<StockBadge stock={0} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  // ❌ Edge case tests
  it('renders "Out of stock" for negative stock', () => {
    render(<StockBadge stock={-1} />);
    expect(screen.getByText("Out of stock")).toBeInTheDocument();
  });

  it("applies emerald (green) class for in-stock badge", () => {
    render(<StockBadge stock={10} />);
    const badge = screen.getByText("In stock").closest("span");
    expect(badge?.className).toContain("bg-emerald");
  });

  it("applies amber (warning) class for low-stock badge", () => {
    render(<StockBadge stock={2} />);
    const badge = screen.getByText("Only 2 left").closest("span");
    expect(badge?.className).toContain("bg-amber");
  });

  it("applies ink (grey) class for out-of-stock badge", () => {
    render(<StockBadge stock={0} />);
    const badge = screen.getByText("Out of stock").closest("span");
    expect(badge?.className).toContain("bg-ink");
  });
});
