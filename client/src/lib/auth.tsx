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
  login: (email: string, password: string) => Promise<void>;
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
    // If user is verified, invalidate the query to fetch the new user.
    // Clear ALL caches first — any stale user-scoped data from a prior
    // session in this tab (e.g. /api/groups) would otherwise leak into
    // the new user's view because our default staleTime is Infinity.
    if (result.verified) {
      queryClient.clear();
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
    return result;
  }, []);

  const verifyMagicLink = useCallback(async (token: string) => {
    await apiRequest("POST", "/api/auth/verify-magic-link", { token });
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { email, password });
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    queryClient.setQueryData(["/api/auth/me"], null);
  }, []);

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
