import { beforeEach, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CheckoutReturn } from "./CheckoutReturn";
import { saveCheckoutSession } from "@/lib/checkoutSession";

const { clear, post, track } = vi.hoisted(() => ({
  clear: vi.fn(),
  post: vi.fn(),
  track: vi.fn(),
}));
vi.mock("@/context/CartContext", () => ({ useCart: () => ({ clear }) }));
vi.mock("@/lib/api", () => ({ apiPost: post }));
vi.mock(
  "@/lib/env",
  () => ({ env: { supabaseUrl: "https://test.supabase.co" } }),
);
vi.mock("@/lib/marketing", () => ({ trackMarketing: track }));
const show = () =>
  render(
    <MemoryRouter initialEntries={["/checkout/return?orderRef=ATW-test"]}>
      <CheckoutReturn />
    </MemoryRouter>,
  );

beforeEach(() => {
  sessionStorage.clear();
  vi.clearAllMocks();
});

it("does not clear the cart or record a purchase from an arbitrary return URL", () => {
  show();
  expect(screen.getByRole("heading", { name: "Payment being processed" }))
    .toBeVisible();
  expect(clear).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
  expect(post).not.toHaveBeenCalled();
});

it("keeps the cart while server payment confirmation is pending", async () => {
  saveCheckoutSession({
    orderId: "id",
    orderRef: "ATW-test",
    checkoutToken: "token",
  });
  post.mockResolvedValue({
    status: "pending_payment",
    orderRef: "ATW-test",
    total: 500,
  });
  const view = show();
  await waitFor(() => expect(post).toHaveBeenCalled());
  expect(clear).not.toHaveBeenCalled();
  expect(track).not.toHaveBeenCalled();
  view.unmount();
});

it("clears the cart and records the server total only after payment is confirmed", async () => {
  saveCheckoutSession({
    orderId: "id",
    orderRef: "ATW-test",
    checkoutToken: "token",
  });
  post.mockResolvedValue({ status: "paid", orderRef: "ATW-test", total: 575 });
  show();
  await screen.findByRole("heading", { name: "Payment confirmed" });
  expect(clear).toHaveBeenCalledOnce();
  expect(track).toHaveBeenCalledWith({
    type: "purchase",
    orderRef: "ATW-test",
    value: 575,
  });
  expect(sessionStorage.getItem("atw.checkout.pending")).toBeNull();
});
