import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Subscriptions } from "@/components/Subscriptions";
import {
  frequencyLabel,
  subscriptionStatusLabel,
} from "@/lib/subscriptions";

vi.mock("@/lib/sentry", () => ({ captureException: vi.fn() }));

// Stable auth value — a fresh object each render would re-create the load
// callback and trigger a reload loop, flickering the list in and out.
const hAuth = vi.hoisted(() => ({
  value: { user: { id: "u1", email: "user@example.com" } },
}));
vi.mock("@/context/useAuth", () => ({ useAuth: () => hAuth.value }));

// Shared mutable state for the mocked supabase query chain, hoisted so the
// vi.mock factory can safely reference it.
const h = vi.hoisted(() => {
  const state: { result: { data: unknown; error: unknown } } = {
    result: { data: [], error: null },
  };
  const builder = {
    select: vi.fn(() => builder),
    or: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
    maybeSingle: vi.fn(() => Promise.resolve(state.result)),
    then: (resolve: (v: { data: unknown; error: unknown }) => void) =>
      resolve(state.result),
  };
  const from = vi.fn(() => builder);
  return { state, builder, from };
});

const { state, builder } = h;
function setResult(result: { data: unknown; error: unknown }) {
  state.result = result;
}

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: { from: h.from },
}));

function renderSubs() {
  return render(
    <MemoryRouter>
      <Subscriptions />
    </MemoryRouter>,
  );
}

const SUBS = [
  {
    id: "s1",
    product_id: "atw-001",
    product_name: "Hot & Cold Water Cooler YLR-805LB",
    quantity: 1,
    unit_price: 2645,
    frequency: "monthly",
    status: "active",
    next_delivery_date: "2026-07-28",
  },
  {
    id: "s2",
    product_id: "atw-005",
    product_name: "Monate Still 500ml",
    quantity: 2,
    unit_price: 120,
    frequency: "weekly",
    status: "paused",
    next_delivery_date: "2026-07-05",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  setResult({ data: [], error: null });
});

describe("Subscriptions helpers", () => {
  it("maps frequency to a human label", () => {
    expect(frequencyLabel("weekly")).toBe("Every week");
    expect(frequencyLabel("fortnightly")).toBe("Every 2 weeks");
    expect(frequencyLabel("monthly")).toBe("Every month");
  });

  it("maps status to a human label", () => {
    expect(subscriptionStatusLabel("active")).toBe("Active");
    expect(subscriptionStatusLabel("paused")).toBe("Paused");
    expect(subscriptionStatusLabel("cancelled")).toBe("Cancelled");
  });
});

describe("Subscriptions component", () => {
  it("renders the heading and a create action", async () => {
    renderSubs();
    expect(screen.getByRole("heading", { name: /subscriptions/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /new subscription/i }),
    ).toBeInTheDocument();
  });

  it("shows the empty state when there are no subscriptions", async () => {
    setResult({ data: [], error: null });
    renderSubs();
    await waitFor(() =>
      expect(screen.getByText(/don.t have any subscriptions yet/i)).toBeInTheDocument(),
    );
  });

  it("lists subscriptions with pause and cancel controls", async () => {
    setResult({ data: SUBS, error: null });
    renderSubs();
    await waitFor(() =>
      expect(screen.getByText(/Hot & Cold Water Cooler/i)).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /resume/i })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /cancel/i }).length).toBe(2);
  });

  it("calls update with paused status when pausing", async () => {
    setResult({ data: SUBS, error: null });
    renderSubs();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /pause/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    await waitFor(() => {
      expect(builder.update).toHaveBeenCalledWith({ status: "paused" });
      expect(builder.eq).toHaveBeenCalledWith("id", "s1");
    });
  });

  it("calls update with cancelled status when cancelling", async () => {
    setResult({ data: [SUBS[0]], error: null });
    renderSubs();
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^cancel$/i })).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    await waitFor(() => {
      expect(builder.update).toHaveBeenCalledWith({ status: "cancelled" });
      expect(builder.eq).toHaveBeenCalledWith("id", "s1");
    });
  });

  it("shows an error state when loading fails", async () => {
    setResult({ data: null, error: new Error("boom") });
    renderSubs();
    await waitFor(() =>
      expect(screen.getByText(/could not load your subscriptions/i)).toBeInTheDocument(),
    );
  });

  it("opens the creator form with product, quantity and frequency fields", async () => {
    renderSubs();
    fireEvent.click(screen.getByRole("button", { name: /new subscription/i }));
    await waitFor(() =>
      expect(screen.getByLabelText(/^product$/i)).toBeInTheDocument(),
    );
    expect(screen.getByLabelText(/quantity/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^frequency$/i)).toBeInTheDocument();
  });
});
