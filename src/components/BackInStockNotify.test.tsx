import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { BackInStockNotify } from "@/components/BackInStockNotify";

vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "test-key",
  },
}));

vi.mock("@/lib/sentry", () => ({
  captureException: vi.fn(),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch as unknown as typeof global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockReset();
});

describe("BackInStockNotify", () => {
  it("renders email input and submit button", () => {
    render(<BackInStockNotify productId="atw-001" />);
    expect(screen.getByPlaceholderText(/your email/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notify me/i })).toBeInTheDocument();
  });

  it("shows success message on successful subscription", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true, subscribed: true }),
    });

    render(<BackInStockNotify productId="atw-001" />);
    const emailInput = screen.getByPlaceholderText(/your email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /notify me/i }));

    await waitFor(() => {
      expect(screen.getByText(/notified as soon/i)).toBeInTheDocument();
    });
  });

  it("shows error for invalid email", () => {
    render(<BackInStockNotify productId="atw-001" />);
    const emailInput = screen.getByPlaceholderText(/your email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "not-an-email" } });
    const form = screen.getByRole("button", { name: /notify me/i }).closest("form")!;
    fireEvent.submit(form);

    expect(screen.getByText(/valid email/i)).toBeInTheDocument();
  });

  it("shows error message on API failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Server error" }),
    });

    render(<BackInStockNotify productId="atw-001" />);
    const emailInput = screen.getByPlaceholderText(/your email/i) as HTMLInputElement;
    fireEvent.change(emailInput, { target: { value: "test@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /notify me/i }));

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });
});