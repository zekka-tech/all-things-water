import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CartProvider, useCart } from "@/context/CartContext";
import { products } from "@/data/products";
import { PRODUCT_IDS } from "@/lib/planner";
import { WaterPlanner } from "./WaterPlanner";

vi.mock("@/lib/marketing", () => ({ trackMarketing: vi.fn() }));

function CartProbe() {
  const { items } = useCart();
  return (
    <ul aria-label="cart">
      {items.map((i) => (
        <li key={i.product.id}>
          {i.product.id}×{i.quantity}
        </li>
      ))}
    </ul>
  );
}

const renderPlanner = () =>
  render(
    <MemoryRouter>
      <CartProvider>
        <WaterPlanner />
        <CartProbe />
      </CartProvider>
    </MemoryRouter>,
  );

beforeEach(() => localStorage.clear());

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("WaterPlanner", () => {
  it("adds the recommended setup to the cart, capped at stock", () => {
    renderPlanner();
    // Defaults: home, 4 people, 2 L a day, bottled still water — 56 L a week,
    // which is 5 cases of 12 L.
    expect(screen.getByText("56 L")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add setup to cart/i }));

    const still = products.find((p) => p.id === PRODUCT_IDS.still)!;
    expect(screen.getByRole("list", { name: "cart" })).toHaveTextContent(
      `${still.id}×${Math.min(5, still.stock)}`,
    );
  });

  it("switches to a cooler with refillable bottles and caps", () => {
    renderPlanner();
    fireEvent.click(screen.getByRole("radio", { name: /from a cooler/i }));

    expect(screen.getByText(products.find((p) => p.id === PRODUCT_IDS.bottle)!.name)).toBeInTheDocument();
    expect(screen.getByText(products.find((p) => p.id === PRODUCT_IDS.cap)!.name)).toBeInTheDocument();
  });
});
