import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv, defaultEnv } = vi.hoisted(() => {
  const defaults = {
    analyticsEnabled: false,
    contactFormEndpoint: "",
    newsletterEndpoint: "",
    whatsappNumber: "",
    companyEmail: "hello@allthingswater.co.za",
    companyPhone: "",
    companyAddress: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
  };

  return {
    defaultEnv: defaults,
    mockEnv: { ...defaults },
  };
});

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { Footer } from "./Footer";

beforeEach(() => {
  Object.assign(mockEnv, defaultEnv);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Footer", () => {
  it("shows an unavailable message instead of false success when no endpoint is configured", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /subscribe to newsletter/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(
      /newsletter sign-up is currently unavailable/i,
    );
    expect(screen.queryByText(/thanks for subscribing/i)).not.toBeInTheDocument();
  });

  it("shows an error message when the configured endpoint request fails", async () => {
    mockEnv.newsletterEndpoint = "https://example.com/newsletter";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: /subscribe to newsletter/i }));

    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')).toHaveTextContent(
        /we couldn't subscribe you right now/i,
      );
    });
    expect(screen.queryByText(/thanks for subscribing/i)).not.toBeInTheDocument();
  });
});
