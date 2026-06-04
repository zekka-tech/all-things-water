import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QuantityStepper } from "@/components/QuantityStepper";

describe("QuantityStepper", () => {
  // ✅ Positive tests
  it("renders the initial value", () => {
    render(
      <QuantityStepper value={3} max={10} onChange={vi.fn()} />,
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("increments value when + button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<QuantityStepper value={3} max={10} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /increase/i }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("decrements value when - button is clicked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(<QuantityStepper value={3} max={10} onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /decrease/i }));

    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith(2);
  });

  // ❌ Negative / boundary tests
  it("cannot decrement below min (default 1)", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={1} max={10} onChange={onChange} />);

    const decButton = screen.getByRole("button", { name: /decrease/i });
    expect(decButton).toBeDisabled();
  });

  it("cannot increment above max", () => {
    const onChange = vi.fn();
    render(<QuantityStepper value={10} max={10} onChange={onChange} />);

    const incButton = screen.getByRole("button", { name: /increase/i });
    expect(incButton).toBeDisabled();
  });

  it("respects custom min value", () => {
    const onChange = vi.fn();
    render(
      <QuantityStepper value={0} min={0} max={10} onChange={onChange} />,
    );

    const decButton = screen.getByRole("button", { name: /decrease/i });
    expect(decButton).toBeDisabled(); // value is 0, min is 0
  });

  it("respects custom min value (can decrement to min)", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();

    render(
      <QuantityStepper value={2} min={0} max={10} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: /decrease/i }));
    expect(onChange).toHaveBeenCalledWith(1);
  });

  it("disables + button when value equals max", () => {
    const onChange = vi.fn();
    render(
      <QuantityStepper value={5} max={5} onChange={onChange} />,
    );

    const incButton = screen.getByRole("button", { name: /increase/i });
    expect(incButton).toBeDisabled();
  });

  it("disables - button when value is at min (non-default min)", () => {
    const onChange = vi.fn();
    render(
      <QuantityStepper value={1} min={1} max={10} onChange={onChange} />,
    );

    const decButton = screen.getByRole("button", { name: /decrease/i });
    expect(decButton).toBeDisabled();
  });

  // Edge: value above max (should still display, but + disabled)
  it("disables + when value is somehow above max", () => {
    const onChange = vi.fn();
    render(
      <QuantityStepper value={15} max={10} onChange={onChange} />,
    );
    const incButton = screen.getByRole("button", { name: /increase/i });
    expect(incButton).toBeDisabled();
  });

  // Renders with different size props
  it("renders with sm size prop without error", () => {
    render(
      <QuantityStepper value={1} max={5} onChange={vi.fn()} size="sm" />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders with md size prop (default)", () => {
    render(
      <QuantityStepper value={1} max={5} onChange={vi.fn()} size="md" />,
    );
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
