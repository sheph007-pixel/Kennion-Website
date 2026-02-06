import { createContext, useContext, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { User } from "@shared/schema";

type AuthUser = Pick<User, "id" | "fullName" | "email" | "role" | "companyName" | "verified" | "createdAt">;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  requestMagicLink: (data: { email: string; fullName?: string; companyName?: string }) => Promise<{ message: string; email?: string; needsSignup?: boolean }>;
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

  const verifyMagicLink = useCallback(async (token: string) => {
    await apiRequest("POST", "/api/auth/verify-magic-link", { token });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { email, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.setQueryData(["/api/auth/me"], null);
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, requestMagicLink, verifyMagicLink, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
