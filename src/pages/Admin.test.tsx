import { beforeEach, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Admin } from "./Admin";

const { request } = vi.hoisted(() => ({ request: vi.fn() }));
vi.mock("@/lib/adminCatalog", () => ({ adminCatalogRequest: request }));
vi.mock("@/lib/adminAuth", () => ({
  isCurrentUserAdmin: () => Promise.resolve(true),
  onAdminAuthChange: () => () => {},
  signInAdmin: vi.fn(),
  signOutAdmin: vi.fn(),
}));
const product = {
  id: "atw-001",
  slug: "cooler",
  name: "Server Product",
  tagline: "t",
  description: "d",
  category: "dispensers",
  price: 2700,
  cost: 2000,
  unit: "each",
  stock: 8,
  reserved_stock: 2,
  image: "/test.png",
  features: [],
  featured: true,
  volume_ml: null,
  visible: true,
};
const show = () =>
  render(
    <MemoryRouter>
      <Admin />
    </MemoryRouter>,
  );

beforeEach(() => {
  request.mockReset();
});

it("persists a visibility change on the server and shows its committed value", async () => {
  request.mockResolvedValueOnce({ products: [product] }).mockResolvedValueOnce({
    success: true,
  });
  show();
  const user = userEvent.setup();
  await user.click(await screen.findByTitle("Hide product"));
  await screen.findByTitle("Show product");
  expect(request).toHaveBeenLastCalledWith({
    updates: [{ id: product.id, visible: false }],
  });
});

it("keeps product edits open and shows errors when a server save fails", async () => {
  request.mockResolvedValueOnce({ products: [product] }).mockRejectedValueOnce(
    new Error("Stock changed; refresh"),
  );
  show();
  const user = userEvent.setup();
  await user.click(await screen.findByTitle("Edit product"));
  await user.click(screen.getByTitle("Save"));
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Stock changed; refresh",
  );
  expect(screen.getByDisplayValue("Server Product")).toBeVisible();
});
