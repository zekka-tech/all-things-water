import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useNavigate } from "react-router-dom";
import { ScrollToTop } from "@/components/ScrollToTop";

// Helper component that exposes navigation so we can trigger route changes
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

  it("calls scrollTo on each pathname change", async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={["/first"]}>
        <ScrollToTop />
        <NavigateButton to="/second" />
      </MemoryRouter>,
    );

    // Mount: scrollTo called once
    expect(scrollToSpy).toHaveBeenCalledTimes(1);

    // Navigate to a new path
    await user.click(screen.getByText("Navigate to /second"));

    // After navigation, scrollTo should fire again
    expect(scrollToSpy).toHaveBeenCalledTimes(2);
  });
});
