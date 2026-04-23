import { createContext, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { User } from "@shared/schema";

type AuthUser = Pick<User, "id" | "fullName" | "email" | "role" | "companyName" | "verified" | "createdAt">;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  requestMagicLink: (data: { email: string; fullName?: string; companyName?: string }) => Promise<{ message: string; email?: string; needsSignup?: boolean }>;
  register: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    companyName: string;
    state: string;
    zipCode: string;
    accessCode: string;
  }) => Promise<{ message: string; email: string; verified?: boolean }>;
  verifyMagicLink: (token: string) => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/auth/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    },
    staleTime: 60000,
    retry: false,
  });

  const requestMagicLink = useCallback(async (data: { email: string; fullName?: string; companyName?: string }) => {
    const res = await apiRequest("POST", "/api/auth/magic-link", data);
    return await res.json();
  }, []);

  const register = useCallback(async (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone: string;
    companyName: string;
    state: string;
    zipCode: string;
    accessCode: string;
  }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    // If verified, immediately seed the auth cache with whatever the
    // server returned. Clearing + invalidating first would leave a
    // window where `user` is null — the login/register page then sees
    // isLoading=false, user=null and could redirect unexpectedly.
    if (result.verified) {
      queryClient.clear();
      await primeAuthMe();
    }
    return result;
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    await apiRequest("POST", "/api/auth/verify-magic-link", { token });
    queryClient.clear();
    await primeAuthMe();
  }, []);

  // Returns the user from the login response so callers can navigate
  // by role without waiting on a second /api/auth/me round-trip that
  // races the AuthProvider's own refetch.
  const login = useCallback(async (email: string, password: string) => {
    const res = await apiRequest("POST", "/api/auth/login", { email, password });
    const user = (await res.json()) as AuthUser;
    // Wipe stale user-scoped caches from any prior session in this tab
    // (e.g. /api/groups with the previous user's rows) before seeding
    // the new user so DashboardPage doesn't render with the old data
    // while auth is still resolving.
    queryClient.clear();
    queryClient.setQueryData(["/api/auth/me"], user);
    return user;
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    queryClient.setQueryData(["/api/auth/me"], null);
  }, []);

  // Fetch /api/auth/me and write the result directly into the cache.
  // Used by register/magic-link transitions where the server sets the
  // session but doesn't return the user object in the same response.
  async function primeAuthMe() {
    try {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const user = res.ok ? ((await res.json()) as AuthUser) : null;
      queryClient.setQueryData(["/api/auth/me"], user);
    } catch {
      queryClient.setQueryData(["/api/auth/me"], null);
    }
  }

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, requestMagicLink, register, verifyMagicLink, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
