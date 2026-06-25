import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  hasSupabaseConfig,
  supabase,
} from "@/lib/supabase";

interface CustomerUser {
  id: string;
  email: string;
}

interface AuthContextValue {
  user: CustomerUser | null;
  loading: boolean;
  hasConfig: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const CUSTOMER_USER_KEY = "atw.customer-user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(!hasSupabaseConfig);

  // Hydrate from localStorage synchronously for instant nav rendering.
  useEffect(() => {
    if (!hasSupabaseConfig || !supabase) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const restore = async () => {
      const { data } = await supabase!.auth.getUser();
      if (cancelled) return;
      if (data.user) {
        const u = { id: data.user.id, email: data.user.email ?? "" };
        setUser(u);
        try { localStorage.setItem(CUSTOMER_USER_KEY, JSON.stringify(u)); } catch { /* ignore */ }
      } else {
        try { localStorage.removeItem(CUSTOMER_USER_KEY); } catch { /* ignore */ }
      }
      setLoading(false);
    };

    restore();

    const { data: sub } = supabase.auth.onAuthStateChange(() => restore());
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
      try { localStorage.removeItem(CUSTOMER_USER_KEY); } catch { /* ignore */ }
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

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}