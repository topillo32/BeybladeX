"use client";
import { useEffect, useState } from "react";
import { getPlayerCombos } from "@/lib/repositories/combosRepository";
import type { Combo } from "@/types/combos";

export const usePlayerCombos = (playerId: string, tournamentId: string) => {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = () => {
    if (!playerId || !tournamentId) return;
    setLoading(true);
    getPlayerCombos(playerId, tournamentId)
      .then(setCombos)
      .finally(() => setLoading(false));
  };

  useEffect(() => { refresh(); }, [playerId, tournamentId]);

  return { combos, loading, refresh };
};
