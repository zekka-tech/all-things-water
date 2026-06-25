import { createContext } from "react";

export interface CustomerUser {
  id: string;
  email: string;
}

export interface AuthContextValue {
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

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
