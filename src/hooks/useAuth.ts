"use client";
import { useEffect, useState } from "react";
import { onAuthChange, getUserData, logoutUser } from "@/services/authService";
import { doc, setDoc, serverTimestamp, onSnapshot } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { AppUser } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenance, setMaintenance] = useState(false);

  // Suscripción al modo mantenimiento en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "config", "app"), (snap) => {
      setMaintenance(snap.exists() ? !!snap.data().maintenanceMode : false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        let data = await getUserData(firebaseUser.uid);
        if (!data) {
          const recovered: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName ?? firebaseUser.email ?? "",
            role: "player",
            communityId: null,
            createdAt: null as any,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), {
            ...recovered,
            displayNameLower: recovered.displayName.toLowerCase(),
            createdAt: serverTimestamp(),
          });
          const { getPlayerByUserId, createPlayerDoc } = await import("@/services/playerService");
          const existingPlayer = await getPlayerByUserId(firebaseUser.uid);
          if (!existingPlayer && recovered.displayName) {
            await createPlayerDoc(firebaseUser.uid, recovered.displayName);
          }
          data = recovered;
        }
        setUser(data);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Si se activa mantenimiento y el usuario es player, cerrá sesión
  useEffect(() => {
    if (maintenance && user?.role === "player") {
      void logoutUser();
    }
  }, [maintenance, user?.role]);

  return {
    user,
    loading,
    maintenance,
    isAdmin: user?.role === "admin",
    isStaff: user?.role === "staff" || user?.role === "admin" || user?.role === "leader",
    isPlayer: user?.role === "player",
  };
};
