import { supabase } from "@/lib/supabase";

/**
 * Admin authentication backed by Supabase Auth.
 *
 * The admin signs in with real credentials; Supabase issues a JWT that the
 * `admin-sync` Edge Function independently verifies against the server-side
 * `admins` allowlist. Nothing here is a security boundary on its own — the
 * server enforces authorization — but it gates the UI and supplies the token.
 */

export async function signInAdmin(
  email: string,
  password: string,
): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function signOutAdmin(): Promise<void> {
  await supabase.auth.signOut();
}

/** The current session's access token, or null when signed out. */
export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

/**
 * Whether the signed-in user is in the server-side `admins` allowlist. RLS
 * only exposes the user's own admin row, so a non-admin gets `null`.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return false;

  const { data, error } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  return !error && !!data;
}

/** Subscribe to sign-in/sign-out changes. Returns an unsubscribe function. */
export function onAdminAuthChange(callback: () => void): () => void {
  const { data } = supabase.auth.onAuthStateChange(() => callback());
  return () => data.subscription.unsubscribe();
}
