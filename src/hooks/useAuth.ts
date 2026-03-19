"use client";
import { useEffect, useState } from "react";
import { onAuthChange, getUserData } from "@/services/authService";
import type { AppUser } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        const data = await getUserData(firebaseUser.uid);
        setUser(data);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, loading, isAdmin: user?.role === "admin", isStaff: user?.role === "staff" || user?.role === "admin", isPlayer: user?.role === "player" };
};
