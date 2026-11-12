import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CartProvider } from "@/context/CartContext";
import { photos } from "@/data/photos";
import { waterSubjects } from "@/data/waterSubjects";
import { WaterGuide } from "./WaterGuide";

vi.mock("@/lib/marketing", () => ({ trackMarketing: vi.fn() }));

const renderGuide = () =>
  render(
    <MemoryRouter initialEntries={["/water"]}>
      <CartProvider>
        <WaterGuide />
      </CartProvider>
    </MemoryRouter>,
  );

afterEach(cleanup);

describe("WaterGuide", () => {
  it("tells every subject as its own anchored chapter", () => {
    renderGuide();
    for (const subject of waterSubjects) {
      const heading = screen.getByRole("heading", { level: 2, name: new RegExp(subject.title) });
      expect(heading.closest("section")).toHaveAttribute("id", subject.id);
    }
  });

  it("indexes the chapters and the planner", () => {
    renderGuide();
    const index = screen.getByRole("navigation", { name: "Chapters" });
    const links = within(index).getAllByRole("link");
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      ...waterSubjects.map((s) => `#${s.id}`),
      "#planner",
    ]);
  });

  it("answers the FAQ and ends with the planner", () => {
    const { container } = renderGuide();
    expect(screen.getByText("Where do you deliver?")).toBeInTheDocument();
    expect(container.querySelector('script[type="application/ld+json"]')?.textContent).toContain(
      '"FAQPage"',
    );
    expect(container.querySelector("#planner")).toContainElement(
      screen.getByRole("button", { name: /add setup to cart/i }),
    );
  });

  it("credits every photographer", () => {
    renderGuide();
    for (const photo of Object.values(photos)) {
      expect(screen.getByRole("link", { name: photo.credit.name })).toHaveAttribute(
        "href",
        photo.credit.url,
      );
    }
  });
});
