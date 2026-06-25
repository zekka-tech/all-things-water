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

import { Contact } from "./Contact";

beforeEach(() => {
  Object.assign(mockEnv, defaultEnv);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("Contact", () => {
  it("shows an unavailable message instead of false success when no endpoint is configured", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Need help with a dispenser." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(document.querySelector('[role="alert"]')).toHaveTextContent(
      /contact form is currently unavailable/i,
    );
    expect(screen.queryByText(/message sent!/i)).not.toBeInTheDocument();
  });

  it("shows an error message when the configured endpoint request fails", async () => {
    mockEnv.contactFormEndpoint = "https://example.com/contact";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 503 }),
    );

    render(
      <MemoryRouter>
        <Contact />
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: "Jane Doe" },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: "jane@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/message/i), {
      target: { value: "Need help with a dispenser." },
    });
    fireEvent.click(screen.getByRole("button", { name: /send message/i }));

    await waitFor(() => {
      expect(document.querySelector('[role="alert"]')).toHaveTextContent(
        /we couldn't send your message right now/i,
      );
    });
    expect(screen.queryByText(/message sent!/i)).not.toBeInTheDocument();
  });
});
