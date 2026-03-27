"use client";
import { useEffect, useState } from "react";
import { onAuthChange, getUserData } from "@/services/authService";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/services/firebase";
import type { AppUser } from "@/types";

export const useAuth = () => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthChange(async (firebaseUser) => {
      if (firebaseUser) {
        let data = await getUserData(firebaseUser.uid);
        // Recovery: auth exists but Firestore user doc missing (failed registration)
        if (!data) {
          const recovered: AppUser = {
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? "",
            displayName: firebaseUser.displayName ?? firebaseUser.email ?? "",
            role: "player",
            createdAt: null as any,
          };
          await setDoc(doc(db, "users", firebaseUser.uid), {
            ...recovered,
            displayNameLower: recovered.displayName.toLowerCase(),
            createdAt: serverTimestamp(),
          });
          // Also recover player doc if missing
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

  return { user, loading, isAdmin: user?.role === "admin", isStaff: user?.role === "staff" || user?.role === "admin", isPlayer: user?.role === "player" };
};
