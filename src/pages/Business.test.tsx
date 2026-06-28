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
  return { defaultEnv: defaults, mockEnv: { ...defaults } };
});

vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { Business } from "./Business";

function fillRequired() {
  fireEvent.change(screen.getByLabelText(/company name/i), {
    target: { value: "Acme Ltd" },
  });
  fireEvent.change(screen.getByLabelText(/your name/i), {
    target: { value: "Jane Doe" },
  });
  fireEvent.change(screen.getByLabelText(/^email$/i), {
    target: { value: "jane@acme.co.za" },
  });
}

beforeEach(() => {
  Object.assign(mockEnv, defaultEnv);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Business", () => {
  it("validates required fields before submitting", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <MemoryRouter>
        <Business />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(screen.getByText(/please enter your company name/i)).toBeInTheDocument();
  });

  it("shows an unavailable message when Supabase is not configured", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <MemoryRouter>
        <Business />
      </MemoryRouter>,
    );

    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(
      /temporarily unavailable/i,
    );
  });

  it("submits and shows confirmation on success", async () => {
    mockEnv.supabaseUrl = "https://proj.supabase.co";
    mockEnv.supabaseAnonKey = "anon-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ ok: true }),
      }),
    );

    render(
      <MemoryRouter>
        <Business />
      </MemoryRouter>,
    );

    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    await waitFor(() => {
      expect(screen.getByText(/request received!/i)).toBeInTheDocument();
    });
  });

  it("shows an error banner when the request fails", async () => {
    mockEnv.supabaseUrl = "https://proj.supabase.co";
    mockEnv.supabaseAnonKey = "anon-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }),
    );

    render(
      <MemoryRouter>
        <Business />
      </MemoryRouter>,
    );

    fillRequired();
    fireEvent.click(screen.getByRole("button", { name: /request a quote/i }));

    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')).toHaveTextContent(
        /couldn't submit your request/i,
      );
    });
  });
});
