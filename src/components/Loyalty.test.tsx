import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sentry", () => ({ captureException: vi.fn() }));

const hAuth = vi.hoisted(() => ({
  value: { user: { id: "u1", email: "user@example.com" } },
}));
vi.mock("@/context/useAuth", () => ({ useAuth: () => hAuth.value }));

vi.mock("@/lib/referral", () => ({
  getStoredReferral: () => null,
  clearStoredReferral: vi.fn(),
}));

const h = vi.hoisted(() => ({
  rpc: vi.fn(),
}));
vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: { rpc: h.rpc },
}));

import { Loyalty } from "./Loyalty";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Loyalty", () => {
  it("renders the points balance and referral link", async () => {
    h.rpc.mockResolvedValue({
      data: {
        points: 320,
        lifetimePoints: 540,
        referralCode: "ABCD1234",
        referred: false,
      },
      error: null,
    });

    render(<Loyalty />);

    await waitFor(() => expect(screen.getByText("320")).toBeInTheDocument());
    expect(screen.getByText(/540 earned all-time/i)).toBeInTheDocument();
    expect(screen.getByText(/ref=ABCD1234/i)).toBeInTheDocument();
    expect(h.rpc).toHaveBeenCalledWith("get_or_create_loyalty", { p_ref_code: null });
  });

  it("shows an error state when the rpc fails", async () => {
    h.rpc.mockResolvedValue({ data: null, error: new Error("boom") });
    render(<Loyalty />);
    await waitFor(() =>
      expect(screen.getByText(/could not load your rewards/i)).toBeInTheDocument(),
    );
  });
});
