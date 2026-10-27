import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { api, getStoredToken, setStoredToken } from "../api";
import type { User, AuthResponse, UserRole } from "../types";

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  isAuthModalOpen: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

export function useAuthProvider(): AuthContextType {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api<{ user: User | null }>("GET", "/api/auth/me");
      setUser(res.user);
    } catch {
      setUser(null);
      setStoredToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<AuthResponse>("POST", "/api/auth/login", { email, password });
    if (res.token) {
      setStoredToken(res.token);
    }
    setUser(res.user);
    setIsAuthModalOpen(false);
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, role: UserRole = "landlord") => {
    const res = await api<AuthResponse>("POST", "/api/auth/register", {
      email,
      password,
      full_name: fullName,
      role,
    });
    if (res.token) {
      setStoredToken(res.token);
    }
    setUser(res.user);
    setIsAuthModalOpen(false);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api<{ ok: boolean }>("POST", "/api/auth/logout");
    } catch {
      // Ignore network error on logout
    }
    setStoredToken(null);
    setUser(null);
  }, []);

  return {
    user,
    loading,
    login,
    register,
    logout,
    isAuthModalOpen,
    openAuthModal: () => setIsAuthModalOpen(true),
    closeAuthModal: () => setIsAuthModalOpen(false),
  };
}
