import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuth, mockFrom } = vi.hoisted(() => ({
  mockAuth: {
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    getSession: vi.fn(),
    getUser: vi.fn(),
    onAuthStateChange: vi.fn(),
  },
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseConfig: true,
  supabase: {
    auth: mockAuth,
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  signInAdmin,
  signOutAdmin,
  getAccessToken,
  isCurrentUserAdmin,
  onAdminAuthChange,
} from "./adminAuth";

// Build the chainable `from("admins").select().eq().maybeSingle()` mock.
function mockAdminLookup(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  mockFrom.mockReturnValue({
    select: () => ({ eq: () => ({ maybeSingle }) }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("signInAdmin", () => {
  it("returns ok when Supabase reports no error", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({ error: null });
    const result = await signInAdmin("admin@example.com", "pw");
    expect(result).toEqual({ ok: true });
    expect(mockAuth.signInWithPassword).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "pw",
    });
  });

  it("returns the error message on failure", async () => {
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Invalid login credentials" },
    });
    const result = await signInAdmin("admin@example.com", "wrong");
    expect(result).toEqual({ ok: false, error: "Invalid login credentials" });
  });
});

describe("signOutAdmin", () => {
  it("delegates to supabase.auth.signOut", async () => {
    mockAuth.signOut.mockResolvedValue({ error: null });
    await signOutAdmin();
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
  });
});

describe("getAccessToken", () => {
  it("returns the session access token", async () => {
    mockAuth.getSession.mockResolvedValue({
      data: { session: { access_token: "jwt-123" } },
    });
    expect(await getAccessToken()).toBe("jwt-123");
  });

  it("returns null when there is no session", async () => {
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
    expect(await getAccessToken()).toBeNull();
  });
});

describe("isCurrentUserAdmin", () => {
  it("returns false when no user is signed in", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null } });
    expect(await isCurrentUserAdmin()).toBe(false);
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("returns true when an admin row exists for the user", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockAdminLookup({ data: { user_id: "u1" }, error: null });
    expect(await isCurrentUserAdmin()).toBe(true);
  });

  it("returns false when the user has no admin row", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "u2" } } });
    mockAdminLookup({ data: null, error: null });
    expect(await isCurrentUserAdmin()).toBe(false);
  });

  it("returns false when the lookup errors", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: { id: "u3" } } });
    mockAdminLookup({ data: null, error: { message: "rls denied" } });
    expect(await isCurrentUserAdmin()).toBe(false);
  });
});

describe("onAdminAuthChange", () => {
  it("subscribes and returns an unsubscribe function", () => {
    const unsubscribe = vi.fn();
    let registered: (() => void) | undefined;
    mockAuth.onAuthStateChange.mockImplementation((cb: () => void) => {
      registered = cb;
      return { data: { subscription: { unsubscribe } } };
    });

    const callback = vi.fn();
    const off = onAdminAuthChange(callback);

    // The Supabase listener fires our callback.
    registered?.();
    expect(callback).toHaveBeenCalledOnce();

    off();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
