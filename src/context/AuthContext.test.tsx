import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";

// Mock @supabase/supabase-js so we don't need real env vars
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  })),
}));

// Mock env so hasSupabaseConfig returns true
vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://test.supabase.co",
    supabaseAnonKey: "test-key",
  },
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn().mockResolvedValue({}),
    },
  },
}));

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function wrapper({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("AuthContext", () => {
  it("starts in loading state then resolves to no user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    // After mount, loading should settle to false with no user
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.hasConfig).toBe(true);
  });

  it("throws when useAuth is used outside AuthProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );
    spy.mockRestore();
  });

  it("signIn returns ok when supabase auth succeeds", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase!.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: null,
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { ok: boolean; error?: string } = { ok: false };
    await act(async () => {
      signInResult = await result.current.signIn("test@example.com", "password");
    });
    expect(signInResult.ok).toBe(true);
  });

  it("signIn returns error when supabase auth fails", async () => {
    const { supabase } = await import("@/lib/supabase");
    (supabase!.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: { message: "Invalid credentials" },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    let signInResult: { ok: boolean; error?: string } = { ok: false };
    await act(async () => {
      signInResult = await result.current.signIn("test@example.com", "wrong");
    });
    expect(signInResult.ok).toBe(false);
    expect(signInResult.error).toBe("Invalid credentials");
  });

  it("signOut clears the user", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.signOut();
    });
    expect(result.current.user).toBeNull();
  });
});