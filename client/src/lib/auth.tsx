import { createContext, useContext, useCallback, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "./queryClient";
import type { User } from "@shared/schema";

type AuthUser = Omit<User, "password" | "verificationCode" | "verificationExpiry">;

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { fullName: string; email: string; password: string; companyName?: string }) => Promise<{ requiresVerification: boolean; email: string }>;
  verifyEmail: (email: string, code: string) => Promise<void>;
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

  const login = useCallback(async (email: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { email, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const register = useCallback(async (data: { fullName: string; email: string; password: string; companyName?: string }) => {
    const res = await apiRequest("POST", "/api/auth/register", data);
    const result = await res.json();
    return result;
  }, []);

  const verifyEmail = useCallback(async (email: string, code: string) => {
    await apiRequest("POST", "/api/auth/verify", { email, code });
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.setQueryData(["/api/auth/me"], null);
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  }, []);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, verifyEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
