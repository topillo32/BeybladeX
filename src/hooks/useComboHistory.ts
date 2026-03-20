"use client";
import { useEffect, useState } from "react";
import { getComboHistoryByPlayer } from "@/lib/repositories/comboHistoryRepository";
import type { ComboHistory } from "@/types/combos";

export const useComboHistory = (playerId: string, tournamentId: string) => {
  const [history, setHistory] = useState<ComboHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId || !tournamentId) return;
    setLoading(true);
    getComboHistoryByPlayer(playerId, tournamentId)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [playerId, tournamentId]);

  return { history, loading };
};
