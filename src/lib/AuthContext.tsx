"use client";
import { createContext, useContext } from "react";
import { useAuth } from "@/hooks/useAuth";
import type { AppUser } from "@/types";

interface AuthCtx {
  user: AppUser | null;
  loading: boolean;
  maintenance: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isPlayer: boolean;
}

const AuthContext = createContext<AuthCtx>({ user: null, loading: true, maintenance: false, isAdmin: false, isStaff: false, isPlayer: false });

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuth();
  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuthContext = () => useContext(AuthContext);
