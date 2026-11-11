import { expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Checkout } from "./Checkout";
import { ApiError } from "@/lib/api";

const { post } = vi.hoisted(() => ({ post: vi.fn() }));
vi.mock(
  "@/lib/api",
  async (actual) => ({
    ...await actual<typeof import("@/lib/api")>(),
    apiPost: post,
  }),
);
vi.mock("@/context/CartContext", async () => {
  const { products } = await import("@/data/products");
  return {
    useCart: () => ({
      items: [{ product: products[0], quantity: 1 }],
      subtotal: products[0].price,
    }),
  };
});
vi.mock("@/context/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock(
  "@/lib/supabase",
  () => ({
    supabase: { auth: { getSession: () => Promise.resolve({ data: null }) } },
  }),
);
vi.mock(
  "@/lib/env",
  () => ({
    env: {
      supabaseUrl: "https://test.supabase.co",
      supabaseAnonKey: "public",
      companyAddress: "Depot",
    },
  }),
);
vi.mock("@/lib/sentry", () => ({ captureException: vi.fn() }));
vi.mock("@/lib/marketing", () => ({ trackMarketing: vi.fn() }));

it("reuses a known reservation on payment retry and releases it before creating an edited order", async () => {
  post.mockImplementation((url: string) => {
    if (url.endsWith("/orders")) {
      return Promise.resolve({
        orderId: "order",
        orderRef: "ref",
        checkoutToken: "token",
      });
    }
    if (url.endsWith("/order-cancel")) return Promise.resolve({ ok: true });
    return Promise.reject(new ApiError(500, "Payment unavailable"));
  });
  render(
    <MemoryRouter>
      <Checkout />
    </MemoryRouter>,
  );
  const user = userEvent.setup();
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Customer" } });
  fireEvent.change(screen.getByLabelText("Email"), { target: { value: "customer@example.com" } });
  fireEvent.change(screen.getByLabelText("Phone number"), { target: { value: "0821234567" } });
  await user.click(
    screen.getByRole("button", { name: /collect from our depot/i }),
  );
  await user.click(screen.getByRole("button", { name: "Place order" }));
  await screen.findByText("Payment unavailable");
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(3));
  await screen.findByText("Payment unavailable");
  fireEvent.change(screen.getByLabelText("Full name"), { target: { value: "Customer Updated" } });
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(post).toHaveBeenCalledTimes(6));
  expect(post.mock.calls.map(([url]) => new URL(url).pathname.split("/").pop()))
    .toEqual([
      "orders",
      "payments-payfast-initiate",
      "payments-payfast-initiate",
      "order-cancel",
      "orders",
      "payments-payfast-initiate",
    ]);
});
