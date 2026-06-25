import { useEffect, useState, type ReactNode } from "react";
import { hasSupabaseConfig, supabase } from "@/lib/supabase";
import {
  AuthContext,
  type AuthContextValue,
  type CustomerUser,
} from "./auth-context";

const CUSTOMER_USER_KEY = "atw.customer-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(!hasSupabaseConfig);

  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    const client = supabase;
    let cancelled = false;

    const restore = async () => {
      const { data } = await client.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        const nextUser = { id: data.user.id, email: data.user.email ?? "" };
        setUser(nextUser);
        try {
          localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(nextUser));
        } catch {
          /* ignore */
        }
      } else {
        try {
          localStorage.removeItem(CUSTOMER_USER_KEY);
        } catch {
          /* ignore */
        }
      }
      setLoading(false);
    };

    void restore();

    const { data: sub } = client.auth.onAuthStateChange(() => {
      void restore();
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    hasConfig: hasSupabaseConfig,

    async signIn(email, password) {
      if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: "Accounts are unavailable until site configuration is completed." };
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async signUp(email, password, name) {
      if (!hasSupabaseConfig || !supabase) {
        return { ok: false, error: "Accounts are unavailable until site configuration is completed." };
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } },
      });
      return error ? { ok: false, error: error.message } : { ok: true };
    },

    async signOut() {
      if (!supabase) return;
      await supabase.auth.signOut();
      setUser(null);
      try {
        localStorage.removeItem(CUSTOMER_USER_KEY);
      } catch {
        /* ignore */
      }
    },

    async refresh() {
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email ?? "" });
      }
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
