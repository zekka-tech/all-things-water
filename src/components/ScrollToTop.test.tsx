import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

function NavigateButton({ to }: { to: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>Navigate to {to}</button>;
}

describe("ScrollToTop", () => {
  let scrollToSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy as typeof window.scrollTo;
  });

  it("calls window.scrollTo on initial mount", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(scrollToSpy).toHaveBeenCalledWith(
      expect.objectContaining({ top: 0 }),
    );
  });

  it("renders nothing to the DOM", () => {
    const { container } = render(
      <MemoryRouter initialEntries={["/"]}>
        <ScrollToTop />
      </MemoryRouter>,
    );

    expect(container.innerHTML).toBe("");
  });

  it("calls scrollTo on each pathname change", () => {
    render(
      <MemoryRouter initialEntries={["/first"]}>
        <ScrollToTop />
        <NavigateButton to="/second" />
      </MemoryRouter>,
    );

    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Navigate to /second"));

    expect(scrollToSpy).toHaveBeenCalledTimes(2);
  });
});
