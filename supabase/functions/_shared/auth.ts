/**
 * Caller identity for Edge Functions.
 *
 * Never decode a JWT by hand to get a user id — anyone can mint an unsigned
 * token with any `sub`. Always ask Supabase Auth to verify it.
 */
import { createClient, type SupabaseClient, type User } from "jsr:@supabase/supabase-js@2";
import { bearerToken } from "./http.ts";

export function serviceClient(): SupabaseClient {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Supabase server configuration is incomplete");
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * The verified signed-in user, or null for guests / invalid tokens. The anon
 * key itself is a JWT without `sub`, so guest checkouts resolve to null.
 */
export async function getVerifiedUser(req: Request): Promise<User | null> {
  const token = bearerToken(req);
  if (!token) return null;

  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !anonKey) return null;
  if (token === anonKey) return null;

  try {
    const anon = createClient(url, anonKey, { auth: { persistSession: false } });
    const { data, error } = await anon.auth.getUser(token);
    if (error || !data.user) return null;
    return data.user;
  } catch {
    return null;
  }
}

export type AdminCheck =
  | { ok: true; user: User; admin: SupabaseClient; performedBy: string }
  | { ok: false; status: 401 | 403 | 500; message: string };

/** Verify the caller is signed in AND listed in public.admins. */
export async function requireAdmin(req: Request): Promise<AdminCheck> {
  const user = await getVerifiedUser(req);
  if (!user) return { ok: false, status: 401, message: "Unauthorized" };

  let admin: SupabaseClient;
  try {
    admin = serviceClient();
  } catch {
    return { ok: false, status: 500, message: "Server configuration is incomplete" };
  }

  const { data, error } = await admin
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return { ok: false, status: 500, message: "Internal server error" };
  if (!data) return { ok: false, status: 403, message: "Forbidden" };

  return { ok: true, user, admin, performedBy: user.email ?? user.id };
}
