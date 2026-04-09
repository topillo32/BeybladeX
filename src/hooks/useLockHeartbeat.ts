"use client";

import { useEffect } from "react";
import { renewLock, LOCK_RENEW_INTERVAL_MS } from "@/services/matchService";

/**
 * Renueva el bloqueo de partida mientras la UI está activa (modal abierto / panel de juez).
 * Los admins no necesitan lock; no se renueva.
 */
export function useLockHeartbeat(
  active: boolean,
  tournamentId: string | undefined,
  matchId: string | undefined,
  uid: string | undefined,
  isAdmin: boolean
) {
  useEffect(() => {
    if (!active || !tournamentId || !matchId || !uid || isAdmin) return;
    const tick = () => {
      void renewLock(tournamentId, matchId, uid);
    };
    tick();
    const id = setInterval(tick, LOCK_RENEW_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, tournamentId, matchId, uid, isAdmin]);
}
